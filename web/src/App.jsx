import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard'; // Muss noch erstellt werden

// Hilfskomponente zum Schutz der Routen
const ProtectedRoute = ({ children, allowedRole }) => {
    const token = localStorage.getItem('jwtToken');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== allowedRole) {
        // Leitet unbefugte Benutzer zur Login-Seite um
        return <Navigate to="/login" replace />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Geschützte Route für Verwaltung */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRole="verwaltung">
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                
                {/* Standard-Umleitung */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;