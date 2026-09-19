/**
 * ConversationSidebar - Displays conversation history
 * 
 * Shows saved conversations, allows switching between them,
 * creating new conversations, and deleting old ones.
 * Includes user profile section with logout.
 */
import { MessageSquarePlus, Trash2, Loader2, AlertCircle, LogOut, User } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function ConversationSidebar({ 
  conversations, 
  activeId, 
  loading,
  error,
  onSelect, 
  onNewChat,
  onDelete
}) {
  const [deletingId, setDeletingId] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleDelete = async (e, id) => {
    e.stopPropagation() // Don't trigger conversation selection
    
    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return
    }

    try {
      setDeletingId(id)
      await onDelete(id)
    } catch (err) {
      alert('Failed to delete conversation: ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) {
      return
    }

    setLoggingOut(true)

    try {
      const { error } = await signOut()
      
      if (error) {
        console.error('Logout error:', error)
        alert('Failed to log out. Please try again.')
        setLoggingOut(false)
        return
      }

      // Clear any session-specific state
      // Note: We don't clear all localStorage to preserve location/preferences
      try {
        sessionStorage.removeItem('wgpt_location')
      } catch (e) {
        console.warn('Failed to clear session storage:', e)
      }

      // Navigate to auth screen
      navigate('/auth', { replace: true })
    } catch (err) {
      console.error('Unexpected logout error:', err)
      alert('An unexpected error occurred. Please try again.')
      setLoggingOut(false)
    }
  }

  return (
    <div className="hidden md:flex w-64 bg-slate-50 border-r border-slate-200 flex-col h-full shrink-0">
      {/* Header with New Chat button */}
      <div className="p-4 border-b border-slate-200 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors"
          title="Start a new conversation"
        >
          <MessageSquarePlus size={18} />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 text-slate-500">
            <Loader2 size={24} className="animate-spin mb-2" />
            <p className="text-sm">Loading history...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center p-4 text-red-600">
            <AlertCircle size={24} className="mb-2" />
            <p className="text-xs text-center">{error}</p>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-slate-400 text-center">
            <MessageSquarePlus size={32} className="mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start chatting to create history</p>
          </div>
        )}

        {!loading && conversations.length > 0 && (
          <div className="py-2">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`
                  group relative px-4 py-3 border-b border-slate-100 cursor-pointer
                  hover:bg-slate-100 transition-colors
                  ${activeId === conv.id ? 'bg-slate-200 border-l-4 border-l-brand' : ''}
                `}
                onClick={() => onSelect(conv.id)}
                title={conv.title}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-700 truncate">
                      {conv.title || 'Untitled conversation'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatRelativeTime(conv.updated_at || conv.created_at)}
                    </div>
                  </div>

                  {/* Delete button - show on hover or for active conversation */}
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className={`
                      p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600
                      transition-all shrink-0
                      ${activeId === conv.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    `}
                    title="Delete conversation"
                  >
                    {deletingId === conv.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Profile Section with Logout */}
      {user && (
        <div className="shrink-0 border-t border-slate-200 p-3 bg-slate-100">
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white shrink-0">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-700 truncate">
                {user.email || 'User'}
              </div>
              <div className="text-xs text-slate-500">
                Signed in
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sign out of WeatherGPT"
          >
            {loggingOut ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogOut size={16} />
                <span>Log Out</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  // Older than a week - show date
  return date.toLocaleDateString('en-IN', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}
