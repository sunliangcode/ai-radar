package com.airadar.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "radar")
public class RadarProperties {

    private int scoreThreshold = 60;
    private int maxItems = 30;
    private int lookbackHours = 48;
    private int dedupLookbackDays = 14;
    private String interestProfile = "开源模型、Agent、推理基建";
    private String summaryLanguage = "zh";
    private String briefsDir = "./data/briefs";
    private int maxSnippetChars = 2000;
    private int aiBatchSize = 8;
    private int fetchParallelism = 8;
    private long fetchIntervalMs = 7_200_000L;
    private String pushCron = "0 0 8 * * *";
    private String timezone = "Asia/Shanghai";
    private String uiBaseUrl = "http://localhost:8080";
    private boolean pushOnlyWhenItems = true;
    private String localToken = "";
    private final OpenAi openai = new OpenAi();
    private final Github github = new Github();
    private final ProductHunt producthunt = new ProductHunt();
    private final Twitter twitter = new Twitter();
    private final EmailIngest email = new EmailIngest();
    private final WebFetch webFetch = new WebFetch();
    private String rsshubBase = "https://rsshub.umzzz.com";
    private final Delivery delivery = new Delivery();

    public int getScoreThreshold() {
        return scoreThreshold;
    }

    public void setScoreThreshold(int scoreThreshold) {
        this.scoreThreshold = scoreThreshold;
    }

    public int getMaxItems() {
        return maxItems;
    }

    public void setMaxItems(int maxItems) {
        this.maxItems = maxItems;
    }

    public int getLookbackHours() {
        return lookbackHours;
    }

    public void setLookbackHours(int lookbackHours) {
        this.lookbackHours = lookbackHours;
    }

    public int getDedupLookbackDays() {
        return dedupLookbackDays;
    }

    public void setDedupLookbackDays(int dedupLookbackDays) {
        this.dedupLookbackDays = dedupLookbackDays;
    }

    public String getInterestProfile() {
        return interestProfile;
    }

    public void setInterestProfile(String interestProfile) {
        this.interestProfile = interestProfile;
    }

    public String getSummaryLanguage() {
        return summaryLanguage;
    }

    public void setSummaryLanguage(String summaryLanguage) {
        this.summaryLanguage = summaryLanguage;
    }

    public String getBriefsDir() {
        return briefsDir;
    }

    public void setBriefsDir(String briefsDir) {
        this.briefsDir = briefsDir;
    }

    public int getMaxSnippetChars() {
        return maxSnippetChars;
    }

    public void setMaxSnippetChars(int maxSnippetChars) {
        this.maxSnippetChars = maxSnippetChars;
    }

    public int getAiBatchSize() {
        return aiBatchSize;
    }

    public void setAiBatchSize(int aiBatchSize) {
        this.aiBatchSize = aiBatchSize;
    }

    public int getFetchParallelism() {
        return fetchParallelism;
    }

    public void setFetchParallelism(int fetchParallelism) {
        this.fetchParallelism = fetchParallelism;
    }

    public long getFetchIntervalMs() {
        return fetchIntervalMs;
    }

    public void setFetchIntervalMs(long fetchIntervalMs) {
        this.fetchIntervalMs = fetchIntervalMs;
    }

    public String getPushCron() {
        return pushCron;
    }

    public void setPushCron(String pushCron) {
        this.pushCron = pushCron;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getUiBaseUrl() {
        return uiBaseUrl;
    }

    public void setUiBaseUrl(String uiBaseUrl) {
        this.uiBaseUrl = uiBaseUrl;
    }

    public boolean isPushOnlyWhenItems() {
        return pushOnlyWhenItems;
    }

    public void setPushOnlyWhenItems(boolean pushOnlyWhenItems) {
        this.pushOnlyWhenItems = pushOnlyWhenItems;
    }

    public String getLocalToken() {
        return localToken;
    }

    public void setLocalToken(String localToken) {
        this.localToken = localToken;
    }

    public OpenAi getOpenai() {
        return openai;
    }

    public Github getGithub() {
        return github;
    }

    public ProductHunt getProducthunt() {
        return producthunt;
    }

    public Twitter getTwitter() {
        return twitter;
    }

    public EmailIngest getEmail() {
        return email;
    }

    public WebFetch getWebFetch() {
        return webFetch;
    }

    public String getRsshubBase() {
        return rsshubBase;
    }

    public void setRsshubBase(String rsshubBase) {
        this.rsshubBase = rsshubBase;
    }

    public Delivery getDelivery() {
        return delivery;
    }

    public static class OpenAi {
        private String apiKey = "";
        private String baseUrl = "https://api.openai.com/v1";
        private String model = "gpt-4o-mini";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }
    }

