// controllers/translationController.js
import fs from 'fs';
import pdfkit from 'pdfkit';
import { translateText, performOCR } from '../utils/kiService.js'; // Mock-Funktionen
import Report from '../models/Report.js';

// Ziel-Sprachcodes (basierend auf Ihrer Anforderung)
const TARGET_LANGUAGES = ['tr', 'ar', 'fa', 'ru', 'so']; // Türkisch, Arabisch, Persisch, Russisch, Somalisch (Codes anpassen!)

// Funktion zur Durchführung des Übersetzungsprozesses
export const startTranslation = async (req, res) => {
    const { reportId, targetLang } = req.body;
    const userId = req.user.id; // Prüfen, wer die Anfrage stellt

    if (!TARGET_LANGUAGES.includes(targetLang)) {
        return res.status(400).json({ msg: 'Ungültige Zielsprache.' });
    }

    try {
        const report = await Report.findById(reportId);
        if (!report) {
            return res.status(404).json({ msg: 'Bericht nicht gefunden.' });
        }
        
        // SICHERHEITSPRÜFUNG: Nur zugewiesene Fachkraft/Verwaltung darf übersetzen
        if (report.authorId.toString() !== userId.toString() && req.user.role !== 'verwaltung') {
             return res.status(403).json({ msg: 'Keine Berechtigung zur Übersetzung dieses Berichts.' });
        }

        let originalText = '';
        
        // 1. TEXT-EXTRAKTION (OCR für Dokumente, Text für Berichte)
        if (report.type === 'DOCUMENT' && report.fileMetadata?.storagePath) {
            // Dies ist der komplexeste Teil: Datei von Cloud-Speicher abrufen, OCR durchführen
            // Angenommen, wir laden die Datei temporär herunter und senden sie an den OCR-Dienst
            // const filePath = downloadFile(report.fileMetadata.storagePath); // Mock
            // originalText = await performOCR(filePath); 
            
            // FÜR DAS MVP: Hier sollte die Logik für OCR implementiert werden.
            // Zur Vereinfachung gehen wir davon aus, dass wir den Text extrahieren können.
            originalText = 'MOCK: Extracted text from PDF/Scan...'; 

        } else if (report.type === 'REPORT' && report.reportText) {
            originalText = report.reportText;
        } else {
            return res.status(400).json({ msg: 'Bericht enthält keinen extrahierbaren Text.' });
        }
        
        // 2. ÜBERSETZUNG (DeepL/KI)
        const translatedText = await translateText(originalText, targetLang);
        
        // 3. NEUE PDF ERSTELLEN UND EXPORTIEREN
        const pdfPath = await generateTranslationPDF(report, originalText, translatedText, targetLang);

        res.json({ 
            msg: `Übersetzung nach ${targetLang} erfolgreich`, 
            downloadUrl: `/api/reports/download/${pdfPath}` // Ein separater Endpunkt
        });

    } catch (err) {
        console.error("Übersetzungsfehler:", err.message);
        res.status(500).send('Fehler bei der KI-Verarbeitung.');
    }
};

// Hilfsfunktion: Erstellt das finale, mehrsprachige PDF
const generateTranslationPDF = (report, originalText, translatedText, langCode) => {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit();
        const pdfFileName = `${report.clientId}-${report._id}-${langCode}.pdf`;
        const tempFilePath = `temp/${pdfFileName}`; 

        // Sicherstellen, dass der Temp-Ordner existiert (optional)
        if (!fs.existsSync('temp')) fs.mkdirSync('temp');

        const stream = fs.createWriteStream(tempFilePath);
        doc.pipe(stream);

        doc.fontSize(16).text('Übersetzung des Jugendhilfe-Berichts', { align: 'center' });
        doc.moveDown();
        
        // Original-Text
        doc.fontSize(12).text('Original (Deutsch):', { underline: true });
        doc.fontSize(10).text(originalText);
        doc.moveDown();

        // Übersetzter Text (Achtung: Arabisch/Persisch erfordert spezielle Schriftarten für RTL!)
        doc.fontSize(12).text(`Übersetzung (${langCode.toUpperCase()}):`, { underline: true });
        doc.fontSize(10).text(translatedText); 

        doc.end();

        stream.on('finish', () => resolve(pdfFileName));
        stream.on('error', reject);
    });
};