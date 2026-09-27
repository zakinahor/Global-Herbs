import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against third-party widget telemetry/status reports logging to console.error
if (typeof window !== 'undefined') {
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const isWidgetLog = args.some(arg => {
      if (typeof arg === 'string') {
        return arg.includes('[Tawk') || arg.includes('tawk.to');
      }
      if (arg && typeof arg === 'object' && 'message' in arg && typeof (arg as {message: unknown}).message === 'string') {
        return (arg as {message: string}).message.includes('[Tawk') || (arg as {message: string}).message.includes('tawk.to');
      }
      return false;
    });

    if (isWidgetLog) {
      if (typeof console.debug === 'function') {
        console.debug(...args);
      }
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

