import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { initServiceWorker } from './pwa/update';
import { restorePractice } from './ui/launch';
import './ui/tokens.css';
import './ui/base.css';
import './ui/glass.css';
import './ui/screens.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// A practice interrupted by a reload or by iOS closing the app comes back first.
restorePractice();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initServiceWorker();
