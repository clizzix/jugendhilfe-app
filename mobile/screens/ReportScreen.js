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
    RefreshControl,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform, 
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { createReport, getClientReports, uploadDocument, getDownloadLink, deleteReport, updateReport } from '../utils/api.js';
import * as Linking from 'expo-linking'; 
import Toast from 'react-native-toast-message'; 
import { useAuth } from '../context/AuthContext'; 


// --- Komponente für die Anzeige eines Berichts ---
const ReportItem = ({ 
    report, 
    isEditing, 
    editText, 
    setEditText, 
    setEditingReportId,
    onEditStart, 
    onEditSave, 
    onDelete,
    currentUserId,
    currentUserRole,
}) => {
    const [isDownloading, setIsDownloading] = useState(false);

    // Hilfsvariablen
    const isCreator = report.createdBy?._id?.toString() === currentUserId?.toString(); 
    const isLocked = report.isLocked;
    const isTextReport = report.type !== 'DOCUMENT';

    const isAdminOrVerwaltung = currentUserRole === 'admin' || currentUserRole === 'verwaltung';
    const canModify = !isLocked && (isCreator || isAdminOrVerwaltung);

    // Formatierung des Datums
    const formattedDate = new Date(report.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleDownload = async () => {
        if (!report.fileMetadata?.storagePath) return;
        setIsDownloading(true);
        try {
            const response = await getDownloadLink(report._id);
            const { downloadUrl, fileName } = response.data;
            await Linking.openURL(downloadUrl); 
            Toast.show({ type: 'info', text1: 'Download gestartet', text2: `Öffne Dokument: ${fileName}` });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Fehler', text2: 'Konnte Download-Link nicht abrufen.' });
            console.error(error.response?.data?.msg || error.message);
        } finally {
            setIsDownloading(false);
        }
    };
    
    return (
        <TouchableOpacity 
            onPress={isTextReport || isEditing ? null : handleDownload} 
            style={styles.reportItem}
            activeOpacity={isEditing ? 1 : 0.6}
        >
            <Text style={styles.reportHeader}>
                Bericht von: {report.createdBy?.username || 'Unbekannt'}
                <Text style={styles.reportDate}> ({formattedDate})</Text>
            </Text>
            
            {/* --- BEARBEITUNGSANSICHT (EDITING MODE) --- */}
            {isEditing ? (
                <>
                    <TextInput
                        style={styles.editInput} 
                        multiline
                        value={editText}
                        onChangeText={setEditText}
                        textAlignVertical="top"
                    />
                    <View style={styles.actionRow}>
                        <Button title="Speichern" onPress={onEditSave} color="#2ecc71" />
                        <Button title="Abbrechen" onPress={() => setEditingReportId(null)} color="#7f8c8d" />
                    </View>
                </>
            ) : (
                /* --- LESEANSICHT (READ MODE) --- */
                <>
                    {/* Inhalt anzeigen */}
                    {report.type === 'DOCUMENT' ? (
                        <Text style={styles.documentLink}>
                            {isDownloading ? "Dokument wird geöffnet..." : `📁 ${report.fileMetadata?.originalName || 'Dokument'} (Zum Öffnen tippen)`}
                        </Text>
                    ) : (
                        <Text style={styles.reportContent}>{report.reportText || report.content}</Text>
                    )}

                    {/* AKTIONEN (Buttons) */}
                    <View style={styles.actionRow}>
                        
                        {/* 1. BEARBEITEN (Nur für Text, wenn canModify wahr ist) */}
                        {isTextReport && canModify && (
                            <Button 
                                title="Bearbeiten" 
                                onPress={() => onEditStart(report)} 
                                color="#3498db"
                            />
                        )}

                        {/* 2. LÖSCHEN (Wenn canModify wahr ist) */}
                        {canModify && (
                            <Button 
                                title="Löschen" 
                                onPress={() => onDelete(report._id)} 
                                color="#e74c3c" // Rot für Löschen
                            />
                        )}
                        
                        {/* 3. DOKUMENT ÖFFNEN BUTTON */}
                        {!isTextReport && (
                             <Button title="Öffnen" onPress={handleDownload} color="#3498db" />
                        )}

                        {/* 4. GESPERRT-STATUS */}
                        {isLocked && <Text style={styles.lockedText}> [GESPERRT] </Text>}
                    </View>
                </>
            )}
        </TouchableOpacity>
    );
};
// --------------------------------------------------

const ReportScreen = () => {
    const { user, isLoading: authLoading } = useAuth();
    const currentUserId = user?._id || user?.id;
    const currentUserRole = user?.role;

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
    const [editingReportId, setEditingReportId] = useState(null);
    const [editText, setEditText] = useState('');


    // --- Funktion zum Abrufen der Berichte (US6) ---
    const fetchReports = useCallback(async () => {
        if (!isRefreshing) setIsLoadingReports(true);
        
        try {
            const response = await getClientReports(clientId); 
            setReports(response.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Fehler', text2: 'Konnte Berichte nicht laden.' });
            console.error(error.response?.data?.msg || error.message);
        } finally {
            setIsLoadingReports(false);
            setIsRefreshing(false);
        }
    }, [clientId, isRefreshing]); 


    // --- Hook für den Ladevorgang ---
    useFocusEffect(
        React.useCallback(() => {
            // 💡 KORRIGIERT: fetchReports nur starten, wenn Authentifizierungsdaten geladen sind
            if (!authLoading) {
                fetchReports();
            }
        }, [fetchReports, authLoading]) // Abhängigkeit von authLoading hinzugefügt
    );
    
    
    // Pull-to-Refresh Handler
    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchReports();
    }, [fetchReports]);


    // --- Formular-Handler (US5) ---
    const handleSubmit = async () => {
        if (!reportText.trim()) {
            Toast.show({ type: 'error', text1: 'Fehler', text2: 'Bitte geben Sie Text für den Bericht ein.' });
            return;
        }

        setIsSaving(true);

        try {
            await createReport(clientId, reportText);
            
            Toast.show({ type: 'success', text1: 'Erfolg', text2: 'Bericht wurde erfolgreich gespeichert.' });
            setReportText(''); 
            fetchReports(); 

        } catch (error) {
            Toast.show({ type: 'error', text1: 'Fehler', text2: error.response?.data?.msg || 'Bericht konnte nicht gespeichert werden.' });
        } finally {
            setIsSaving(false);
        }
    };

    // ... (handleDocumentUpload, handleDelete, handleEditSave, startEditing bleiben unverändert)

    // Dokument-Upload Handler
    const handleDocumentUpload = async () => {
        setIsUploading(true);

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*', 
                copyToCacheDirectory: true, 
            });

            if (result.canceled || !result.assets || result.assets.length === 0) { 
                setIsUploading(false);
                return;
            }

            const file = result.assets[0];

            await uploadDocument(clientId, file);
            
            Toast.show({ type: 'success', text1: 'Erfolg', text2: `Dokument "${file.name}" wurde erfolgreich hochgeladen.` });
            fetchReports(); 

        } catch (error) {
            console.error('Fehler beim Dokumenten-Upload:', error);
            Toast.show({ type: 'error', text1: 'Fehler', text2: error.response?.data?.msg || 'Dokument konnte nicht hochgeladen werden.' });
        } finally {
            setIsUploading(false);
        }
    };

    // --- LÖSCH-HANDLER (US8) ---
    const handleDelete = async (reportId) => {
        Alert.alert(
            'Bericht löschen',
            'Sind Sie sicher, dass Sie diesen Bericht endgültig löschen möchten?',
            [
                { text: 'Abbrechen', style: 'cancel' },
                { 
                    text: 'Löschen', 
                    style: 'destructive', 
                    onPress: async () => {
                        setIsLoadingReports(true);
                        try {
                            await deleteReport(reportId);
                            fetchReports(); 
                            Toast.show({ type: 'success', text1: 'Bericht gelöscht' });
                        } catch (err) {
                            console.error("Löschfehler:", err.response?.data || err);
                            Toast.show({ type: 'error', text1: 'Löschen fehlgeschlagen', text2: err.response?.data?.msg || 'Serverfehler.' });
                        } finally {
                            setIsLoadingReports(false);
                        }
                    }
                },
            ]
        );
    };

    // --- BEARBEITUNGS-HANDLER (US7) ---
    const handleEditSave = async () => {
        if (!editingReportId || !editText.trim()) return;

        setIsLoadingReports(true);
        try {
            await updateReport(editingReportId, editText);
        
            setEditingReportId(null);
            setEditText('');
            fetchReports(); 
            Toast.show({ type: 'success', text1: 'Bericht aktualisiert' });

        } catch (err) {
            console.error("Update Fehler:", err.response?.data || err);
            Toast.show({ type: 'error', text1: 'Update fehlgeschlagen', text2: err.response?.data?.msg || 'Serverfehler.' });
        } finally {
            setIsLoadingReports(false);
        }
    };

    // Startet den Bearbeitungsmodus für einen Bericht
    const startEditing = (report) => {
        const initialText = report.reportText || report.content || '';
        setEditText(initialText);
        setEditingReportId(report._id);
    };

    // 💡 NEUE FUNKTION: Das Formular als Header-Komponente definieren
    const renderHeader = () => (
        // Der Inhalt des alten ScrollViews
        <View style={styles.formSection}> 
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
            
            <View style={styles.uploadButtonContainer}>
                <Button
                    title={isUploading ? "Lade Dokument hoch..." : "Dokument hochladen (US4)"}
                    onPress={handleDocumentUpload}
                    disabled={isUploading || isSaving}
                    color="#3498db"
                />
            </View>
        </View>
    );

    if (authLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={{marginTop: 10, color: '#555'}}>Authentifizierung wird geprüft...</Text>
            </View>
        );
    }
    
    // Finaler Return Block: Übergibt alle notwendigen Handler und Zustände
