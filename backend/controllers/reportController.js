// controllers/reportController.js
import Report from '../models/Report.js';
import Client from '../models/Client.js';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { detectTextByUrl } from '../services/visionApi.js';
import { translateText } from '../services/deeplApi.js';
import { getPresignedUrl } from '../services/s3utils.js';

// S3 Konfiguration
// const bucketName = process.env.S3_BUCKET_NAME;
// const awsRegion = process.env.AWS_REGION;

// const s3 = new S3Client({
   // region: awsRegion,
//});
// Hilfsfunktion: Prüft, ob der angemeldete User den Klienten bearbeiten darf
const checkClientAccess = async (userId, clientId) => {
    const client = await Client.findById(clientId);
    // Klient nicht gefunden ODER Klient ist nicht dem User zugewiesen
    if (!client || client.assignedSpecialist?.toString() !== userId.toString()) {
        return false;
    }
    return true;
};

// US5: Neuen Textbericht erstellen
export const createReport = async (req, res) => {
    const { clientId, reportText, type, isDocument } = req.body;
    const authorId = req.user._id.toString(); // Vom JWT aus der 'protect' Middleware

    console.log("DEBUG: Author ID (Fachkraft):", authorId);
    console.log("DEBUG: Client ID (Übergeben):", clientId);
    console.log("DEBUG: Report Text Länge:", reportText ? reportText.length : 0);

    try {
        // 1. Zuweisung prüfen (WICHTIGE SICHERHEITSPRÜFUNG)
        if (!(await checkClientAccess(authorId, clientId))) {
            return res.status(403).json({ msg: 'Keine Berechtigung für diesen Klienten.' });
        }

        // 2. Bericht erstellen
        const newReport = await Report.create({
            client: clientId,
            createdBy: authorId,
            content: reportText.substring(0, 100),
            reportText: reportText,
            type: 'REPORT',
            isDocument: false,
            // isLocked bleibt 'false' bis zur Freigabe durch die Verwaltung
        });

        res.status(201).json(newReport);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Fehler beim Speichern des Berichts.');
    }
};
// 💡 NEUE FUNKTION: Echter S3 Upload
const uploadFileToCloud = async (file) => {
    const bucketName = process.env.S3_BUCKET_NAME;
    const awsRegion = process.env.AWS_REGION;

    if (!bucketName) {
        throw new Error('S3_BUCKET_NAME ist nicht in den Umgebungsvariablen gesetzt.');
    }
    
    const s3 = new S3Client({ region: awsRegion });
    
    // Erstellt einen lesbaren Stream aus der temporär gespeicherten Datei
    const fileStream = fs.createReadStream(file.path);
// 1. Dekodiere den originalen Dateinamen, um doppelte Kodierung zu vermeiden.
    // Falls der Name bereits vom Frontend kodiert wurde (%20), wird er hier bereinigt.
    const decodedOriginalName = decodeURIComponent(file.originalname);
    
    // 2. Erstelle einen sicheren Namen (ersetze problematische Zeichen)
    // Wir ersetzen problematische Zeichen, lassen aber die Klammern für encodeURIComponent später zu.
    const safeBaseName = decodedOriginalName.replace(/[^a-zA-Z0-9\s.\-()_]/g, ''); 
    
    const uniqueKeyBase = `${Date.now()}-${safeBaseName}`; 
    const uniqueKey = `reports/${uniqueKeyBase}`;

    const uploadParams = {
        Bucket: bucketName,
        Key: uniqueKey, // Pfad und Dateiname im Bucket
        Body: fileStream,
        ContentType: file.mimetype,
        ACL: 'private', // Setzt die Datei als öffentlich lesbar (WICHTIG für direkten Link)
    };

    try {
        // Führt den Upload zu S3 aus
        await s3.send(new PutObjectCommand(uploadParams));

        // Konstruiere die öffentliche URL (Dies funktioniert nur, wenn ACL auf 'public-read' gesetzt ist!)
        // const encodedKey = encodeURIComponent(uniqueKey);
        
        // const s3Url = `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${uniqueKey}`;
        
        return {
            filename: uniqueKey,
            //url: s3Url, // ⬅️ WICHTIG: Dies ist jetzt eine HTTPS URL
            url: null
        };
    } catch (error) {
        console.error("S3 Upload Error:", error);
        throw new Error("Fehler beim Hochladen zu S3.");
    }
};
// US4: Datei hochladen (Komplex: erfordert Multer und Cloud-Speicher)
export const uploadDocument = async (req, res) => {

    const { clientId, content, isDocument } = req.body;
    const authorId = req.user._id.toString(); // Konsistenz: ID als String verwenden

    // Multer speichert die Datei temporär in req.file
    if (!req.file) {
        return res.status(400).json({ msg: 'Keine Datei zum Hochladen gefunden.' });
    }

    const tempFilePath = req.file.path; // Pfad zur temporären Datei

    try {
        // 1. Zuweisung prüfen (WICHTIGE SICHERHEITSPRÜFUNG)
        if (!(await checkClientAccess(authorId, clientId))) {
            fs.unlinkSync(tempFilePath); 
            return res.status(403).json({ msg: 'Keine Berechtigung für diesen Klienten.' });
        }

        // 2. Datei in den Cloud-Speicher hochladen (S3, etc.)
        const storageResult = await uploadFileToCloud(req.file); 
        
        // 4. Temporäre Datei vom Server löschen (sehr wichtig!)
        fs.unlinkSync(tempFilePath); 

        // --- 💡 NEUE OCR-LOGIK (Nach Cloud-Upload) ---
        let reportTextContent = content; // Behalte den Content, falls er vom Frontend gesendet wurde

        // Nur OCR ausführen, wenn es sich um ein Dokument/Bild handelt und die Datei hochgeladen wurde
        if (isDocument === 'true' && storageResult.filename) {
            const ocrSourceUrl = await getPresignedUrl(storageResult.filename);

            console.log(`Starte OCR für Dokument: Temporäre Url generiert.`);

            console.log(`[DEBUG 1] Pre-Signed OCR URL: ${ocrSourceUrl.substring(0, 150)}...`);
            console.log(`[DEBUG OCR] Signierte URL zur Prüfung: ${ocrSourceUrl}`);
            
            // RUFEN DIE GOOGLE VISION API MIT DER CLOUD URL AUF
            const extractedText = await detectTextByUrl(ocrSourceUrl);

            if (extractedText) {
                // Überschreibe den möglicherweise kurzen Content mit dem vollen Text
                reportTextContent = extractedText; 
            } else {
                console.log('Warnung: OCR konnte keinen Text extrahieren.');
            }
        }
        // ------------------------------------------

        // 3. Metadaten in MongoDB speichern
        const newDocument = await Report.create({
            client: clientId,
            createdBy: authorId,
            type: 'DOCUMENT',
            
            // Speichere den vollen extrahierten Text
            reportText: reportTextContent, 
            
            // Speichere die ersten 100 Zeichen als Kurzansicht
            content: reportTextContent ? reportTextContent.substring(0, 100) : 'Dokument gescannt',
            
            isDocument: isDocument === 'true',
            fileMetadata: {
                fileName: storageResult.filename, 
                // Nutzen Sie den MimeType aus Multer, falls verfügbar, ansonsten den hier definierten
                fileType: req.file.mimetype, 
                storagePath: storageResult.url ? storageResult.url : `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${storageResult.filename}`, // URL zum Abruf (Cloud-Link)
                originalName: req.file.originalname,
                size: req.file.size,
            },
        });


        res.status(201).json(newDocument);
    } catch (err) {
        console.error("Report Upload Error:", err); 
        
        // Temporäre Datei bei Fehler löschen
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        
        // Saubere Fehlerantwort mit Rückgabe
        return res.status(500).json({ 
            msg: `Serverfehler beim Hochladen oder Verarbeiten der Datei. Details: ${err.message}` 
        });
    }
};

