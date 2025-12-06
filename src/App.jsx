import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChatLayout from './pages/ChatLayout';
import UserDetailsPage from './pages/UserDetailsPage';
import GroupDetailsPage from './pages/GroupDetailsPage';
import { useEffect } from 'react';
import { requestNotificationPermission } from './services/notificationService';
import { initPresence } from './services/presenceService';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      requestNotificationPermission(currentUser.uid);
      initPresence(currentUser);
    }
  }, [currentUser]);

  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <ChatLayout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/:uid"
              element={
                <ProtectedRoute>
                  <UserDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/group/:groupId"
              element={
                <ProtectedRoute>
                  <GroupDetailsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
