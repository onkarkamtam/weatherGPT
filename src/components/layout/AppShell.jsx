/**
 * AppShell — Mobile-first app container.
 * Centers content on desktop, full-height on mobile.
 * 
 * @param {Object} props
 * @param {boolean} [props.expanded=false] - If true, uses wider layout for sidebar + chat
 * @param {React.ReactNode} props.children
 */
export default function AppShell({ children, expanded = false }) {
  if (expanded) {
    // Expanded layout for ChatScreen with sidebar
    return (
      <div className="min-h-dvh flex flex-col md:flex-row items-center justify-center bg-slate-100">
        <div className="w-full md:max-w-7xl flex flex-col md:flex-row h-dvh md:h-[90vh] bg-surface md:shadow-2xl md:rounded-lg overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  // Original mobile-first layout for WelcomeScreen and AuthScreen
  return (
    <div className="min-h-dvh flex flex-col items-center bg-slate-100 md:justify-center md:py-6">
      {/* Mobile-width container, elevated on desktop */}
      <div className="w-full md:max-w-md md:rounded-3xl md:shadow-2xl md:overflow-hidden flex flex-col min-h-dvh md:min-h-0 md:h-[780px] bg-surface">
        {children}
      </div>
    </div>
  )
}
