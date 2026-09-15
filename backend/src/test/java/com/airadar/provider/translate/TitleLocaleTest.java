package com.airadar.provider.translate;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TitleLocaleTest {

    @Test
    void englishTitleNeedsTranslation() {
        assertTrue(TitleLocale.needsEnToZh("Open source LLM agent toolkit"));
        assertTrue(TitleLocale.needsEnToZh("GPT-5 released with new APIs"));
    }

    @Test
    void chineseTitleSkipped() {
        assertFalse(TitleLocale.needsEnToZh("开源 LLM Agent 工具包发布"));
        assertFalse(TitleLocale.needsEnToZh("深度解读：推理基建"));
    }

    @Test
    void blankSkipped() {
        assertFalse(TitleLocale.needsEnToZh(null));
        assertFalse(TitleLocale.needsEnToZh("   "));
        assertFalse(TitleLocale.needsEnToZh(""));
    }

    @Test
    void singleCjkStillNeedsTranslation() {
        // Fewer than two CJK glyphs → still treat as needing en→zh
        assertTrue(TitleLocale.needsEnToZh("AI 周 digest"));
    }
}