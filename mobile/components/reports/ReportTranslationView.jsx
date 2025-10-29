import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    ActivityIndicator, 
    ScrollView, 
    TouchableOpacity, 
    StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Toast from 'react-native-toast-message'; 
import { BASE_URL } from '../../utils/api'; 
// 💡 NEUER IMPORT: Den AuthContext nutzen
import { useAuth } from '../../context/AuthContext'; 


// Der Endpunkt zur Übersetzung eines bestimmten Berichts
const TRANSLATE_URL = `${BASE_URL}/api/reports/translate`; 

/**
 * Zeigt den originalen und den übersetzten Text eines Berichts an.
 * @param {string} reportId Die ID des Berichts, der übersetzt werden soll.
 * @param {string} clientLanguage Die vom Klienten definierte Zielsprache (z.B. 'TR', 'EN-US').
 */
const ReportTranslationView = ({ reportId, clientLanguage }) => {
  
  // 💡 KORREKTUR: Das Token direkt aus dem AuthContext abrufen
  const { token } = useAuth(); 
  
  const [translationData, setTranslationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewOriginal, setViewOriginal] = useState(true); // Schaltet zwischen Original und Übersetzung um

  const fetchTranslation = async () => {
    // 💡 SICHERHEITSPRÜFUNG: Nur fortfahren, wenn Report ID und Token vorhanden sind
    if (!reportId || !token) { 
        if (!token) {
            setError("Authentifizierungstoken fehlt. Bitte erneut anmelden.");
        }
        return;
    }

    setIsLoading(true);
    setError(null);
    setTranslationData(null);

    try {
      // 💡 KRITISCHE KORREKTUR: Fügen Sie den Authorization Header hinzu
      const response = await axios.get(`${TRANSLATE_URL}/${reportId}`, {
          headers: {
              Authorization: `Bearer ${token}`,
          },
      });
      
      setTranslationData(response.data);
      setViewOriginal(false); 
      
      Toast.show({
        type: 'success',
        text1: 'Übersetzung geladen',
        text2: `Zielsprache: ${response.data.targetLanguage}`,
      });
      
    } catch (err) {
      console.error('Fehler beim Abrufen der Übersetzung:', err.response?.data || err.message);
      
      const msg = err.response?.data?.msg || 'Fehler beim Laden der Übersetzung. Ist der Text extrahierbar?';
      setError(msg);
      
      Toast.show({
        type: 'error',
        text1: 'Übersetzungsfehler',
        text2: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslation();
  }, [reportId, token]); // 💡 Token als Abhängigkeit hinzugefügt


  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Übersetzung wird vorbereitet...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
        <Text style={styles.errorText}>Fehler: {error}</Text>
      </View>
    );
  }

  if (!translationData || (!translationData.originalText && !translationData.translatedText)) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Kein Text zur Anzeige oder Übersetzung verfügbar.</Text>
      </View>
    );
  }

  const currentText = viewOriginal 
    ? translationData.originalText 
    : translationData.translatedText;
    
  const currentLanguageCode = viewOriginal ? 'DE' : translationData.targetLanguage || clientLanguage;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {viewOriginal ? 'Originalbericht (DE)' : `Übersetzung (${currentLanguageCode})`}
        </Text>
        {/* Toggle Button */}
        <TouchableOpacity 
          onPress={() => setViewOriginal(!viewOriginal)} 
          style={styles.toggleButton}
        >
          <Ionicons 
            name={viewOriginal ? "language-outline" : "chevron-back-outline"} 
            size={18} 
            color="#4F46E5" 
          />
          <Text style={styles.toggleText}>
            {viewOriginal ? `Zu ${currentLanguageCode}` : 'Zum Original'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.textContainer}>
        <Text style={styles.reportText}>{currentText}</Text>
      </ScrollView>
    </View>
  );
};

// ... (Styles bleiben unverändert) ...
const styles = StyleSheet.create({
  container: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  toggleText: {
    marginLeft: 5,
    color: '#4F46E5',
    fontWeight: '500',
    fontSize: 14,
  },
  textContainer: {
    maxHeight: 250, 
    minHeight: 150,
  },
  reportText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4F46E5',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  }
});

export default ReportTranslationView;
