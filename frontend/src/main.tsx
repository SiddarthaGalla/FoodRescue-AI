import React from 'react'
import ReactDOM from 'react-dom/client'
import { KindeProvider } from '@kinde-oss/kinde-auth-react'
import App from './App'
import './index.css'

// Kinde OAuth config — read at module top so the provider decision is stable
// for the lifetime of the app. When the env vars are missing the app renders
// without KindeProvider and the legacy dev auth (email/OTP/Google) keeps
// working exactly as before.
const kindeDomain = import.meta.env.VITE_KINDE_DOMAIN as string | undefined
const kindeClientId = import.meta.env.VITE_KINDE_CLIENT_ID as string | undefined
const kindeRedirectUri =
  (import.meta.env.VITE_KINDE_REDIRECT_URI as string | undefined) || 'http://localhost:5173'
const kindeLogoutUri =
  (import.meta.env.VITE_KINDE_POST_LOGOUT_REDIRECT_URI as string | undefined) ||
  'http://localhost:5173/login'
const kindeAudience = import.meta.env.VITE_KINDE_AUDIENCE as string | undefined

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Inline condition (not a separate const) so TypeScript narrows
  // kindeDomain/kindeClientId to `string` for the required provider props.
  kindeDomain && kindeClientId ? (
    <KindeProvider
      clientId={kindeClientId}
      domain={kindeDomain}
      redirectUri={kindeRedirectUri}
      logoutUri={kindeLogoutUri}
      {...(kindeAudience ? { audience: kindeAudience } : {})}
    >
      {app}
    </KindeProvider>
  ) : (
    app
  ),
)
