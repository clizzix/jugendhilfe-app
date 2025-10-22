// server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';             
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import userRoutes from './routes/userRoutes.js';



// Umgebungsvariablen laden
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;


const allowedOrigins = [
    'http://localhost:5173', // Web-Dashboard
    'http://localhost:8081', // Mobile App Web-Vorschau (Expo)
    'http://localhost:19006',
    'http://localhost:5001',
    'http://10.0.2.2:5001',    // ✨ WICHTIG: Android Emulator Zugriff auf Host (Port 5001)
    'http://10.0.2.2:8081',
    'http://192.168.0.161:5001',
    'http://192.168.0.161:8081'

];

// Temporäre Lockerung: Erlaubt alle lokalen IPs, um das Problem zu beweisen
const corsOptions = {
    origin: function (origin, callback) {
        // Erlaubt Anfragen, wenn der Ursprung in der Whitelist ist, wenn der Origin undefined ist (Postman/direkte Aufrufe)
        // ODER wenn der Origin mit Ihrer lokalen IP beginnt (Wildcard für alle Ports auf dieser IP)
        if (!origin || allowedOrigins.includes(origin) || (origin && origin.startsWith('http://192.168.0.161'))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    // Fügen Sie headers hinzu, da Sie Auth-Token verwenden
    allowedHeaders: ['Content-Type', 'Authorization'],
};
// ------------------------------------------------------------------
// 1. CORS KONFIGURATION (JETZT ALS ALLERERSTES!)
// Dies behebt den hartnäckigen OPTIONS-Fehler.
// ------------------------------------------------------------------
app.use(cors(corsOptions));

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
app.use('/api/users', userRoutes);

// 2. Erster Test-Endpunkt (ZULETZT DEFINIERT)
app.get('/', (req, res) => {
    res.send('Jugendhilfe API läuft...');
});

// 3. Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});