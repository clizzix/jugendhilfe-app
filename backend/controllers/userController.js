// backend/controllers/userController.js

import User from '../models/User.js';

/**
 * US4: Holt alle Benutzer mit der Rolle 'fachkraft'.
 * Nur für die 'verwaltung' zugänglich.
 */
export const getSpecialists = async (req, res) => {
    try {
        // Sucht alle Benutzer mit der Rolle 'fachkraft'
        const specialists = await User.find({ role: 'fachkraft' }).select('_id username');

        res.json(specialists);
    } catch (error) {
        console.error('Fehler beim Abrufen der Fachkräfte:', error.message);
        res.status(500).send('Serverfehler');
    }
};