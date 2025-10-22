import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerSpecialist, createClient, getSpecialists } from '../../../shared/api.js'; 

const DashboardPage = () => {
    const navigate = useNavigate();
    // State für Klienten-Daten
    const [specialists, setSpecialists] = useState([]);
    // State für Klienten-Daten
    const [clientData, setClientData] = useState({ clientName: '', caseId: '', birthDate: '', address: '', assignedTo: '' });
    // State für Fachkraft-Daten
    const [userData, setUserData] = useState({ username: '', password: '' });
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loadingSpecialists, setLoadingSpecialists] = useState(true);

    // Fachkräfte beim Laden abrufen
    useEffect(() => {
        const loadSpecialists = async () => {
            try {
                const response = await getSpecialists();
                setSpecialists(response.data);

                // Setzt die erste Fachkraft als Standard, falls vorhanden
                if (response.data.length > 0) {
                    setClientData(prev => ({ ...prev, assignedTo: response.data[0]._id }));
                } else {
                    setError("Es sind keine Fachkräfte registriert. Bitte zuerst eine Registrierung durchführen.");
                }
            } catch (err) {
                setError("Konnte die List der Fachkräfte nicht vom Server laden.");
            } finally {
                setLoadingSpecialists(false);
            }
        }; 
        loadSpecialists();
    }, []);

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
            
            try {
                const response = await getSpecialists();
                setSpecialists(response.data);

                if (!clientData.assignedTo && response.data.length > 0) {
                    setClientData(prev => ({ ...prev, assignedTo: response.data[0]._id }));
                }
            } catch (err) {
                setError("Konnte die Fachkräfte-Liste nach der Registrierung nicht aktualisieren.")
            }
            
        } catch (err) {
            setError(err.response?.data?.msg || "Fehler bei der Registrierung der Fachkraft. Benutzername evtl. schon vergeben.");
        }
    };

    // --- US1: Neuen Klienten anlegen ---
    const handleClientSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!clientData.clientName || !clientData.caseId || !clientData.assignedTo) {
            setError("Bitte Name, Aktennummer und zugewiesene Fachkraft auswählen.");
            return;
        }
        
        // Daten für den Sendeversand
        const clientDataToSend = {
            ...clientData,
            // Stellt sicher, dass das Datum entweder leer oder ein ISO-String ist
            birthDate: clientData.birthDate ? new Date(clientData.birthDate).toISOString() : undefined,
        };

        // Entfernen leerer Adress- und Geburtsdatumsfelder, um Backend Schema zu genügen
        if (!clientDataToSend.birthDate) delete clientDataToSend.birthDate;
        if (!clientDataToSend.address) delete clientDataToSend.address;

        try {
            const res = await createClient(clientDataToSend);
            setMessage(`✅ Klient ${res.data.clientName} (Aktennr.: ${res.data.caseId}) erfolgreich angelegt.`);
            setClientData({ clientName: '', caseId: '', birthDate: '', address: '' }); // Formular zurücksetzen
        } catch (err) {
            setError(err.response?.data?.msg || "Fehler beim Anlegen des Klienten. Aktennummer möglicherweise bereits vorhanden.");
        }
    };

    if (loadingSpecialists) {
        return <div className="dashboard-container" style={{ padding: '20px', textAlign: 'center' }}>Lade Daten...</div>;
    }

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
                    

                    <select
                        name="assignedTo"
                        value={clientData.assignedTo}
                        onChange={handleClientChange}
                        style={{ padding: '8px' }}
                    >
                        {specialists.length > 0 ? (
                            specialists.map((spec) => (
                                <option key={spec._id} value={spec._id}>
                                    {spec.username}
                                </option>
                            ))
                        ) : (
                            <option value="">-- Keine Fachkräfte gefunden --</option>
                        )}
                    </select>

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