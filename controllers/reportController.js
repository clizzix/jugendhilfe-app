// controllers/reportController.js
import Report from '../models/Report.js';
import Client from '../models/Client.js';
import { uploadFileToCloud } from '../utils/cloudStorage.js'; // Wird später erstellt

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
    const authorId = req.user.id; // Vom JWT aus der 'protect' Middleware

    try {
        // 1. Zuweisung prüfen (WICHTIGE SICHERHEITSPRÜFUNG)
        if (!(await checkClientAccess(authorId, clientId))) {
            return res.status(403).json({ msg: 'Keine Berechtigung für diesen Klienten.' });
        }

        // 2. Bericht erstellen
        const newReport = await Report.create({
            clientId,
            authorId,
            reportText,
            type: 'REPORT',
            // isLocked bleibt 'false' bis zur Freigabe durch die Verwaltung
        });

        res.status(201).json(newReport);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Fehler beim Speichern des Berichts.');
    }
};

// US4: Datei hochladen (Komplex: erfordert Multer und Cloud-Speicher)
export const uploadDocument = async (req, res) => {
    const { clientId } = req.body;
    const authorId = req.user.id;

    // Multer speichert die Datei temporär in req.file
    if (!req.file) {
        return res.status(400).json({ msg: 'Keine Datei zum Hochladen gefunden.' });
    }

    try {
        // 1. Zuweisung prüfen (WICHTIGE SICHERHEITSPRÜFUNG)
        if (!(await checkClientAccess(authorId, clientId))) {
            // Wenn der Zugriff verweigert wird, die temporäre Datei löschen (optional, aber empfohlen)
            // fs.unlinkSync(req.file.path); 
            return res.status(403).json({ msg: 'Keine Berechtigung für diesen Klienten.' });
        }

        // 2. Datei in den Cloud-Speicher hochladen (z.B. S3, Google Cloud Storage)
        // HINWEIS: Hier muss Ihre tatsächliche Cloud-Logik integriert werden
        const storageResult = await uploadFileToCloud(req.file); // Mock-Funktion!

        // 3. Metadaten in MongoDB speichern
        const newDocument = await Report.create({
            clientId,
            authorId,
            type: 'DOCUMENT',
            fileMetadata: {
                fileName: storageResult.filename, // z.B. UUID des gespeicherten Files
                fileType: req.file.originalname.endsWith('.pdf') ? 'PDF' : 'DOCX',
                storagePath: storageResult.url, // URL zum Abruf
                originalName: req.file.originalname,
                size: req.file.size,
            },
        });

        // 4. Temporäre Datei vom Server löschen (sehr wichtig!)
        // fs.unlinkSync(req.file.path); 

        res.status(201).json(newDocument);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Fehler beim Dateiupload.');
    }
};