// models/Report.js
import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Für die fortlaufende Berichterstattung (US5)
    reportText: {
        type: String,
        required: function() {
            return this.type === 'REPORT'; // Entweder Text ODER Datei muss vorhanden sein
        },
    },
    // Für hochgeladene Dateien (US4)
    fileMetadata: {
        fileName: String,
        fileType: { type: String, enum: ['image/jpeg', 'image/png', 'application/pdf', 'PDF', 'DOCX', 'SCAN', 'UNKNOWN'] },
        // Speichert den Pfad oder die URL zum Cloud-Speicher
        storagePath: String, 
        originalName: String,
        size: Number,
    },
    isDocument: {
        type: Boolean,
        required: function() {
            return !this.reportText; // Entweder Text ODER Datei muss vorhanden sein
        },
    },
    type: { // Hilfreich zur Unterscheidung im Frontend
        type: String,
        enum: ['REPORT', 'DOCUMENT'], 
        required: true,
    },
    // Wichtig für die Revisionssicherheit
    isLocked: {
        type: Boolean,
        default: false, // Nach Fertigstellung durch Admin auf 'true' setzen
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true
});

const Report = mongoose.model('Report', ReportSchema);
export default Report;