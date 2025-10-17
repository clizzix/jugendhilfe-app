// routes/reportRoutes.js
import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { createReport, uploadDocument } from '../controllers/reportController.js';
import { startTranslation } from '../controllers/translationController.js';


const router = express.Router();

// Konfiguration für Multer (speichert Dateien temporär auf dem Server)
// WICHTIG: Ersetzen Sie 'uploads/' durch einen sicheren, temporären Pfad
const upload = multer({ dest: 'uploads/' }); 

// Alle Routen erfordern Anmeldung
router.use(protect);
// Alle Routen erfordern Rolle 'fachkraft' oder 'verwaltung'
router.use(authorize(['fachkraft', 'verwaltung'])); 

// US5: Textbericht erstellen (nur für Fachkräfte)
router.post('/text', authorize('fachkraft'), createReport);

// US4: Dokument hochladen (mit Multer)
// 'single('document')' erwartet ein Feld namens 'document' im Formular
router.post('/document', authorize('fachkraft'), upload.single('document'), uploadDocument); 

// Übersetzung starten (FK und KO)
router.post('/translate', startTranslation);

// NEU: Endpunkt zum Download der generierten PDF (nicht gezeigt, aber notwendig)
// router.get('/download/:filename', downloadPDF);

export default router;