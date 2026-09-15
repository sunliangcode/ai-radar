package com.airadar.provider.translate;

/**
 * Heuristics for when a news title should be sent to en→zh translation.
 */
public final class TitleLocale {

    private TitleLocale() {
    }

    /**
     * True when the title looks non-Chinese (fewer than two CJK characters)
     * and is worth translating to zh.
     */
    public static boolean needsEnToZh(String title) {
        if (title == null || title.isBlank()) {
            return false;
        }
        int cjk = 0;
        for (int i = 0; i < title.length(); ) {
            int cp = title.codePointAt(i);
            if (isCjk(cp)) {
                cjk++;
                if (cjk >= 2) {
                    return false;
                }
            }
            i += Character.charCount(cp);
        }
        return true;
    }

    private static boolean isCjk(int cp) {
        return (cp >= 0x3400 && cp <= 0x4DBF)
                || (cp >= 0x4E00 && cp <= 0x9FFF)
                || (cp >= 0xF900 && cp <= 0xFAFF);
    }
}
