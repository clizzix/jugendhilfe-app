// server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import reportRoutes from './routes/reportRoutes.js';


// Umgebungsvariablen laden
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware, um JSON-Anfragen zu parsen
app.use(express.json());

// 1. Datenbankverbindung herstellen
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB erfolgreich verbunden.');
    } catch (error) {
        console.error('MongoDB Verbindungsfehler:', error.message);
        // Beenden der Anwendung bei schwerwiegendem DB-Fehler
        process.exit(1);
    }
};

connectDB();

// 2. Erster Test-Endpunkt
app.get('/', (req, res) => {
    res.send('Jugendhilfe API läuft...');
});

// Routen für Authentifizierung und Registrierung
app.use('/api/auth', authRoutes);

// Routen für Klientenverwaltung 
app.use('/api/clients', clientRoutes);
app.use('/api/reports', reportRoutes);
// 3. Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});