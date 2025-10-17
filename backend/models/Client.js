// models/Client.js
import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: true,
        trim: true,
    },
    // Eindeutige ID für die Akte
    caseId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    // Verweis auf die zuständige Fachkraft (US2)
    assignedSpecialist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Verweis auf das User-Modell
        default: null, // Initial ist noch keine Fachkraft zugewiesen
    },
    // Weitere notwendige Stammdaten (Anpassung nach Bedarf)
    birthDate: Date,
    address: String,
    
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const Client = mongoose.model('Client', ClientSchema);
export default Client;