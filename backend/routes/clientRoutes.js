// routes/clientRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { createClient, assignSpecialist, getMyClients } from '../controllers/clientController.js';

const router = express.Router();

router.get('/my', protect, getMyClients);

// US1: Klienten anlegen (Nur Verwaltung)
router.post('/', protect, authorize('verwaltung'), createClient);

// US2: Fachkraft zuweisen (Nur Verwaltung)
router.patch('/:id/assign', protect, authorize('verwaltung'), assignSpecialist);

// Beispiel: Klientenliste abrufen (Beide Rollen benötigen später unterschiedliche Logik)
// router.get('/', protect, getClients); 

export default router;