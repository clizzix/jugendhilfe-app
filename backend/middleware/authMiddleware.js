// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 1. JWT prüfen und Benutzerdaten in req.user speichern
export const protect = async (req, res, next) => {
    let token;

    // JWT wird typischerweise im Format "Bearer <token>" im Header gesendet
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Token aus dem Header extrahieren
            token = req.headers.authorization.split(' ')[1];
            // Token entschlüsseln
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Benutzer anhand der ID aus dem Token finden (ohne Passwort)
            req.user = await User.findById(decoded.id).select('-password');
            req.role = decoded.role; // Rolle direkt aus dem Token speichern

            next(); // Weiter zur nächsten Middleware oder Controller-Funktion
        } catch (error) {
            console.error(error);
            return res.status(401).json({ msg: 'Nicht autorisiert, Token fehlgeschlagen' });
        }
    } else {
        // Wenn kein Header vorhanden ist, direkt ablehnen.
        return res.status(401).json({ msg: 'Nicht autorisiert, kein Token vorhanden' });
    }
};

// 2. Rollenprüfung: Stellt sicher, dass der Benutzer eine der erlaubten Rollen hat
export const authorize = (roles = []) => {
    // Wenn roles ein String ist, in ein Array umwandeln
    if (typeof roles === 'string') {
        roles = [roles];
    }
    
    // Gibt die tatsächliche Middleware-Funktion zurück
    return (req, res, next) => {
        // req.role wurde durch die protect-Middleware gesetzt
        if (!req.role || (roles.length > 0 && !roles.includes(req.role))) {
            return res.status(403).json({ msg: `Der Benutzer mit Rolle '${req.role}' hat keine Berechtigung für diese Aktion.` });
        }
        next();
    };
};