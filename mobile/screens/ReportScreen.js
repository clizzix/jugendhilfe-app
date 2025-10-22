// mobile/screens/ReportScreen.js (KORRIGIERT für useFocusEffect)

import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    Button, 
    StyleSheet, 
    Alert, 
    ScrollView,
    FlatList, 
    ActivityIndicator, 
    RefreshControl 
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { createReport, getClientReports, uploadDocument } from '../utils/api.js'; 


// --- Komponente für die Anzeige eines Berichts ---
const ReportItem = ({ report }) => {
    // Formatierung des Datums
    const formattedDate = new Date(report.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <View style={styles.reportItem}>
            <Text style={styles.reportHeader}>
                Bericht von: {report.createdBy?.username || 'Unbekannt'}
                <Text style={styles.reportDate}> ({formattedDate})</Text>
            </Text>
            <Text style={styles.reportContent}>{report.reportText || report.content}</Text>
        </View>
    );
};
// --------------------------------------------------

const ReportScreen = () => {
    const route = useRoute(); 
    const navigation = useNavigation();
    const { clientId, clientName } = route.params; 

    const [reportText, setReportText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // State für Berichtsliste
    const [reports, setReports] = useState([]);
    const [isLoadingReports, setIsLoadingReports] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);


    // --- Funktion zum Abrufen der Berichte (US6) ---
    // MUSS in useCallback, um Stabilität zu gewährleisten
    const fetchReports = useCallback(async () => {
        // Setzt isLoadingReports nur, wenn es kein Pull-to-Refresh ist, 
        // um den Ladespinner nicht zu überblenden.
        if (!isRefreshing) setIsLoadingReports(true);
        
        try {
            const response = await getClientReports(clientId); 
            setReports(response.data);
        } catch (error) {
            Alert.alert('Fehler', 'Konnte Berichte nicht laden.');
            console.error(error.response?.data?.msg || error.message);
        } finally {
            setIsLoadingReports(false);
            setIsRefreshing(false);
        }
    // Abhängig von clientId und isRefreshing (da es den Ladezustand beeinflusst)
    }, [clientId, isRefreshing]); 


    // --- Hook für den Ladevorgang ---
    // Übergibt die stabile Funktion fetchReports direkt an useFocusEffect
    useFocusEffect(
    React.useCallback(() => {
        // Ruft die asynchrone Funktion auf, gibt aber selbst KEIN Promise zurück
        fetchReports();
    }, [fetchReports])
    );
    
    
    // Pull-to-Refresh Handler
    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchReports();
    }, [fetchReports]);


    // --- Formular-Handler (US5) ---
    const handleSubmit = async () => {
        if (!reportText.trim()) {
            Alert.alert('Fehler', 'Bitte geben Sie Text für den Bericht ein.');
            return;
        }

        setIsSaving(true);

        try {
            await createReport({
                clientId: clientId, 
                reportText: reportText, 
            });
            
            Alert.alert('Erfolg', 'Bericht wurde erfolgreich gespeichert.');
            setReportText(''); 
            fetchReports(); // Berichtsliste neu laden

        } catch (error) {
            Alert.alert('Fehler', error.response?.data?.msg || 'Bericht konnte nicht gespeichert werden.');
        } finally {
            setIsSaving(false);
        }
    };

    // Dokument-Upload Handler
    const handleDocumentUpload = async () => {
        setIsUploading(true);

        try {
            // 1. Dokumenten-Picker öffnen
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*', // Erlaubt alle Dateitypen
                copyToCacheDirectory: true, // Wichtig für den Zugriff auf die URI
            });

            // Wenn der Benutzer den Vorgang abbricht
            if (result.canceled) {
                setIsUploading(false);
                return;
            }

            const file = result.assets[0]; // Das ausgewählte Dokument

            // 2. Dokument an den Server senden
            await uploadDocument(clientId, file);
            
            Alert.alert('Erfolg', `Dokument "${file.name}" wurde erfolgreich hochgeladen.`);
            fetchReports(); // Berichtsliste neu laden, um den neuen Report/Link anzuzeigen

        } catch (error) {
            console.error('Fehler beim Dokumenten-Upload:', error);
            Alert.alert('Fehler', error.response?.data?.msg || 'Dokument konnte nicht hochgeladen werden.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <View style={styles.mainContainer}>
            
            {/* --- Berichts-Eingabe (US5) --- */}
            <ScrollView contentContainerStyle={styles.formSection}>
                <Text style={styles.header}>Neuer Bericht für:</Text>
                <Text style={styles.clientName}>{clientName}</Text>

                <TextInput
                    style={styles.input}
                    multiline
                    numberOfLines={6}
                    placeholder="Geben Sie hier den Tagesbericht ein..."
                    value={reportText}
                    onChangeText={setReportText}
                    textAlignVertical="top"
                />
                
                <Button
                    title={isSaving ? "Speichere..." : "Bericht speichern"}
                    onPress={handleSubmit}
                    disabled={isSaving || !reportText.trim()}
                    color="#2ecc71"
                />
                {/* NEU: Button für Dokumenten-Upload */}
                <View style={styles.uploadButtonContainer}>
                    <Button
                        title={isUploading ? "Lade Dokument hoch..." : "Dokument hochladen (US4)"}
                        onPress={handleDocumentUpload}
                        disabled={isUploading || isSaving}
                        color="#3498db"
                    />
                </View>
            </ScrollView>

            {/* --- Berichts-Historie (US6) --- */}
            <View style={styles.listSection}>
                <Text style={styles.listHeader}>Berichts-Historie</Text>
                
                {isLoadingReports && !isRefreshing ? (
                    <ActivityIndicator size="large" color="#3498db" style={{marginTop: 20}} />
                ) : (
                    <FlatList
                        data={reports}
                        keyExtractor={item => item._id.toString()}
                        renderItem={({ item }) => <ReportItem report={item} />}
                        refreshControl={
                            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#3498db']} />
                        }
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>Bisher keine Berichte vorhanden.</Text>
                        }
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f4f4f4',
    },
    formSection: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    header: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 5,
        color: '#555',
    },
    clientName: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 15,
        color: '#34495e',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'white',
        minHeight: 120, 
        fontSize: 16,
    },
    listSection: {
        flex: 1, 
    },
    listHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        padding: 15,
        backgroundColor: '#ecf0f1',
    },
    reportItem: {
        backgroundColor: 'white',
        padding: 15,
        marginHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    reportHeader: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 5,
        color: '#3498db',
    },
    reportDate: {
        fontSize: 12,
        fontWeight: 'normal',
        color: '#7f8c8d',
    },
    reportContent: {
        fontSize: 15,
        lineHeight: 22,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#777',
        fontSize: 16,
    },
    uploadButtonContainer: {
        marginTop: 10,
        marginBottom: 10,
    }
});

export default ReportScreen;