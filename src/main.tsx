import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite WebSocket connection rejections in iframe preview environments
window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.message || event.reason || '');
  if (
    reasonStr.includes('WebSocket') ||
    reasonStr.includes('websocket') ||
    reasonStr.includes('failed to connect to websocket')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = String(event.message || '');
  if (msg.includes('WebSocket') || msg.includes('websocket')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
