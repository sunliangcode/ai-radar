package com.airadar.provider.translate;

/**
 * Offline/local title translation (e.g. Argos Translate sidecar).
 * Failures must not block summarization — callers should keep the original title.
 */
public interface TitleTranslator {

    /**
     * @return translated text, or null/blank if translation is unavailable
     */
    String translate(String text, String fromLang, String toLang);
}
