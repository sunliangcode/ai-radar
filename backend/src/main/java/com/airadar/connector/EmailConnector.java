package com.airadar.connector;

import com.airadar.config.RadarProperties;
import com.airadar.domain.FetchContext;
import com.airadar.domain.RawItem;
import com.airadar.domain.SourceType;
import com.airadar.provider.ai.AiService;
import com.airadar.provider.ai.ExtractedItem;
import jakarta.mail.Flags;
import jakarta.mail.Folder;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.Store;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.search.FlagTerm;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

@Component
public class EmailConnector implements SourceConnector {

    private static final Logger log = LoggerFactory.getLogger(EmailConnector.class);

    private final RadarProperties properties;
    private final AiService aiService;

    public EmailConnector(RadarProperties properties, AiService aiService) {
        this.properties = properties;
        this.aiService = aiService;
    }

    @Override
    public SourceType type() {
        return SourceType.EMAIL;
    }

    @Override
    public ConnectorDescriptor descriptor() {
        return ConnectorDescriptor.of("EMAIL", "Email inbox (IMAP)", List.of(
                ConnectorDescriptor.ConfigField.text("extractionPrompt", "Extraction prompt", false),
                ConnectorDescriptor.ConfigField.text("maxMessages", "Max unread messages", false)
        ));
    }

    @Override
    public List<RawItem> fetch(FetchContext ctx) {
        RadarProperties.EmailIngest email = properties.getEmail();
        if (!email.isEnabled() || email.getHost() == null || email.getHost().isBlank()
                || email.getUsername() == null || email.getUsername().isBlank()) {
            log.warn("Email: IMAP not configured; skipping source {}", ctx.source().name());
            return List.of();
        }
        String prompt = ConnectorConfigs.string(ctx, "extractionPrompt",
                "Extract distinct news stories from this newsletter as items with title, url, and short content.");
        int maxMessages = ConnectorConfigs.integer(ctx, "maxMessages", email.getMaxMessages());

        Properties props = new Properties();
        props.put("mail.store.protocol", email.getProtocol());
        props.put("mail." + email.getProtocol() + ".host", email.getHost());
        props.put("mail." + email.getProtocol() + ".port", String.valueOf(email.getPort()));

        List<RawItem> items = new ArrayList<>();
        try {
            Session session = Session.getInstance(props);
            try (Store store = session.getStore(email.getProtocol())) {
                store.connect(email.getHost(), email.getPort(), email.getUsername(), email.getPassword());
                try (Folder folder = store.getFolder(email.getFolder())) {
                    folder.open(Folder.READ_WRITE);
                    Message[] messages = folder.search(new FlagTerm(new Flags(Flags.Flag.SEEN), false));
                    int start = Math.max(0, messages.length - maxMessages);
                    for (int i = start; i < messages.length; i++) {
                        Message message = messages[i];
                        items.addAll(extractFromMessage(message, ctx, prompt));
                        message.setFlag(Flags.Flag.SEEN, true);
                    }
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Email IMAP fetch failed: " + e.getMessage(), e);
        }
        log.debug("Email extracted {} items for {}", items.size(), ctx.source().name());
        return items;
    }

    List<RawItem> extractFromMessage(Message message, FetchContext ctx, String prompt) throws Exception {
        String subject = message.getSubject() == null ? "(no subject)" : message.getSubject();
        Instant published = message.getSentDate() == null ? Instant.now() : message.getSentDate().toInstant();
        if (published.isBefore(ctx.since())) {
            return List.of();
        }
        String from = "";
        if (message.getFrom() != null && message.getFrom().length > 0) {
            from = InternetAddress.toString(message.getFrom());
        }
        Object content = message.getContent();
        String body = content == null ? "" : content.toString();
        if (body.length() > 80_000) {
            body = body.substring(0, 80_000);
        }
        String combined = "Subject: " + subject + "\nFrom: " + from + "\n\n" + body;
        List<ExtractedItem> extracted = aiService.extractItems(combined, prompt);
        List<RawItem> items = new ArrayList<>();
        if (extracted == null || extracted.isEmpty()) {
            Map<String, Object> meta = new HashMap<>();
            meta.put("from", from);
            meta.put("subject", subject);
            items.add(new RawItem(
                    subject,
                    "mailto:" + (from.isBlank() ? "unknown" : from) + "?subject=" + subject.hashCode(),
                    published,
                    SourceType.EMAIL,
                    String.valueOf(ctx.source().id()),
                    body.length() > 500 ? body.substring(0, 500) : body,
                    meta
            ));
            return items;
        }
        for (ExtractedItem item : extracted) {
            if (item.title() == null || item.title().isBlank()) {
                continue;
            }
            String url = item.url();
            if (url == null || url.isBlank() || !url.startsWith("http")) {
                url = "mailto:newsletter#" + Math.abs((subject + item.title()).hashCode());
            }
            Map<String, Object> meta = new HashMap<>();
            meta.put("from", from);
            meta.put("subject", subject);
            items.add(new RawItem(
                    item.title().trim(),
                    url,
                    published,
                    SourceType.EMAIL,
                    String.valueOf(ctx.source().id()),
                    item.content() == null ? "" : item.content(),
                    meta
            ));
        }
        return items;
    }
}
