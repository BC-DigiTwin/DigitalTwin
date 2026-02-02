// src/main.tsx
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>  <-- UNCOMMENT TO TURN STRICT MODE ON AT WEEK 10 FOR DEBUGGING
  <App />
  // </React.StrictMode>
)