export const downloadDocumentController = async (req, res) => {
    // Die Berichts-ID kommt aus den URL-Parametern
    const { reportId } = req.params; 
    const authorId = req.user._id;

    try {
        // 1. Bericht (Dokument) anhand der ID finden
        const report = await Report.findById(reportId).populate('client', 'assignedTo');
        
        if (!report) {
            return res.status(404).json({ msg: 'Dokument nicht gefunden.' });
        }

        // 2. Sicherheitsprüfung: Ist es überhaupt ein Dokument?
        if (report.type !== 'DOCUMENT' || !report.fileMetadata || !report.fileMetadata.storagePath) {
             return res.status(400).json({ msg: 'Dieser Bericht ist kein gültiges Dokument.' });
        }
        
        // 3. Sicherheitsprüfung: Zugriff auf den zugehörigen Klienten prüfen
        const clientId = report.client._id;
        if (!(await checkClientAccess(authorId, clientId))) {
             return res.status(403).json({ msg: 'Keine Berechtigung, dieses Dokument einzusehen.' });
        }
        
        // 4. Speicherpfad (URL) senden
        // HINWEIS: Hier senden wir die URL direkt zurück. In einer Produktionsumgebung 
        // müssten Sie hier einen temporär signierten Link (z.B. für S3 oder GCS) senden.
        res.status(200).json({ 
            downloadUrl: report.fileMetadata.storagePath,
            fileName: report.fileMetadata.fileName
        });

    } catch (err) {
        console.error("Fehler beim Abrufen des Dokumentenpfades:", err.message);
        res.status(500).json({ msg: 'Serverfehler beim Laden der Dokumenteninformation.' });
    }
};
/**
 * US6: Ruft alle Berichte für einen bestimmten Klienten ab.
 * Route: GET /api/reports/:clientId
 */
