import '@fontsource/inter/latin-700.css';
import './style.css';
import { createDotExperience } from './createDotExperience';

const container = document.querySelector<HTMLElement>('#dot');
if (!container) throw new Error('Missing character container');
const experience = createDotExperience(container);
if (import.meta.hot) import.meta.hot.dispose(() => experience.dispose());
