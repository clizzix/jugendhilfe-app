// controllers/translationController.js
import fs from 'fs';
import pdfkit from 'pdfkit';
// import { translateText, performOCR } from '../utils/kiService.js'; // Mock-Funktionen
import Report from '../models/Report.js';
import { translateText } from '../services/deeplApi.js';
import { detectTextByUrl } from '../services/visionApi.js';

// Ziel-Sprachcodes (basierend auf Ihrer Anforderung)
const TARGET_LANGUAGES = ['EN-US', 'TR', 'AR', 'FA', 'RU', 'SO']; // Türkisch, Arabisch, Persisch, Russisch, Somalisch (Codes anpassen!)

// Funktion zur Durchführung des Übersetzungsprozesses
export const startTranslation = async (req, res) => {
    const { reportId, targetLang } = req.body;
    const userId = req.user._id ? req.user._id.toString() : req.user.id.toString(); // Prüfen, wer die Anfrage stellt

    if (!TARGET_LANGUAGES.includes(targetLang)) {
        return res.status(400).json({ msg: 'Ungültige Zielsprache.' });
    }

    try {
        const report = await Report.findById(reportId).populate('client', 'targetLanguage');
        if (!report) {
            return res.status(404).json({ msg: 'Bericht nicht gefunden.' });
        }
        
        // SICHERHEITSPRÜFUNG: Darf der Benutzer den Bericht übersetzen?
        const isCreator = report.createdBy?.toString() === userId.toString();
        const isAdminOrVerwaltung = req.user.role === 'admin' || req.user.role === 'verwaltung';
        // SICHERHEITSPRÜFUNG: Nur zugewiesene Fachkraft/Verwaltung darf übersetzen
        if (!isCreator && !isAdminOrVerwaltung) {
             return res.status(403).json({ msg: 'Keine Berechtigung zur Übersetzung dieses Berichts.' });
        }

        let originalText = '';
        
        // 1. TEXT-EXTRAKTION (OCR für Dokumente, Text für Berichte)
        if (report.type === 'DOCUMENT' && report.fileMetadata?.storagePath) {
        // 💡 ÄNDERUNG: Nutzen Sie den bereits extrahierten reportText, falls vorhanden (Optimierung)
            if (report.reportText && report.reportText.length > 100 && report.reportText.substring(0, 10) !== 'Dokument') {
                 originalText = report.reportText;
            } else {
                // 💡 FALLBACK/OCR: Führen Sie OCR erneut aus, falls kein Text vorhanden ist (oder extrahieren Sie ihn von der Cloud-URL)
                const fileUrl = report.fileMetadata.storagePath; 
                originalText = await detectTextByUrl(fileUrl);
            }

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