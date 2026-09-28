import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against third-party widget telemetry/status reports or cross-origin Script error logging to console.error
if (typeof window !== 'undefined') {
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const isWidgetLog = args.some(arg => {
      if (typeof arg === 'string') {
        return arg.includes('[Tawk') || arg.includes('tawk.to') || arg.includes('Script error');
      }
      if (arg && typeof arg === 'object' && 'message' in arg && typeof (arg as {message: unknown}).message === 'string') {
        const msg = (arg as {message: string}).message;
        return msg.includes('[Tawk') || msg.includes('tawk.to') || msg.includes('Script error');
      }
      return false;
    });

    if (isWidgetLog) {
      return;
    }
    origConsoleError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

