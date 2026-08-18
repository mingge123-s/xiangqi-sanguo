import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

document.documentElement.style.setProperty(
  '--rice-paper-bg-url',
  `url("${import.meta.env.BASE_URL}rice-paper-bg.webp")`,
);
document.documentElement.style.setProperty(
  '--ink-wash-url',
  `url("${import.meta.env.BASE_URL}ink-wash.svg")`,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
