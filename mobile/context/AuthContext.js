import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as jwtDecode from 'jwt-decode';

// 1. Kontext erstellen
const AuthContext = createContext();

// 2. Provider Komponente erstellen
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Speichert { _id, username, role, ... }
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initiales Laden: Liest den Token und den Benutzer beim App-Start aus AsyncStorage
    useEffect(() => {
        const loadUserFromStorage = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('jwtToken');
                if (storedToken) {
                    const decodedUser = jwtDecode.jwtDecode(storedToken);
                    setToken(storedToken);
                    // Wir speichern die dekodierten Daten (ID, Rolle, Name)
                    setUser(decodedUser); 
                }
            } catch (e) {
                console.error("Fehler beim Laden des Tokens:", e);
                await AsyncStorage.removeItem('jwtToken');
            } finally {
                setIsLoading(false);
            }
        };
        loadUserFromStorage();
    }, []);

    // Login-Funktion
    const login = async (newToken) => {
        await AsyncStorage.setItem('jwtToken', newToken);
        const decodedUser = jwtDecode.jwtDecode(newToken);
        setToken(newToken);
        setUser(decodedUser);
    };

    // Logout-Funktion
    const logout = async () => {
        await AsyncStorage.removeItem('jwtToken');
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
    };

    // Gibt den Kontext an die Kind-Komponenten weiter
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Benutzerdefinierten Hook erstellen
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth muss innerhalb eines AuthProvider verwendet werden');
    }
    return context;
};