/** Dependency-free fallback: a crashed React tree can't rely on the app's own components or styles. */
export function ErrorFallback() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Something went wrong</h1>
      <p style={{ color: '#64748b', maxWidth: '28rem' }}>
        We've been notified and are looking into it. Please try reloading the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem', background: '#0176d3', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
      >
        Reload page
      </button>
    </div>
  );
}
