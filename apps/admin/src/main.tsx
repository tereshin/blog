import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AdminApp } from './admin-app';
import './styles.css';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <AdminApp />
      </BrowserRouter>
    </StrictMode>,
  );
}
