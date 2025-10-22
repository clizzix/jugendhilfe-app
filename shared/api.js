// shared/api.js
import axios from 'axios'; 

// Basis-URL des Backends (passen Sie den Port an, falls Ihr Backend woanders läuft)
const API_URL = 'http://localhost:5001/api'; 

const apiClient = axios.create({
    baseURL: API_URL,
    // withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

apiClient.interceptors.request.use(config => {
    // Annahme: Ihr Frontend speichert das Token beim Login in localStorage.
    const token = localStorage.getItem('jwtToken'); 
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Beispiel-Aufruf für das Login
export const login = (username, password) => {
    return apiClient.post('/auth/login', { username, password });
};

// US3: Registriere eine neue Fachkraft (Admin)
export const registerSpecialist = (userData) => {
    // Sendet an den geschützten Endpunkt (Nur 'verwaltung' hat Zugriff)
    return apiClient.post('/auth/register-fachkraft', userData);
};
// US1 Erstelle einen neuen Klienten (Admin)
export const createClient = (clientData) => {
    // Wird automatisch durch den Interceptor mit dem Token gesendet
    return apiClient.post('/clients', clientData);
};

// US2: Holt alle Klienten, die der aktuell angemeldeten Fachkraft zugewiesen sind
export const getMyClients = () => {
    // Der Backend-Endpunkt /clients/my ist geschützt und filtert automatisch
    // die Klienten basierend auf der user ID im JWT Token.
    return apiClient.get('/clients/my');
};

// US4: Holt alle Fachkräfte (verwaltung)
export const getSpecialists = () => {
    // Sendet an den neuen Endpunkt
    return apiClient.get('/users/specialists'); 
};

// US5: Neuen Bericht senden (nur Text)
export const createReport = (reportData) => {
    // reportData sollte { clientId, reportText } enthalten
    return apiClient.post('/reports', reportData); 
};

// US6: Berichte für einen Klienten abrufen
export const getClientReports = (clientId) => {
    return apiClient.get(`/reports/${clientId}`); 
};

// ... Weitere API-Funktionen (getReports, uploadDocument, startTranslation)