// utils/api.js
import axios from 'axios'; 

// Basis-URL des Backends (passen Sie den Port an, falls Ihr Backend woanders läuft)
const API_URL = 'https://denunciatively-snappy-glenn.ngrok-free.dev/api'; 

let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
}
const apiClient = axios.create({
    baseURL: API_URL,
    // withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

apiClient.interceptors.request.use(config => {
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
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

// US4: Funktion zum Hochladen eines Dokuments
export const uploadDocument = (clientId, file) => {
    const formData = new FormData();
    
    // Die Klienten-ID ist wichtig für die Backend-Autorisierung
    formData.append('clientId', clientId);
    
    // Das Dokument: Das Feld muss 'document' heißen,
    // da dies das Feld ist, das Multer im Backend erwartet (upload.single('document')).
    formData.append('document', {
        uri: file.uri, // Der lokale Pfad der Datei
        type: file.mimeType || 'application/octet-stream', // Der MIME-Typ der Datei (z.B. application/pdf)
        name: file.name, // Der Dateiname
    });

    // Wichtig: Beim Senden von FormData muss der Content-Type auf 'multipart/form-data'
    // gesetzt werden. Da wir apiClient.post verwenden, muss dies ggf. explizit gesetzt werden
    // oder die Axios-Instanz muss so konfiguriert sein, dass sie es bei FormData automatisch tut.
    // Wir setzen es hier explizit, falls Ihre apiClient-Basis nicht automatisch erkennt.
    
    return apiClient.post('/reports/document', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// ... Weitere API-Funktionen (getReports, uploadDocument, startTranslation)