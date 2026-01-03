
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  const err = "CRITICAL: Root element #root not found in document.";
  console.error(err);
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">${err}</div>`;
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("React Render Error:", err);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">Failed to render React app. Check console for details.</div>`;
  }
}
