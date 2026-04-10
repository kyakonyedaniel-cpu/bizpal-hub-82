import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed, app works fine without it
    });
  });
}

// Capture PWA install prompt for later use
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
});

createRoot(document.getElementById("root")!).render(<App />);
