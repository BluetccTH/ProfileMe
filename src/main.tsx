import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Live2D/Cubism owns native WebAssembly/WebGL resources. React StrictMode
// intentionally mounts effects twice in development, which can race a
// Cubism model load and make the native core receive a stale/invalid buffer.
// Keep the production tree single-mounted so Live2D has one owner of its
// native resources at a time.
createRoot(document.getElementById('root')!).render(<App />);
