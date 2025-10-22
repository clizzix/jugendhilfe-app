// mobile/screens/FachkraftDashboard.js

import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    StyleSheet, 
    ActivityIndicator, 
    RefreshControl, 
    TouchableOpacity, 
    Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native'; // useNavigation hier importiert
import { getMyClients } from '../utils/api.js'; // Korrigierter Pfad zur API


// --- Komponente für ein einzelnes Klienten-Element ---
const ClientItem = ({ client, onPress }) => (
    <TouchableOpacity style={styles.item} onPress={() => onPress(client)}>
        <Text style={styles.title}>{client.clientName}</Text>
        <Text style={styles.subtitle}>Aktennr.: {client.caseId}</Text>
    </TouchableOpacity>
);

const FachkraftDashboard = () => {
    // Entfernt das doppelte `navigation` Prop aus den Funktionsargumenten
    const navigation = useNavigation(); 
    
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    // Das zweite `const navigation = useNavigation();` wurde entfernt

    // --- Logout-Handler ---
    const handleLogout = useCallback(async () => {
        await AsyncStorage.clear(); // Token löschen
        navigation.replace('Login');
    }, [navigation]);

    // --- Navigation zum ReportScreen ---
    const handleClientPress = (client) => {
        navigation.navigate('Report', { 
            clientId: client._id, 
            clientName: client.clientName 
        });
    };

    // --- Funktion zum Abrufen der Klienten ---
    const fetchClients = useCallback(async () => {
        // Nur den Ladezustand setzen, wenn es nicht gerade ein Pull-to-Refresh ist
        if (!isRefreshing) setLoading(true); 

        try {
            // Stellen Sie sicher, dass der API-Pfad korrekt ist (angepasst zu '../utils/api.js')
            const response = await getMyClients(); 
            setClients(response.data);
        } catch (error) {
            Alert.alert("Fehler", "Konnte Klientenliste nicht laden.");
            if (error.response?.status === 401) {
                // Bei 401 wird der Benutzer abgemeldet
                handleLogout();
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [isRefreshing, handleLogout]); // Fügt isRefreshing hinzu, um Abhängigkeiten zu klären

    // Lädt die Klienten beim ersten Laden und bei Fokus-Änderung
    // Abhängigkeit vom `fetchClients` wurde entfernt, da `fetchClients` jetzt 
    // `useCallback` verwendet und nur von `isRefreshing` abhängt.
    useFocusEffect(
        useCallback(() => {
            fetchClients();
        }, [fetchClients]) // Abhängig von fetchClients
    ); 

    // --- Pull-to-Refresh Handler ---
    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchClients();
    }, [fetchClients]); // Abhängig von fetchClients

    
    // --- Ladezustand prüfen (Full-Screen Loader) ---
    if (loading && !isRefreshing) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={{marginTop: 10}}>Klienten werden geladen...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meine Klienten (US2/US6)</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={clients}
                keyExtractor={item => item._id.toString()} // Konvertiert _id explizit zu String
                // Nutzt die ClientItem-Komponente direkt, sauberer und kürzer.
                renderItem={({ item }) => (
                    <ClientItem client={item} onPress={handleClientPress} />
                )}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#3498db']} />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Ihnen sind keine Klienten zugewiesen.</Text>
                }
            />
        </View>
    );
};

// ... (Styles)

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f4',
    },
    center: {
        flex: 1, // Wichtig für die Zentrierung des Full-Screen Loaders
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f4f4f4',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    logoutButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        backgroundColor: '#fbecec', // Leichter Hintergrund zur Hervorhebung
    },
    logoutText: {
        color: '#e74c3c',
        fontWeight: '600',
    },
    item: {
        backgroundColor: 'white',
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
        borderRadius: 8,
        boxShadowColor: "#000",
        boxShadowOffset: { width: 0, height: 1 },
        boxShadowOpacity: 0.22,
        boxShadowRadius: 2.22,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        color: '#777',
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#777',
        fontSize: 16,
    }
});

export default FachkraftDashboard;