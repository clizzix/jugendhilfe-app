// controllers/authController.js
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Hilfsfunktion, um JWT zu erzeugen
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Token ist 30 Tage gültig
    });
};

// US3: Nur Verwaltung kann Fachkräfte registrieren
export const registerFachkraft = async (req, res) => {
    // Annahme: Die Rolle 'verwaltung' wurde bereits in der Rollen-Middleware geprüft.
    const { username, password } = req.body;

    try {
        // 1. Prüfen, ob Benutzer existiert
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Benutzername existiert bereits' });
        }

        // 2. Passwort hashen
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Benutzer erstellen (Rolle ist standardmäßig 'fachkraft')
        user = await User.create({
            username,
            password: hashedPassword,
            role: 'fachkraft', // Fest auf fachkraft setzen
        });

        const token = generateToken(user._id, user.role);

        // 4. Antwort
        res.status(201).json({ 
            _id: user._id, 
            username: user.username, 
            role: user.role,
            token: token // Sende das Token auch hier zurück, falls benötigt
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Serverfehler');
    }
};

// Login für Verwaltung und Fachkraft
export const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Benutzer finden (mit Passwort, da 'select: false' im Schema ist)
        const user = await User.findOne({ username }).select('+password');

        if (!user) {

            return res.status(401).json({ msg: 'Ungültige Anmeldedaten' });
        }
        
        // Log 2: DB-Hash (Jetzt sicher)
        console.log("DB-Hash für Benutzer:", user.password);

        // 2. Passwort vergleichen
        const isMatch = await bcrypt.compare(password, user.password);
  
        if (!isMatch) {
            return res.status(401).json({ msg: 'Ungültige Anmeldedaten' });
        }

        // 3. JWT erstellen und senden
        res.json({
            _id: user._id,
            username: user.username,
            role: user.role,
            token: generateToken(user._id, user.role),
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Serverfehler');
    }
};