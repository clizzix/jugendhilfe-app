import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { login } from '../utils/api'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const response = await login(username, password);
            const { token, role } = response.data;
            
            // 2. Prüfung der Rolle (Nur Fachkräfte sind hier erlaubt)
            if (role === 'fachkraft') {
                // 1. JWT-Token speichern
                await AsyncStorage.setItem('jwtToken', token); // DIES IST NEU

                // 2. Rolle speichern (optional, aber hilfreich)
                await AsyncStorage.setItem('userRole', role);
            
                // Navigiere zum Dashboard
                navigation.replace('Dashboard');
            } else {
                // Verwaltungskonten erhalten Fehlermeldung
                Alert.alert("Fehlgeschlagen", "Verwaltungskonten müssen das Web-Portal nutzen.");
            }

        } catch (error) {
            const msg = error.response?.data?.msg || "Anmeldung fehlgeschlagen. Server nicht erreichbar.";
            Alert.alert("Anmeldefehler", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Fachkraft Login</Text>
            <TextInput
                style={styles.input}
                placeholder="Benutzername"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Passwort"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button
                title={loading ? "Wird angemeldet..." : "Anmelden"}
                onPress={handleLogin}
                disabled={loading}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 30,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 15,
        paddingHorizontal: 10,
    },
});

export default LoginScreen;