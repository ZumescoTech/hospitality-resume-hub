import { useResumeStore } from '@/lib/resume-store'
import { LogoLockup } from '@/components/ui/LogoLockup'

export function AppHeader() {
  const { syncing, resumeId } = useResumeStore()

  const dotColour = syncing ? '#f0a500' : '#4cd6a0'
  const label = syncing ? 'Saving…' : (resumeId ? 'Saved to cloud' : 'Draft saved')

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--brand)',
      color: 'white',
      padding: '0 16px',
      height: 'var(--header-h)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <LogoLockup variant="light" height={28} showWordmark={true} />
      <div style={{
        fontSize: '11px',
        color: 'rgba(255,255,255,0.75)',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: dotColour,
          flexShrink: 0,
          transition: 'background 300ms ease',
        }} />
        <span>{label}</span>
      </div>
    </header>
  )
}
