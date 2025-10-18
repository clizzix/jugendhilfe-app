// server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';             // CORS als ES Module importieren

import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import cookieParser from 'cookie-parser';



// Umgebungsvariablen laden
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cookieParser());


// ------------------------------------------------------------------
// 1. CORS KONFIGURATION (JETZT ALS ALLERERSTES!)
// Dies behebt den hartnäckigen OPTIONS-Fehler.
// ------------------------------------------------------------------
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// 2. Middleware, um JSON-Anfragen zu parsen
app.use(express.json());


// 1. Datenbankverbindung herstellen
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB erfolgreich verbunden.');
    } catch (error) {
        console.error('MongoDB Verbindungsfehler:', error.message);
        process.exit(1);
    }
};

connectDB();


// Routen-Definitionen (MÜSSEN NACH CORS UND express.json KOMMEN)
// Routen für Authentifizierung und Registrierung
app.use('/api/auth', authRoutes);

// Routen für Klientenverwaltung 
app.use('/api/clients', clientRoutes);
app.use('/api/reports', reportRoutes);


// 2. Erster Test-Endpunkt (ZULETZT DEFINIERT)
app.get('/', (req, res) => {
    res.send('Jugendhilfe API läuft...');
});

// 3. Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});