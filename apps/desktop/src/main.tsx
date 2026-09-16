/**
 * @title ReNonce frontend bootstrap
 * @notice Mounts the root App component into #root under React StrictMode,
 * wrapped in the theme provider and with global fonts loaded.
 * @dev Global CSS import order: fonts.css first, then App.css (via App).
 */
import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/fonts.css";
import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
