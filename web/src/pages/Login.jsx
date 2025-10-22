import React, { useState } from 'react';
import { login } from '@shared/api.js'; 
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // 1. API-Aufruf
            const response = await login(username, password);
            const { token, role } = response.data;

            // 2. Token und Rolle speichern
            localStorage.setItem('jwtToken', token);
            localStorage.setItem('userRole', role);

            // 3. Weiterleitung basierend auf der Rolle
            if (role === 'verwaltung') {
                navigate('/dashboard'); // Weiterleitung zum Verwaltungs-Dashboard
            } else {
                // Fachkraft darf sich NICHT über das Web-Frontend anmelden
                setError("Zugriff verweigert: Bitte nutzen Sie die mobile App.");
                localStorage.clear(); 
            }

        } catch (err) {
            // Fehlerbehandlung: 401 Ungültige Anmeldedaten vom Backend
            const msg = err.response?.data?.msg || "Anmeldung fehlgeschlagen. Server nicht erreichbar.";
            setError(msg);
        }
    };

    return (
        <div className="login-container">
            <h1>Verwaltung Login</h1>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Benutzername</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Passwort</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="error">{error}</p>}
                <button type="submit">Anmelden</button>
            </form>
        </div>
    );
};

export default LoginPage;