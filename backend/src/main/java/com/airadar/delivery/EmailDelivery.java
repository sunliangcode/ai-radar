package com.airadar.delivery;

import com.airadar.config.RadarProperties;
import com.airadar.settings.SettingsService;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Component
public class EmailDelivery implements DeliveryChannel {

    private static final Logger log = LoggerFactory.getLogger(EmailDelivery.class);

    private final SettingsService settingsService;
    private final RadarProperties properties;

    public EmailDelivery(SettingsService settingsService, RadarProperties properties) {
        this.settingsService = settingsService;
        this.properties = properties;
    }

    @Override
    public String channel() {
        return "email";
    }

    @Override
    public boolean isEnabled() {
        var s = settingsService.effective();
        return notBlank(s.smtpHost()) && notBlank(s.smtpTo());
    }

    @Override
    public DeliveryResult deliver(BriefPayload payload) {
        long started = System.currentTimeMillis();
        if (!isEnabled()) {
            return DeliveryResult.skipped(channel(), "not_configured");
        }
        var s = settingsService.effective();
        try {
            JavaMailSender sender = buildSender(s, properties.getDelivery().getSmtp().getPassword());
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            String from = notBlank(s.smtpFrom()) ? s.smtpFrom()
                    : (notBlank(s.smtpUsername()) ? s.smtpUsername() : "ai-radar@localhost");
            helper.setFrom(from);
            helper.setTo(s.smtpTo().split("\\s*,\\s*"));
            helper.setSubject(payload.date() + " AI Radar 日报");
            helper.setText(buildPlain(payload), buildHtml(payload));
            sender.send(message);
            long ms = System.currentTimeMillis() - started;
            log.info("delivery channel=email success=true items={} to={} durationMs={}",
                    payload.items().size(), s.smtpTo(), ms);
            return DeliveryResult.ok(channel(), payload.items().size(), ms);
        } catch (Exception e) {
            long ms = System.currentTimeMillis() - started;
            log.error("delivery channel=email success=false host={} to={} error={}",
                    s.smtpHost(), s.smtpTo(), e.getMessage());
            return DeliveryResult.fail(channel(), payload.items().size(), ms, e.getMessage());
        }
    }

    JavaMailSender buildSender(SettingsService.EffectiveSettings s, String password) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(s.smtpHost());
        sender.setPort(s.smtpPort() != null ? s.smtpPort() : 587);
        if (notBlank(s.smtpUsername())) {
            sender.setUsername(s.smtpUsername());
        }
        if (notBlank(password)) {
            sender.setPassword(password);
        }
        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", notBlank(s.smtpUsername()) ? "true" : "false");
        boolean starttls = s.smtpStarttls() == null || s.smtpStarttls();
        props.put("mail.smtp.starttls.enable", String.valueOf(starttls));
        return sender;
    }

    String buildPlain(BriefPayload payload) {
        StringBuilder sb = new StringBuilder();
        sb.append("AI Radar 日报 ").append(payload.date()).append("\n\n");
        if (payload.events() != null && !payload.events().isEmpty()) {
            for (BriefPayload.BriefEvent event : payload.events()) {
                sb.append("[").append((int) Math.round(event.score())).append("] ")
                        .append(event.title()).append(" (").append(event.status()).append(")\n")
                        .append(event.summary() == null ? "" : event.summary()).append("\n")
                        .append(event.watchNext() == null ? "" : "关注：" + event.watchNext()).append("\n\n");
            }
        } else {
            for (BriefPayload.BriefItem item : payload.items()) {
                sb.append("[").append((int) Math.round(item.score())).append("] ")
                        .append(item.title()).append("\n")
                        .append(item.summary() == null ? "" : item.summary()).append("\n")
                        .append(item.url()).append("\n\n");
            }
        }
        if (payload.uiUrl() != null) {
            sb.append("打开 UI: ").append(payload.uiUrl()).append("/briefs/").append(payload.date());
        }
        return sb.toString();
    }

    String buildHtml(BriefPayload payload) {
        StringBuilder sb = new StringBuilder();
        sb.append("<html><body style=\"font-family:system-ui,sans-serif;line-height:1.5\">");
        sb.append("<h1>AI Radar 日报 · ").append(payload.date()).append("</h1>");
        if (payload.events() != null && !payload.events().isEmpty()) {
            sb.append("<h2>事件</h2><ol>");
            for (BriefPayload.BriefEvent event : payload.events()) {
                sb.append("<li style=\"margin-bottom:1em\">");
                sb.append("<strong>[").append((int) Math.round(event.score())).append("]</strong> ");
                sb.append(esc(event.title()));
                if (event.summary() != null) {
                    sb.append("<div style=\"color:#444\">").append(esc(event.summary())).append("</div>");
                }
                if (event.impact() != null) {
                    sb.append("<div><em>影响：</em>").append(esc(event.impact())).append("</div>");
                }
                if (event.watchNext() != null) {
                    sb.append("<div><em>关注：</em>").append(esc(event.watchNext())).append("</div>");
                }
                if (event.evidence() != null) {
                    for (BriefPayload.BriefItem ev : event.evidence()) {
                        sb.append("<div>· <a href=\"").append(esc(ev.url())).append("\">")
                                .append(esc(ev.title())).append("</a></div>");
                    }
                }
                sb.append("</li>");
            }
            sb.append("</ol>");
        } else {
            sb.append("<ol>");
            for (BriefPayload.BriefItem item : payload.items()) {
                sb.append("<li style=\"margin-bottom:1em\">");
                sb.append("<strong>[").append((int) Math.round(item.score())).append("]</strong> ");
                sb.append("<a href=\"").append(esc(item.url())).append("\">").append(esc(item.title())).append("</a>");
                if (item.summary() != null && !item.summary().isBlank()) {
                    sb.append("<div style=\"color:#444\">").append(esc(item.summary())).append("</div>");
                }
                sb.append("</li>");
            }
            sb.append("</ol>");
        }
        if (payload.uiUrl() != null) {
            sb.append("<p><a href=\"").append(esc(payload.uiUrl())).append("/briefs/")
                    .append(payload.date()).append("\">在 AI Radar 中查看</a></p>");
        }
        sb.append("</body></html>");
        return sb.toString();
    }

    private static String esc(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