return (
        // 💡 KORREKTUR: KeyboardAvoidingView ist der Hauptcontainer.
        <KeyboardAvoidingView 
            style={styles.mainContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Optional: Passen Sie dies an Ihren Header an (z.B. 90 für iOS, falls ein Nav-Header vorhanden ist)
        >
            {/* --- Berichts-Historie (US6) wird zur Hauptansicht --- */}
            <Text style={styles.listHeader}>Berichts-Historie</Text>

            {isLoadingReports && !isRefreshing && reports.length === 0 ? (
                 <ActivityIndicator size="large" color="#3498db" style={{marginTop: 20}} />
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={item => item._id.toString()}
                    
                    // 💡 HINZUFÜGUNG: Formular als nicht-scrollender Header.
                    ListHeaderComponent={renderHeader} 
                    
                    renderItem={({ item }) => (
                        <ReportItem 
                            report={item} 
                            isEditing={editingReportId === item._id}
                            editText={editText}
                            setEditText={setEditText}
                            setEditingReportId={setEditingReportId}

                            onEditStart={startEditing}
                            onEditSave={handleEditSave}
                            onDelete={handleDelete}

                            currentUserId={currentUserId}
                            currentUserRole={currentUserRole}
                        />
                    )}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#3498db']} />
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Bisher keine Berichte vorhanden.</Text>
                    }
                />
            )}
            
            <Toast />
        </KeyboardAvoidingView>
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
    /*
    listSection: {
        flex: 1, 
    },
    */
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
    },
    
    // 💡 NEUE STYLES FÜR BEARBEITUNG
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start', // Links-bündig
        gap: 10, // Abstand zwischen Buttons
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    editInput: { // Style für das Textfeld im Bearbeitungsmodus
        borderWidth: 1,
        borderColor: '#3498db',
        borderRadius: 5,
        padding: 10,
        minHeight: 100,
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
    },
    lockedText: {
        color: 'orange',
        fontWeight: 'bold',
        alignSelf: 'center',
        marginLeft: 'auto', // Schiebt den Text nach rechts
    },
    documentLink: {
        color: '#3498db',
        fontWeight: '600',
        fontSize: 15,
        paddingVertical: 5,
    }
});

export default ReportScreen;