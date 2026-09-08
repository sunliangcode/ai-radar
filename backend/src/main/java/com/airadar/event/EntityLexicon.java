package com.airadar.event;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class EntityLexicon {

    private static final List<String> ENTITIES = List.of(
            "openai", "gpt", "chatgpt", "anthropic", "claude", "google", "gemini", "deepmind",
            "meta", "llama", "mistral", "deepseek", "qwen", "alibaba", "bytedance", "doubao",
            "xai", "grok", "nvidia", "huggingface", "hugging face", "microsoft", "copilot",
            "aws", "bedrock", "azure", "ollama", "vllm", "langchain", "llamaindex", "cursor",
            "perplexity", "cohere", "stability", "midjourney", "sora", "agent", "rag", "mcp"
    );

    private static final Pattern TOKEN = Pattern.compile("[\\p{IsAlphabetic}\\p{IsDigit}]+");

    private EntityLexicon() {
    }

    public static Set<String> extract(String text) {
        Set<String> found = new LinkedHashSet<>();
        if (text == null || text.isBlank()) {
            return found;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        for (String entity : ENTITIES) {
            if (lower.contains(entity)) {
                found.add(entity);
            }
        }
        return found;
    }

    public static Set<String> tokens(String text) {
        Set<String> tokens = new LinkedHashSet<>();
        if (text == null || text.isBlank()) {
            return tokens;
        }
        var matcher = TOKEN.matcher(text.toLowerCase(Locale.ROOT));
        while (matcher.find()) {
            String t = matcher.group();
            if (t.length() >= 3) {
                tokens.add(t);
            }
        }
        return tokens;
    }

    public static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) {
            return 0;
        }
        Set<String> inter = new LinkedHashSet<>(a);
        inter.retainAll(b);
        Set<String> union = new LinkedHashSet<>(a);
        union.addAll(b);
        return union.isEmpty() ? 0 : (double) inter.size() / union.size();
    }

    public static List<String> knownEntities() {
        return new ArrayList<>(ENTITIES);
    }
}
