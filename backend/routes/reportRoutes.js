// backend/routes/reportRoutes.js

import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
    createReport, 
    uploadDocument, 
    getClientReports, // US6: Neu hinzugefügt
    downloadDocumentController,// downloadPDF // Falls benötigt
    updateReport, 
    deleteReport
} from '../controllers/reportController.js'; 
import { startTranslation } from '../controllers/translationController.js';

const router = express.Router();

// -------------------------------------------------------------------------
// Multer Konfiguration: Temporäre Speicherung
// WICHTIG: 'uploads/' muss existieren und ist nur für temporäre Dateien
const upload = multer({ dest: 'uploads/' }); 
// -------------------------------------------------------------------------

// Middleware, die für alle folgenden Routen gilt:
router.use(protect); // Muss angemeldet sein
// Wir lassen die Autorisierung hier weg und wenden sie spezifisch auf die Routen an, 
// da getClientReports für beide Rollen zugänglich sein soll, aber mit unterschiedlichen Checks.


// -------------------------------------------------------------------------
// US5: BERICHT ERSTELLEN (Text-Report)
// Route: POST /api/reports
// -------------------------------------------------------------------------
// Benötigt die Rolle 'fachkraft'. Wir verwenden '/' anstelle von '/text' 
// für den Haupt-POST-Endpunkt zur Einfachheit.
router.post('/', protect, authorize('fachkraft'), createReport);


// -------------------------------------------------------------------------
// US4: DOKUMENT HOCHLADEN
// Route: POST /api/reports/document
// -------------------------------------------------------------------------
// Benötigt die Rolle 'fachkraft'. Multer fängt das 'document'-Feld ab.
router.post('/document', authorize('fachkraft'), upload.single('document'), uploadDocument); 
// DOKUMENT-DOWNLOAD-PFAD ABRUFEN
router.get('/download/:reportId', protect, authorize('fachkraft', 'verwaltung'), downloadDocumentController);

// -------------------------------------------------------------------------
// US6: BERICHTE ABRUFEN (Anzeige in Mobile App & Dashboard)
// Route: GET /api/reports/:clientId
// -------------------------------------------------------------------------
// Erfordert keine spezielle authorize-Middleware, da die Berechtigungsprüfung 
// (Fachkraft dem Klienten zugewiesen oder Rolle Verwaltung) IM Controller (getClientReports) erfolgt.
router.get('/:clientId', protect, authorize('fachkraft', 'verwaltung'), getClientReports);

// GET Reports for a client (US6)
router.get('/:clientId', protect, getClientReports);

// 💡 NEUE ROUTEN FÜR UPDATE UND DELETE
// PUT Update Report (US7) & DELETE Report (US8)
router.route('/:reportId')
    .put(protect, updateReport) // Bericht bearbeiten
    .delete(protect, deleteReport); // Bericht löschen
// -------------------------------------------------------------------------
// ZUSÄTZLICH: ÜBERSETZUNG (Nicht-Kernfunktion, aber im Code)
// -------------------------------------------------------------------------
// Route: POST /api/reports/translate
// Wir gehen davon aus, dass beide Rollen (FK/VW) dies nutzen dürfen.
router.post('/translate', startTranslation);


// -------------------------------------------------------------------------
// ZUSÄTZLICH: DOWNLOAD (Platzhalter)
// -------------------------------------------------------------------------
// router.get('/download/:filename', downloadPDF);


export default router;