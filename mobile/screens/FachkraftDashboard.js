import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyClients } from '../utils/api'; // Pfad prüfen!
import { useFocusEffect } from '@react-navigation/native';

// --- Komponente für ein einzelnes Klienten-Element ---
const ClientItem = ({ client, onPress }) => (
    <TouchableOpacity style={styles.item} onPress={() => onPress(client)}>
        <Text style={styles.title}>{client.clientName}</Text>
        <Text style={styles.subtitle}>Aktennr.: {client.caseId}</Text>
    </TouchableOpacity>
);

const FachkraftDashboard = ({ navigation }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // --- Funktion zum Abrufen der Klienten ---
    const fetchClients = async () => {
        setLoading(true);
        try {
            const response = await getMyClients();
            setClients(response.data);
        } catch (error) {
            Alert.alert("Fehler", "Konnte Klientenliste nicht laden. Bitte erneut versuchen.");
            // Optional: Logout bei 401 Unauthorized
            if (error.response?.status === 401) {
                handleLogout();
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Lädt die Klienten beim ersten Laden und bei Fokus-Änderung
    useFocusEffect(
        useCallback(() => {
            fetchClients();
        }, [])
    );

    // --- Logout-Handler ---
    const handleLogout = async () => {
        await AsyncStorage.clear(); // Token löschen
        navigation.replace('Login');
    };

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchClients();
    }, []);

    const handleClientPress = (client) => {
        // Hier folgt später die Navigation zur Berichterstattung (US5)
        Alert.alert("Klient ausgewählt", `Sie haben ${client.clientName} ausgewählt.`);
    };

    if (loading && !isRefreshing) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text>Klienten werden geladen...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meine Klienten (US2)</Text>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={clients}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                    <ClientItem client={item} onPress={handleClientPress} />
                )}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Ihnen sind keine Klienten zugewiesen.</Text>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f4',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 5,
    },
    logoutText: {
        color: '#e74c3c',
    },
    item: {
        backgroundColor: 'white',
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
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
    }
});

export default FachkraftDashboard;