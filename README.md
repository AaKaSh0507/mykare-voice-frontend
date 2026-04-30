# Mykare Voice AI — Frontend

A production-grade React frontend for the Mykare Voice AI healthcare agent. This application lets patients talk to an AI receptionist directly in their browser using real-time voice powered by LiveKit. It connects to the `mykare-voice-backend` API for session management, appointment handling, and call summarisation.

---

## Prerequisites

| Requirement | Version |
|---|---|
| **Node.js** | 18+ |
| **npm** | 9+ (ships with Node 18) |
| **Backend** | `mykare-voice-backend` must be running at `http://localhost:8000` |

---

## Local Setup

```bash
# 1. Clone the repository
git clone <repo-url> && cd mykare-voice-frontend

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env

# 4. (Optional) Edit .env to set VITE_LIVEKIT_URL if using a remote LiveKit server

# 5. Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Environment Variables

All variables **must** be prefixed with `VITE_` for Vite to expose them to the browser.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_BACKEND_URL` | No | `http://localhost:8000` | URL of the mykare-voice-backend API server. In development the Vite proxy at `/api` is used as a fallback. |
| `VITE_LIVEKIT_URL` | No | *(returned by backend)* | URL of the LiveKit server for real-time audio/video. If left empty, the URL returned by the backend's `/token` endpoint is used. |

---

## Project Structure

```
mykare-voice-frontend/
├── .env.example            Environment variable template
├── .gitignore              Git ignore rules
├── index.html              HTML entry point (Vite SPA)
├── vite.config.js          Vite config with /api proxy
├── package.json            Dependencies & scripts
├── README.md               This file
└── src/
    ├── main.jsx            React entry point — renders <App />
    ├── App.jsx             Top-level component with health badge
    ├── api.js              Axios-based API layer (all backend calls)
    ├── index.css           Global CSS reset & base styles
    ├── components/
    │   ├── AvatarDisplay.jsx   Visual avatar for the AI agent
    │   ├── CallControls.jsx    Start / mute / end call buttons
    │   ├── CallSummary.jsx     Post-call summary view
    │   └── ToolCallPanel.jsx   Real-time tool call display
    └── hooks/
        └── useLiveKit.js       Custom hook for LiveKit room management
```

---

## Components

| Component | Description |
|---|---|
| **App** | Top-level layout. Renders the landing screen and health status badge. Will orchestrate all child components. |
| **AvatarDisplay** | Animated visual representation of the AI voice agent. Shows speaking state. |
| **CallControls** | Buttons for starting a call, toggling mute, and hanging up. Manages call lifecycle. |
| **CallSummary** | Displays the post-call summary including appointment details and transcript. |
| **ToolCallPanel** | Live feed of tool calls (e.g. appointment lookups) the AI agent makes during the conversation. |

---

## Custom Hooks

| Hook | Description |
|---|---|
| **useLiveKit** | Manages LiveKit room connection, token acquisition, and audio track state. |

---

## API Module (`src/api.js`)

Single source of truth for all backend communication. Exports:

| Function | Endpoint | Description |
|---|---|---|
| `checkHealth()` | `GET /health` | Backend health check (never throws) |
| `getToken(name, room)` | `POST /token` | Get a LiveKit token |
| `startSession(id, phone)` | `POST /session/start` | Start a new call session |
| `getAppointments(phone)` | `GET /appointments/{phone}` | Fetch patient appointments |
| `getSummary(sessionId)` | `GET /summary/{sessionId}` | Get call summary |
| `pollSummary(sessionId, opts)` | *(polling wrapper)* | Retry `getSummary` until ready |

---

## Production Build

```bash
npm run build
```

Output is written to the `dist/` directory. Serve with any static file server.

---

## License

Private — internal use only.
