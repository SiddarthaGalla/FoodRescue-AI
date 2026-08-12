import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  publishableKey ? (
    <ClerkProvider publishableKey={publishableKey}>
      {app}
    </ClerkProvider>
  ) : (
    app
  ),
)
