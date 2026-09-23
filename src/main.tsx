import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against benign WebSocket / HMR disconnection rejections in sandboxed preview iframe
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = (reason && (reason.message || reason.description || String(reason))) || '';
    if (typeof msg === 'string' && (msg.includes('WebSocket') || msg.includes('websocket'))) {
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.message || '');
    if (msg.includes('WebSocket') || msg.includes('websocket')) {
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
