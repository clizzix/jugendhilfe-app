import * as deepl from 'deepl';

// API Key aus der .env-Datei (oder Umgebung) holen
// Stellen Sie sicher, dass DEEPL_API_KEY in Ihrer .env gesetzt ist
const authKey = process.env.DEEPL_API_KEY; 

/**
 * Übersetzt den gegebenen Text in die Zielsprache.
 * @param {string} text Der zu übersetzende Text.
 * @param {string} targetLang Die Zielsprache (z.B. 'EN-US', 'ES', 'FR').
 * @returns {Promise<string|null>} Die Übersetzung.
 */
export const translateText = async (text, targetLang) => {
    if (!text || !authKey || !targetLang) return null;

    try {
        const result = await deepl.translate({
            authKey: authKey,
            text: text,
            targetLang: targetLang,
            sourceLang: 'DE', // Annahme: Berichte werden in Deutsch verfasst
            // formality: 'less' // Optional
        });

        // Die DeepL-Bibliothek gibt ein Array mit einem Objekt zurück
        return result.translations[0].text;

    } catch (error) {
        console.error(`FEHLER bei DeepL Übersetzung nach ${targetLang}:`, error.message);
        return null;
    }
};