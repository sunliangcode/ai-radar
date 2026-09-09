package com.airadar.config;

import com.airadar.domain.SourceType;
import com.airadar.persistence.SourceEntity;
import com.airadar.persistence.SourceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class SourceSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SourceSeeder.class);

    private final SourceRepository sourceRepository;
    private final ObjectMapper objectMapper;

    public SourceSeeder(SourceRepository sourceRepository, ObjectMapper objectMapper) {
        this.sourceRepository = sourceRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (sourceRepository.count() > 0) {
            return;
        }
        log.info("Seeding default sources");
        sourceRepository.save(source("OpenAI Blog RSS", SourceType.RSS, Map.of(
                "feedUrl", "https://openai.com/blog/rss.xml"
        ), true));
        sourceRepository.save(source("Hugging Face Blog RSS", SourceType.RSS, Map.of(
                "feedUrl", "https://huggingface.co/blog/feed.xml"
        ), true));
        sourceRepository.save(source("Simon Willison Weblog", SourceType.RSS, Map.of(
                "feedUrl", "https://simonwillison.net/atom/everything/"
        ), true));
        sourceRepository.save(source("量子位 WeChat", SourceType.RSS, Map.of(
                "feedUrl", "https://wechat2rss.xlab.app/feed/7131b577c61365cb47e81000738c10d872685908.xml"
        ), true));
        sourceRepository.save(source("新智元 WeChat", SourceType.RSS, Map.of(
                "feedUrl", "https://wechat2rss.xlab.app/feed/ede30346413ea70dbef5d485ea5cbb95cca446e7.xml"
        ), true));
        sourceRepository.save(source("36氪", SourceType.RSS, Map.of(
                "feedUrl", "https://36kr.com/feed"
        ), true));
        sourceRepository.save(source("HN AI stories", SourceType.HACKER_NEWS, Map.of(
                "query", "AI OR LLM OR GPT OR \"machine learning\"",
                "tags", "story",
                "hitsPerPage", 40
        ), true));
        Map<String, Object> reddit = new LinkedHashMap<>();
        reddit.put("subreddits", List.of("MachineLearning", "LocalLLaMA", "artificial"));
        reddit.put("sort", "new");
        reddit.put("limit", 25);
        sourceRepository.save(source("Reddit AI", SourceType.REDDIT, reddit, true));
        sourceRepository.save(source("GitHub AI repos", SourceType.GITHUB, Map.of(
                "query", "LLM OR agents OR \"large language model\" in:name,description,topics",
                "sort", "updated",
                "perPage", 30
        ), true));
        sourceRepository.save(source("Google News AI", SourceType.GOOGLE_NEWS, Map.of(
                "query", "artificial intelligence OR LLM",
                "hl", "en",
                "gl", "US",
                "maxResults", 30
        ), true));
        sourceRepository.save(source("GDELT AI news", SourceType.GDELT, Map.of(
                "query", "\"artificial intelligence\" OR LLM",
                "timespan", "48h",
                "maxRecords", 40
        ), true));
        sourceRepository.save(source("OSS Insight AI repos", SourceType.OSS_INSIGHT, Map.of(
                "period", "past_24_hours",
                "languages", List.of("All"),
                "keywords", List.of("AI", "LLM", "agent"),
                "maxItems", 25
        ), true));
        sourceRepository.save(source("GitHub Trending daily", SourceType.GITHUB_TRENDING, Map.of(
                "since", "daily"
        ), true));
        sourceRepository.save(source("V2EX create/share", SourceType.V2EX, Map.of(
                "nodes", List.of("create", "share", "programmer"),
                "limit", 20
        ), true));
        sourceRepository.save(source("Product Hunt ranking", SourceType.PRODUCT_HUNT, Map.of(
                "maxItems", 20
        ), false));
        sourceRepository.save(source("Twitter AI researchers", SourceType.TWITTER, Map.of(
                "users", List.of("karpathy", "sama", "ylecun"),
                "fetchLimit", 40
        ), false));
        sourceRepository.save(source("Telegram AI sample", SourceType.TELEGRAM, Map.of(
                "channels", List.of("zaihuapd"),
                "fetchLimit", 20
        ), false));
    }

    private SourceEntity source(String name, SourceType type, Map<String, Object> config, boolean enabled) throws Exception {
        SourceEntity entity = new SourceEntity();
        entity.setName(name);
        entity.setType(type);
        entity.setEnabled(enabled);
        entity.setConfigJson(objectMapper.writeValueAsString(config));
        return entity;
    }
}
