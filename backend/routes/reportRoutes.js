import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
    createReport, 
    uploadDocument, 
    getClientReports, 
    downloadDocumentController,
    updateReport, 
    deleteReport,
    getTranslatedReport // US9: Neu hinzugefügt
} from '../controllers/reportController.js'; 
import { startTranslation } from '../controllers/translationController.js';

const router = express.Router();

// -------------------------------------------------------------------------
// Multer Konfiguration: Temporäre Speicherung
const upload = multer({ dest: 'uploads/' }); 
// -------------------------------------------------------------------------

// Middleware, die für alle folgenden Routen gilt:
router.use(protect); // Alle Routen erfordern Anmeldung

// =========================================================================
// 1. STATISCHE POST/GET ENDPUNKTE (Beenden die Anfrage sofort)
// =========================================================================

// US5: BERICHT ERSTELLEN (Text-Report)
router.post('/', authorize('fachkraft'), createReport);

// US4: DOKUMENT HOCHLADEN
router.post('/document', authorize('fachkraft'), upload.single('document'), uploadDocument); 

// ZUSÄTZLICH: ÜBERSETZUNG STARTEN (DeepL)
router.post('/translate', startTranslation);


// =========================================================================
// 2. SPEZIALISIERTE DYNAMISCHE GET ENDPUNKTE (Müssen vor generischen IDs stehen)
// =========================================================================

// DOKUMENT-DOWNLOAD-PFAD ABRUFEN
router.get('/download/:reportId', authorize('fachkraft', 'verwaltung'), downloadDocumentController);


// US9: Übersetzen eines Berichts abrufen (MUSS vor /:reportId kommen)
router.get('/translate/:reportId', getTranslatedReport);


// =========================================================================
// 3. GENERISCHE DYNAMISCHE ENDPUNKTE
// =========================================================================

// US6: BERICHTE ABRUFEN FÜR KLIENT (Wichtig: muss nach /translate/:reportId kommen)
router.get('/:clientId', authorize('fachkraft', 'verwaltung'), getClientReports);

// US7 & US8: BERICHT BEARBEITEN/LÖSCHEN
router.route('/:reportId')
    .put(updateReport) // Bericht bearbeiten (US7)
    .delete(deleteReport); // Bericht löschen (US8)


export default router;