    public static class Github {
        private String token = "";

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }
    }

    public static class ProductHunt {
        private String token = "";

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }
    }

    public static class Twitter {
        private String apifyToken = "";
        private String actorId = "altimis~scweet";

        public String getApifyToken() {
            return apifyToken;
        }

        public void setApifyToken(String apifyToken) {
            this.apifyToken = apifyToken;
        }

        public String getActorId() {
            return actorId;
        }

        public void setActorId(String actorId) {
            this.actorId = actorId;
        }
    }

    public static class EmailIngest {
        private boolean enabled = false;
        private String host = "";
        private int port = 993;
        private String username = "";
        private String password = "";
        private String protocol = "imaps";
        private String folder = "INBOX";
        private int maxMessages = 20;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getHost() {
            return host;
        }

        public void setHost(String host) {
            this.host = host;
        }

        public int getPort() {
            return port;
        }

        public void setPort(int port) {
            this.port = port;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getProtocol() {
            return protocol;
        }

        public void setProtocol(String protocol) {
            this.protocol = protocol;
        }

        public String getFolder() {
            return folder;
        }

        public void setFolder(String folder) {
            this.folder = folder;
        }

        public int getMaxMessages() {
            return maxMessages;
        }

        public void setMaxMessages(int maxMessages) {
            this.maxMessages = maxMessages;
        }
    }

    public static class WebFetch {
        private boolean enabled = false;
        private int timeoutMs = 15000;
        private int maxChars = 12000;
        private int parallelism = 4;
        private String userAgent = "ai-radar/0.1 (+https://github.com/sunliangcode/ai-radar)";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getTimeoutMs() {
            return timeoutMs;
        }

        public void setTimeoutMs(int timeoutMs) {
            this.timeoutMs = timeoutMs;
        }

        public int getMaxChars() {
            return maxChars;
        }

        public void setMaxChars(int maxChars) {
            this.maxChars = maxChars;
        }

        public int getParallelism() {
            return parallelism;
        }

        public void setParallelism(int parallelism) {
            this.parallelism = parallelism;
        }

        public String getUserAgent() {
            return userAgent;
        }

        public void setUserAgent(String userAgent) {
            this.userAgent = userAgent;
        }
    }

    public static class Delivery {
        private String feishuWebhookUrl = "";
        private String webhookUrl = "";
        private String webhookHeaders = "";
        private boolean outboxEnabled = true;
        private final Smtp smtp = new Smtp();

        public String getFeishuWebhookUrl() {
            return feishuWebhookUrl;
        }

        public void setFeishuWebhookUrl(String feishuWebhookUrl) {
            this.feishuWebhookUrl = feishuWebhookUrl;
        }

        public String getWebhookUrl() {
            return webhookUrl;
        }

        public void setWebhookUrl(String webhookUrl) {
            this.webhookUrl = webhookUrl;
        }

        public String getWebhookHeaders() {
            return webhookHeaders;
        }

        public void setWebhookHeaders(String webhookHeaders) {
            this.webhookHeaders = webhookHeaders;
        }

        public boolean isOutboxEnabled() {
            return outboxEnabled;
        }

        public void setOutboxEnabled(boolean outboxEnabled) {
            this.outboxEnabled = outboxEnabled;
        }

        public Smtp getSmtp() {
            return smtp;
        }
    }

    public static class Smtp {
        private String host = "";
        private int port = 587;
        private String username = "";
        private String password = "";
        private String from = "";
        private String to = "";
        private boolean starttls = true;

        public String getHost() {
            return host;
        }

        public void setHost(String host) {
            this.host = host;
        }

        public int getPort() {
            return port;
        }

        public void setPort(int port) {
            this.port = port;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }

        public String getTo() {
            return to;
        }

        public void setTo(String to) {
            this.to = to;
        }

        public boolean isStarttls() {
            return starttls;
        }

        public void setStarttls(boolean starttls) {
            this.starttls = starttls;
        }
    }
}
