import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are bundled locally; no external font requests at runtime.
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/heebo/400.css';
import '@fontsource/heebo/700.css';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
