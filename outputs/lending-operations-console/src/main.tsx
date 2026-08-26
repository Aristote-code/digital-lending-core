import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// Applied at boot so routes rendered outside the app shell (login, HR verification) honour the theme too.
document.documentElement.dataset.theme = localStorage.getItem("loc-theme") === "dark" ? "dark" : "light";

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
