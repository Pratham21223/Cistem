import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@xyflow/react/dist/style.css";
import "./globals.css";

import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { initializeSession } from "@/services/session";

// Composition root: boot the guest session before the workspace takes over.
void initializeSession();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(<App />);
