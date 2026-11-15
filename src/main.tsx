import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { ErrorFallback } from './components/ErrorFallback';
import './index.css';

// Only report errors from the real deployed site, never from local dev —
// a dev server throwing errors while someone is actively coding isn't a
// production incident and would just add noise to the real signal.
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'https://cf1e6a5a625c0d32ab9138e1ff4efada@o4512032831045632.ingest.de.sentry.io/4512032839172176',
    environment: import.meta.env.MODE,
    // Deliberately no session replay / performance tracing enabled here —
    // those add real cost (Sentry quota) and capture more of what a user
    // was doing, which isn't needed just to catch and fix real bugs.
    // Add them later as a deliberate choice, not a default.
    tracesSampleRate: 0,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
