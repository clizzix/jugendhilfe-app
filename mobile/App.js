import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native'; // Neu: Für den Ladezustand
import AsyncStorage from '@react-native-async-storage/async-storage'; // Neu: Import
import LoginScreen from './screens/LoginScreen';
import FachkraftDashboard from './screens/FachkraftDashboard'; 
import ReportScreen from './screens/ReportScreen';
import { AuthProvider } from './context/AuthContext';

const Stack = createNativeStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    // Asynchrone Funktion, um den gespeicherten JWT-Token zu prüfen
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('jwtToken');
        
        // WICHTIG: Prüfen Sie, ob der Token existiert. 
        // AsyncStorage gibt NULL (oder String) zurück, NIE einen logischen Boolean.
        if (token) {
          // Token gefunden -> Benutzer ist angemeldet
          setInitialRoute('Dashboard');
        } else {
          // Kein Token gefunden -> Login
          setInitialRoute('Login');
        }
      } catch (e) {
        console.error("Fehler beim Laden des Tokens:", e);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  if (isLoading) {
    // Zeigt einen Ladebildschirm, während das Token geprüft wird
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={FachkraftDashboard} options={{ title: 'Meine Klienten' }} />
        <Stack.Screen 
                    name="Report" 
                    component={ReportScreen} 
                    options={{ title: 'Bericht erstellen' }} 
                />
      </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;