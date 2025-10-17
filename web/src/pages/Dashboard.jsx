import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerSpecialist, createClient } from '../../../shared/api.js'; // Pfad MUSS stimmen!

const DashboardPage = () => {
    const navigate = useNavigate();
    // State für Klienten-Daten
    const [clientData, setClientData] = useState({ clientName: '', caseId: '', birthDate: '', address: '' });
    // State für Fachkraft-Daten
    const [userData, setUserData] = useState({ username: '', password: '' });
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };
    
    // Hilfsfunktion zur einfachen Handhabung von Änderungen
    const handleClientChange = (e) => {
        const { name, value } = e.target;
        setClientData(prev => ({ ...prev, [name]: value }));
    };

    // --- US3: Neue Fachkraft registrieren ---
    const handleUserSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!userData.username || !userData.password) {
            setError("Bitte Benutzername und Passwort eingeben.");
            return;
        }

        try {
            await registerSpecialist(userData);
            setMessage(`✅ Fachkraft ${userData.username} erfolgreich registriert. Rolle: Fachkraft`);
            setUserData({ username: '', password: '' }); // Formular zurücksetzen
        } catch (err) {
            setError(err.response?.data?.msg || "Fehler bei der Registrierung der Fachkraft. Benutzername evtl. schon vergeben.");
        }
    };

    // --- US1: Neuen Klienten anlegen ---
    const handleClientSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!clientData.clientName || !clientData.caseId) {
            setError("Bitte Name und Aktennummer eingeben.");
            return;
        }
        
        // Geburtsdatum vor dem Senden in ein ISO-Format bringen
        const clientDataToSend = {
            ...clientData,
            // Stellt sicher, dass das Datum entweder leer oder ein ISO-String ist
            birthDate: clientData.birthDate ? new Date(clientData.birthDate).toISOString() : undefined
        };

        try {
            const res = await createClient(clientDataToSend);
            setMessage(`✅ Klient ${res.data.clientName} (Aktennr.: ${res.data.caseId}) erfolgreich angelegt.`);
            setClientData({ clientName: '', caseId: '', birthDate: '', address: '' }); // Formular zurücksetzen
        } catch (err) {
            setError(err.response?.data?.msg || "Fehler beim Anlegen des Klienten. Aktennummer möglicherweise bereits vorhanden.");
        }
    };

    return (
        <div className="dashboard-container" style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>
                <h1>Verwaltungs-Dashboard 👋</h1>
                <button onClick={handleLogout} style={{ padding: '10px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', cursor: 'pointer' }}>Logout</button>
            </header>
            
            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
            
            {/* Formular für Klienten (US1) */}
            <section style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px' }}>
                <h2>Neuen Klienten anlegen</h2>
                <form onSubmit={handleClientSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input type="text" name="clientName" placeholder="Name" required value={clientData.clientName} onChange={handleClientChange} />
                    <input type="text" name="caseId" placeholder="Aktennummer (Case ID)" required value={clientData.caseId} onChange={handleClientChange} />
                    <input type="date" name="birthDate" placeholder="Geburtsdatum" value={clientData.birthDate.substring(0, 10)} onChange={handleClientChange} />
                    <input type="text" name="address" placeholder="Adresse" value={clientData.address} onChange={handleClientChange} />
                    <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: '#2ecc71', color: 'white' }}>Klient anlegen</button>
                </form>
            </section>

            {/* Formular für Fachkräfte (US3) */}
            <section style={{ border: '1px solid #ccc', padding: '20px' }}>
                <h2>Neue Fachkraft registrieren</h2>
                <form onSubmit={handleUserSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input type="text" placeholder="Benutzername" required value={userData.username} onChange={(e) => setUserData({ ...userData, username: e.target.value })} />
                    <input type="password" placeholder="Passwort" required value={userData.password} onChange={(e) => setUserData({ ...userData, password: e.target.value })} />
                    <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', backgroundColor: '#3498db', color: 'white' }}>Fachkraft erstellen</button>
                </form>
            </section>
        </div>
    );
};

export default DashboardPage;