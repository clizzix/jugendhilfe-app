// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Bitte einen Benutzernamen angeben'],
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Bitte ein Passwort angeben'],
        minlength: 6,
        select: false, // Wichtig: Holt das Passwort NICHT standardmäßig ab
    },
    role: {
        type: String,
        enum: ['verwaltung', 'fachkraft'], // Nur diese zwei Rollen sind erlaubt
        default: 'fachkraft',
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    // Verweis auf die Klienten-IDs, die dieser Fachkraft zugewiesen sind (US2)
    assignedClients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client', // Später definierter Klienten-Modellname
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const User = mongoose.model('User', UserSchema);
export default User;