export const getClientReports = async (req, res) => {
    const clientId = req.params.clientId; // Die ID des Klienten aus der URL
    const userId = req.user._id;
    const userRole = req.user.role;

    try {
        // SICHERHEITSPRÜFUNG: Nur Verwaltung ODER zugewiesene Fachkraft darf sehen
        if (userRole === 'fachkraft' && !(await checkClientAccess(userId, clientId))) {
            return res.status(403).json({ msg: 'Sie sind nicht berechtigt, diese Berichte einzusehen.' });
        }
        
        // Finde alle Berichte für den Klienten, sortiere nach Datum und beziehe den Ersteller mit ein
        const reports = await Report.find({ client: clientId }) 
            .populate('createdBy', 'username') // Zeigt den Benutzernamen des Erstellers
            .populate('client', 'targetLanguage')
            .sort({ createdAt: -1 }); // Neueste Berichte zuerst

        res.json(reports);

    } catch (error) {
        console.error('Fehler beim Abrufen der Berichte:', error.message);
        res.status(500).json({ msg: 'Serverfehler beim Laden der Berichte.' });
    }
};

// ... (bestehende Controller, z.B. getClientReports)

/**
 * US7: Bericht bearbeiten.
 * Route: PUT /api/reports/:reportId
 */
export const updateReport = async (req, res) => {
    const { reportId } = req.params;
    const { reportText } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    try {
        const report = await Report.findById(reportId);

        if (!report) {
            return res.status(404).json({ msg: 'Bericht nicht gefunden.' });
        }

        // 1. Zuweisung prüfen: Nur der Ersteller oder Admin darf bearbeiten
        const isCreator = report.createdBy.toString() === userId.toString();
        const isAdmin = userRole === 'admin';

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ msg: 'Sie sind nicht berechtigt, diesen Bericht zu bearbeiten.' });
        }

        // 2. Sperrstatus prüfen: Nur ungesperrte Berichte dürfen bearbeitet werden
        if (report.isLocked) {
            return res.status(403).json({ msg: 'Dieser Bericht ist gesperrt und kann nicht bearbeitet werden.' });
        }

        // 3. Update durchführen
        report.reportText = reportText;
        report.content = reportText.substring(0, 100); // Update der Kurzzusammenfassung
        report.updatedAt = Date.now(); // Optional: Festhalten, wann der Bericht zuletzt geändert wurde

        await report.save();

        res.json(report);

    } catch (err) {
        console.error('Fehler beim Bearbeiten des Berichts:', err.message);
        res.status(500).json({ msg: 'Serverfehler beim Bearbeiten des Berichts.' });
    }
};

/**
 * US8: Bericht löschen.
 * Route: DELETE /api/reports/:reportId
 */
export const deleteReport = async (req, res) => {
    const { reportId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    try {
        const report = await Report.findById(reportId);

        if (!report) {
            // Auch wenn nicht gefunden, senden wir 204 No Content, um es idempotent zu machen.
            return res.status(204).send(); 
        }
        
        // 1. Zuweisung prüfen: Nur der Ersteller oder Admin darf löschen
        const isCreator = report.createdBy.toString() === userId.toString();
        const isAdmin = userRole === 'admin';

        if (!isCreator && !isAdmin) {
            return res.status(403).json({ msg: 'Sie sind nicht berechtigt, diesen Bericht zu löschen.' });
        }
        
        // 2. Sperrstatus prüfen: Nur ungesperrte Berichte dürfen gelöscht werden
        if (report.isLocked) {
             return res.status(403).json({ msg: 'Dieser Bericht ist gesperrt und kann nicht gelöscht werden.' });
        }

        // HINWEIS: Bei DOKUMENTEN müsste hier die Datei auch aus S3 gelöscht werden!
        if (report.type === 'DOCUMENT') {
            // TODO: Fügen Sie hier später die Logik zum Löschen des Objekts aus S3 hinzu
            console.warn(`[WARN] Dokument gelöscht, S3-Objekt muss noch entfernt werden: ${report.fileMetadata.storagePath}`);
        }

        await Report.deleteOne({ _id: reportId });

        res.status(204).send(); // Erfolgreich gelöscht (No Content)

    } catch (err) {
        console.error('Fehler beim Löschen des Berichts:', err.message);
        res.status(500).json({ msg: 'Serverfehler beim Löschen des Berichts.' });
    }
};

// US9: Bericht übersetzen
export const getTranslatedReport = async (req, res) => {
    const { reportId } = req.params;
    
    try {
        const report = await Report.findById(reportId).populate('client', 'targetLanguage');

        if (!report) {
            return res.status(404).json({ msg: 'Bericht nicht gefunden.' });
        }
        
        const textToTranslate = report.reportText;
        const targetLanguage = report.client?.targetLanguage || 'EN-US'; // Fallback Sprache

        if (!textToTranslate) {
            return res.status(400).json({ msg: 'Kein Text im Bericht zur Übersetzung vorhanden.' });
        }
        
        // 💡 DeepL Aufruf
        const translatedText = await translateText(textToTranslate, targetLanguage);
        
        if (!translatedText) {
             return res.status(500).json({ msg: 'Übersetzung fehlgeschlagen.' });
        }

        res.status(200).json({
            originalText: textToTranslate,
            translatedText: translatedText,
            targetLanguage: targetLanguage,
        });

    } catch (err) {
        console.error("Übersetzungsfehler:", err.message);
        res.status(500).send('Serverfehler bei der Übersetzung.');
    }
};