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
    'http://localhost:19006' // Manchmal Expo's Standardport
];
// ------------------------------------------------------------------
// 1. CORS KONFIGURATION (JETZT ALS ALLERERSTES!)
// Dies behebt den hartnäckigen OPTIONS-Fehler.
// ------------------------------------------------------------------
app.use(cors({
    origin: function (origin, callback) {
        // Erlaubt Anfragen, wenn der Ursprung in der Whitelist ist oder wenn es keine Ursprungsangabe gibt (z.B. Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    // Wenn Sie zur Header/Bearer Token-Methode zurückgekehrt sind, lassen Sie credentials weg oder setzen Sie es auf false.
    // Da Sie mit Header arbeiten: Sie könnten credentials: false verwenden, aber lassen Sie es für lokale Tests weg.
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
app.use('/api/users', userRoutes);

// 2. Erster Test-Endpunkt (ZULETZT DEFINIERT)
app.get('/', (req, res) => {
    res.send('Jugendhilfe API läuft...');
});

// 3. Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});