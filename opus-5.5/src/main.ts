import "@fontsource/inter/700.css";
import "./style.css";
import { createDotExperience } from "./createDotExperience";

const container = document.getElementById("stage");
if (!container) throw new Error("Missing #stage container");

const experience = createDotExperience(container);

if (import.meta.env.DEV) {
  (window as unknown as { dotExperience: typeof experience }).dotExperience = experience;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => experience.dispose());
}
