import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initWebContainerAuth, getBrowserInfo } from './services/webcontainer/init'

// Initialize WebContainer authentication
// initWebContainerAuth();

// Log browser compatibility info
// const browserInfo = getBrowserInfo();
// console.log(`[Browser] ${browserInfo.name} - ${browserInfo.message}`);

createRoot(document.getElementById('root')).render(
  <App />
)
