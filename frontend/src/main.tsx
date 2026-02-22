/**
 * Main entry point for the Logistics Control Tower dashboard application.
 * This file sets up the React application, including routing and global styles.
 * It imports necessary libraries and components, and renders the App component within a BrowserRouter to enable client-side routing.
 * The application is wrapped in React.StrictMode to help identify potential issues during development.
 * Global styles for Leaflet maps, Ant Design components, and custom themes are also imported here to ensure consistent styling across the app.
 * AuthProvider wraps the app to provide authentication context throughout the application.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "leaflet/dist/leaflet.css";
import "./styles/theme.css";
import "./styles/sidebar.css";
import "antd/dist/reset.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);