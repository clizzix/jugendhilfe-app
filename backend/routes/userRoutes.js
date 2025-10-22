// backend/routes/userRoutes.js

import express from 'express';
import { getSpecialists } from '../controllers/userController.js'; // Oder authController, falls dort gespeichert
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route: Holt alle Fachkräfte (Nur Verwaltung)
router.get('/specialists', protect, authorize('verwaltung'), getSpecialists);

export default router;