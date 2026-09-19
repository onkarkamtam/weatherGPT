import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import AuthScreen from '@/screens/AuthScreen'
import WelcomeScreen from '@/screens/WelcomeScreen'
import ChatScreen from '@/screens/ChatScreen'

/**
 * App — root router.
 * Phase 8: Protected routes enabled - authentication required for weather features
 * Unauthenticated users redirected to /auth
 * All conversations/messages persist to Supabase for authenticated users
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        
        {/* Protected routes - require authentication */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <WelcomeScreen />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatScreen />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
