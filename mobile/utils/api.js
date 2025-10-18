// shared/api.js
import axios from 'axios'; 

// Basis-URL des Backends (passen Sie den Port an, falls Ihr Backend woanders läuft)
const API_URL = 'http://localhost:5001/api'; 

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor, um den JWT-Token zu jeder Anfrage hinzuzufügen
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
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


// ... Weitere API-Funktionen (getReports, uploadDocument, startTranslation)