import React from "react";
import ReactDOM from "react-dom/client";
import { initBolt } from "../lib/utils/bolt";
import "../index.scss";
import { App } from "./App";
import { installMockHost } from "./dev/mockHost";
import { UIGallery } from "./dev/UIGallery";

// Dev-only: lets the plain-browser `npm run dev` server answer host calls with sample data
// instead of every evalTS() call rejecting. import.meta.env.DEV is statically false in
// production builds, so this branch (and everything it imports) is dead-code eliminated from
// the packaged extension.
if (import.meta.env.DEV) {
  installMockHost();
}

initBolt();

// Hidden dev-only UI Gallery: `npm run dev` then open the panel URL with ?gallery=1 to see
// every ui/ and features/ component in one place, for visual QA without After Effects running.
const showGallery = import.meta.env.DEV && new URLSearchParams(location.search).has("gallery");

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>{showGallery ? <UIGallery /> : <App />}</React.StrictMode>
);
