/**
 * ProtectedRoute - Redirects to auth if user is not logged in
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Spinner from '@/components/ui/Spinner'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <Spinner />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return children
}

