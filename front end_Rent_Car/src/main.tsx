
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { startWebVitals } from "./app/monitoring/webVitals";
  import "./styles/index.css";

  // Demarre AVANT le rendu : les mesures d'affichage se relevent pendant que
  // la page se construit. Les brancher apres coup manquerait precisement ce
  // qu'elles servent a mesurer.
  startWebVitals();

  createRoot(document.getElementById("root")!).render(<App />);
  