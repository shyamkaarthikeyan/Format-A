import { createRoot } from "react-dom/client";
import AppClient from "./App-client";
import "./index.css";

// Add error handling for production debugging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  root.render(<AppClient />);
  console.log("App rendered successfully");
} catch (error) {
  console.error("Failed to render app:", error);
  // Fallback error display
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to load the application. Please refresh the page.</p>
      <details>
        <summary>Error Details</summary>
        <pre>${error}</pre>
      </details>
    </div>
  `;
}
