// routes/authRoutes.js
import express from 'express';
import { loginUser, registerFachkraft } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Route: Anmeldung
router.post('/login', loginUser);


// Geschützte Route: Registrierung einer Fachkraft
// Zugriff nur für Benutzer mit der Rolle 'verwaltung'
router.post('/register-fachkraft', protect, authorize('verwaltung'), registerFachkraft);

export default router;