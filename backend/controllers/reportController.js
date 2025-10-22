// controllers/reportController.js
import Report from '../models/Report.js';
import Client from '../models/Client.js';
import fs from 'fs';
import path from 'path';
// import { uploadFileToCloud } from '../utils/cloudStorage.js'; // Wird später erstellt

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
    const { clientId, reportText } = req.body;
    const authorId = req.user._id; // Vom JWT aus der 'protect' Middleware

    try {
        // 1. Zuweisung prüfen (WICHTIGE SICHERHEITSPRÜFUNG)
        if (!(await checkClientAccess(authorId, clientId))) {
            return res.status(403).json({ msg: 'Keine Berechtigung für diesen Klienten.' });
        }

        // 2. Bericht erstellen
        const newReport = await Report.create({
            client: clientId,
            createdBy: authorId,
            content: reportText,
            reportText: reportText,
            type: 'REPORT',
            // isLocked bleibt 'false' bis zur Freigabe durch die Verwaltung
        });

        res.status(201).json(newReport);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Fehler beim Speichern des Berichts.');
    }
};
// --- MOCK-Funktion für Tests ---
// Simuliert das Hochladen in die Cloud und gibt Metadaten zurück.
// In einer echten App würde HIER die AWS/Google/Azure-Logik stehen.
const uploadFileToCloud = async (file) => {
    console.log(`[MOCK] Starte Upload von: ${file.originalname}`);
    // Simuliere Dateispeicherung/Umbenennung
    const uniqueFileName = `${Date.now()}-${file.originalname}`;
    
    // Simuliere die Speicherung in einem öffentlichen/geschützten URL-Pfad
    const mockStorageUrl = `/storage/documents/${uniqueFileName}`; 
    
    // HINWEIS: Hier muss die Logik zur Verschiebung der Datei an den Cloud-Speicher
    // (und zur Fehlerbehandlung) implementiert werden.
    
    return {
        filename: uniqueFileName,
        url: mockStorageUrl,
    };
};

// US4: Datei hochladen (Komplex: erfordert Multer und Cloud-Speicher)
export const uploadDocument = async (req, res) => {
    const { clientId } = req.body;
    const authorId = req.user._id;

    console.log("--- DEBUG UPLOAD ---");
    console.log("req.file (Multer Result):", req.file); // Sollte die Datei-Metadaten enthalten
    console.log("req.body (FormData Body):", req.body); // Sollte { clientId: '...' } enthalten
    console.log("--------------------");

    // Multer speichert die Datei temporär in req.file
    if (!req.file) {
        return res.status(400).json({ msg: 'Keine Datei zum Hochladen gefunden.' });
    }

    const tempFilePath = req.file.path;

    try {
        // 1. Zuweisung prüfen (WICHTIGE SICHERHEITSPRÜFUNG)
        if (!(await checkClientAccess(authorId, clientId))) {
            // Wenn der Zugriff verweigert wird, die temporäre Datei löschen (optional, aber empfohlen)
            fs.unlinkSync(tempFilePath); 
            return res.status(403).json({ msg: 'Keine Berechtigung für diesen Klienten.' });
        }

        // 2. Datei in den Cloud-Speicher hochladen (z.B. S3, Google Cloud Storage)
        // HINWEIS: Hier muss Ihre tatsächliche Cloud-Logik integriert werden
        const storageResult = await uploadFileToCloud(req.file); // Mock-Funktion!

        // 3. Metadaten in MongoDB speichern
        const newDocument = await Report.create({
            client: clientId,
            createdBy: authorId,
            type: 'DOCUMENT',
            fileMetadata: {
                fileName: storageResult.filename, 
                fileType: req.file.mimetype.includes('.pdf') ? 'PDF' : 'DOCX',
                storagePath: storageResult.url, // URL zum Abruf
                originalName: req.file.originalname,
                size: req.file.size,
            },
        });

        // 4. Temporäre Datei vom Server löschen (sehr wichtig!)
        fs.unlinkSync(req.file.path); 

        res.status(201).json(newDocument);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Fehler beim Dateiupload:', err.message);
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        res.status(500).json({ msg: 'Serverfehler beim Hochladen der Datei.'});
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
            .sort({ createdAt: -1 }); // Neueste Berichte zuerst

        res.json(reports);

    } catch (error) {
        console.error('Fehler beim Abrufen der Berichte:', error.message);
        res.status(500).json({ msg: 'Serverfehler beim Laden der Berichte.' });
    }
};