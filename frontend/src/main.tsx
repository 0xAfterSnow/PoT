import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { PoTProvider } from './context/PoTContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PoTProvider>
          <App />
        </PoTProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
