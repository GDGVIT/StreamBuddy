import './index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, React.createElement(App, null))
  // Renaming renderer.js to a jsx file is not an option as electron forge config looks specifically for renderer.js
)
