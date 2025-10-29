import { ImageAnnotatorClient } from '@google-cloud/vision';
    
const client = new ImageAnnotatorClient();

/**
 * Führt die Texterkennung (OCR) auf einer öffentlichen URL in der Cloud aus.
 * Google Vision liest die Datei direkt aus dem Cloud-Speicher.
 * WICHTIG: Die URL muss für Google Vision zugänglich sein.
 * * @param {string} url Die öffentliche URL des Dokuments/Bildes.
 * @returns {Promise<string|null>} Der extrahierte Text oder null bei Fehler.
 */
export const detectTextByUrl = async (url) => {
    // 💡 Die Request-Struktur für URLs ist anders als für lokale Dateien
    console.log(`[DEBUG 2] Vision API empfängt URL: ${url.substring(0, 150)}...`);
    const request = {
        image: {
            source: {
                imageUri: url,
            },
        },
        features: [{ type: 'TEXT_DETECTION' }], // Nur Texterkennung
    };
    
    try {
        const [result] = await client.annotateImage(request);
        const detections = result.textAnnotations;
        
        if (detections && detections.length > 0) {
            // Das erste Element (Index 0) enthält den gesamten erkannten Text
            return detections[0].description; 
        }
        return null;
    } catch (error) {
        console.error('FEHLER bei Google Vision OCR (URL):', error);
        return null; 
    }
}; 