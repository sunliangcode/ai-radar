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
        )));
        sourceRepository.save(source("Hugging Face Blog RSS", SourceType.RSS, Map.of(
                "feedUrl", "https://huggingface.co/blog/feed.xml"
        )));
        sourceRepository.save(source("HN AI stories", SourceType.HACKER_NEWS, Map.of(
                "query", "AI OR LLM OR GPT OR \"machine learning\"",
                "tags", "story",
                "hitsPerPage", 40
        )));
        Map<String, Object> reddit = new LinkedHashMap<>();
        reddit.put("subreddits", List.of("MachineLearning", "LocalLLaMA", "artificial"));
        reddit.put("sort", "new");
        reddit.put("limit", 25);
        sourceRepository.save(source("Reddit AI", SourceType.REDDIT, reddit));
        sourceRepository.save(source("GitHub AI repos", SourceType.GITHUB, Map.of(
                "query", "LLM OR agents OR \"large language model\" in:name,description,topics",
                "sort", "updated",
                "perPage", 30
        )));
    }

    private SourceEntity source(String name, SourceType type, Map<String, Object> config) throws Exception {
        SourceEntity entity = new SourceEntity();
        entity.setName(name);
        entity.setType(type);
        entity.setEnabled(true);
        entity.setConfigJson(objectMapper.writeValueAsString(config));
        return entity;
    }
}
