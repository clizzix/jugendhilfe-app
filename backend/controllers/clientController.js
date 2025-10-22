// controllers/clientController.js
import Client from '../models/Client.js';
import User from '../models/User.js'; // Wird für die Zuweisung benötigt

// US1: Neuen Klienten anlegen
export const createClient = async (req, res) => {
    // Die Berechtigungsprüfung (Rolle 'verwaltung') erfolgt über die Middleware in der Route!
    const { clientName, caseId, birthDate, address, assignedTo } = req.body;

    try {
        const client = await Client.create({
            clientName,
            caseId,
            birthDate,
            address,
            assignedSpecialist: assignedTo,
        });

        res.status(201).json(client);
    } catch (err) {
        // Fehler beim Anlegen (z.B. caseId nicht eindeutig)
        console.error(err.message);
        res.status(500).send('Fehler beim Anlegen des Klienten.');
    }
};

// US2: Fachkraft einem Klienten zuweisen (Assignment)
export const assignSpecialist = async (req, res) => {
    // Die Berechtigungsprüfung (Rolle 'verwaltung') erfolgt über die Middleware!
    const clientId = req.params.id;
    const { fachkraftId } = req.body;

    try {
        // 1. Prüfen, ob Klient existiert
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(404).json({ msg: 'Klient nicht gefunden' });
        }
        
        // 2. Prüfen, ob Fachkraft existiert und die Rolle 'fachkraft' hat
        const specialist = await User.findById(fachkraftId);
        if (!specialist || specialist.role !== 'fachkraft') {
            return res.status(404).json({ msg: 'Fachkraft nicht gefunden oder falsche Rolle' });
        }

        // 3. Klient aktualisieren (Zuweisung)
        client.assignedSpecialist = fachkraftId;
        await client.save();
        
        // 4. Fachkraft-Konto aktualisieren (Klienten-ID hinzufügen)
        // Sicherstellen, dass die ID nicht doppelt im Array ist
        if (!specialist.assignedClients.includes(clientId)) {
            specialist.assignedClients.push(clientId);
            await specialist.save();
        }

        res.json({ msg: 'Zuweisung erfolgreich', client });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Fehler bei der Zuweisung.');
    }
};

export const getMyClients = async (req, res) => {
    try {
        // WICHTIG: Die ID des eingeloggten Benutzers (Fachkraft)
        const fachkraftId = req.user._id; 
        
        // 1. Suche nach Klienten, deren Feld 'assignedTo' mit der ID der Fachkraft übereinstimmt
        const clients = await Client.find({ assignedSpecialist: fachkraftId })
                                    .select('-__v'); // Optional: entfernt das __v-Feld

        // 2. Antwort senden
        res.json(clients);

    } catch (error) {
        console.error('Fehler beim Abrufen der Klienten:', error);
        res.status(500).json({ msg: 'Serverfehler beim Laden der Klientenliste.' });
    }
};