// utils/kiService.js
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs/promises';
import dotenv from 'dotenv';
// import { TesseractWorker } from 'tesseract.js'; // Beispiel für lokale OCR

dotenv.config();

// MOCK: Integration DeepL (muss für echte Nutzung angepasst werden)
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';


export const translateText = async (text, targetLang) => {
    try {
        const response = await fetch(DEEPL_URL, {
            method: 'POST',
            headers: {
                // Wichtig: JWT_SECRET ist NICHT der DeepL Schlüssel. Wir nutzen DEEPL_API_KEY.
                'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text],
                target_lang: targetLang.toUpperCase(), // DeepL erwartet Großbuchstaben (z.B. "AR")
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`DeepL API Fehler (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        
        // Die Antwort enthält ein Array von Übersetzungen
        return data.translations[0].text; 

    } catch (error) {
        console.error('DeepL Fehler:', error.message);
        throw new Error("Fehler bei der Übersetzung: Konnte DeepL API nicht erreichen."); 
    }
};

// MOCK: Funktion zur Durchführung von OCR auf einer Datei
export const performOCR = async (filePath) => {
    // Hier die tatsächliche Logik für die OCR-API (z.B. Google Vision)
    console.log(`Führe OCR für Datei durch: ${filePath}`);
    return "MOCK OCR Ergebnis: Der Text wurde erfolgreich aus dem gescannten Dokument extrahiert.";
};