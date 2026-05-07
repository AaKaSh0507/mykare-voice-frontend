# Mykare Voice AI — Frontend
![React 18](https://img.shields.io/badge/React-18-61DAFB) ![Vite](https://img.shields.io/badge/Vite-Build%20Tool-646CFF) ![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC-1f2937) ![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000)

React frontend for TalkRx, a healthcare voice AI agent. Connects patients to an AI receptionist via real-time voice conversation with a live talking avatar.

## Live Demo

🔗 Live App: https://talkrx.vercel.app  
🔗 Backend API: https://mykare-api.fly.dev/health

## Overview

This frontend is a React single-page application built with Vite for fast local iteration and optimized production bundles. It uses the LiveKit browser SDK to manage low-latency, real-time voice sessions with the backend voice pipeline. Tavus CVI is embedded for lip-synced avatar rendering during active calls, with UI fallback behavior handled in the client. During each session, the app visualizes live tool calls and then transitions to a post-call summary screen populated from backend polling.

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Framework | React 18 + Vite | SPA with fast HMR builds |
| Voice | LiveKit Client SDK | WebRTC audio, data channel |
| Avatar | Tavus CVI iframe | Talking avatar video stream |
| HTTP | Axios | Backend API communication |
| Deployment | Vercel | Static hosting + CDN |

## Project Structure

```text
src/
├── App.jsx                  # Root component, layout, state machine
├── api.js                   # All backend API calls, polling logic
├── index.css                # Global styles, CSS design tokens
├── components/
│   ├── AvatarDisplay.jsx    # Tavus iframe + animated fallback
│   ├── CallControls.jsx     # Start/End/Mute buttons + name input
│   ├── ToolCallPanel.jsx    # Real-time agent activity sidebar
│   └── CallSummary.jsx      # Post-call summary screen
└── hooks/
    └── useLiveKit.js        # LiveKit room, mic, audio, events
```

## Key Features

🎤 Voice Conversation  
Browser microphone -> Deepgram STT -> GPT-4o-mini -> Cartesia TTS -> speaker. Full duplex, <3s latency.

👤 Talking Avatar  
Tavus CVI embedded via iframe. Lip-syncs with agent audio in real time. Falls back to animated waveform if Tavus is not configured.

⚙️ Live Tool Call Panel  
Every tool the agent calls (`fetch_slots`, `book_appointment` etc.) appears in real time via LiveKit data channel events. Shows status, message, and timestamp per tool call.

📋 Call Summary  
Auto-generated at end of call. Shows intent, appointments booked, messages exchanged, and timestamp. Polls backend for up to 10 seconds.

## Local Development

Prerequisites:
- Node 18+
- Backend running on port 8000

1. Clone and enter the repo.

```bash
git clone https://github.com/AaKaSh0507/mykare-voice-frontend
cd mykare-voice-frontend
```

2. Install dependencies.

```bash
npm install
```

3. Copy env template and fill in 4 variables.

```bash
cp .env.example .env
```

4. Start local dev server.

```bash
npm run dev
```

5. Open `http://localhost:5173`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_BACKEND_URL` | Yes | Backend API URL |
| `VITE_LIVEKIT_URL` | Yes | LiveKit WSS URL (same as backend) |
| `VITE_TAVUS_API_KEY` | Yes | Tavus API key for avatar |
| `VITE_TAVUS_REPLICA_ID` | Yes | Tavus persona replica ID |

## Component Guide

`AvatarDisplay` renders the Tavus CVI iframe and the visual speaking state in-call. It accepts avatar session URL and connection-state-driven display props from the parent. It also handles the fallback animated view when Tavus is unavailable.

`CallControls` owns user input and primary call actions including start, end, and mute controls. It accepts callback props for lifecycle events and UI state flags for disabled/loading transitions. It is the main interaction surface before and during the call.

`ToolCallPanel` displays streaming tool invocation events received during the session. It accepts a list of normalized tool event objects and renders status, message, and timestamps for each item. It is designed to provide transparent, real-time insight into agent actions.

`CallSummary` renders the post-call result after session completion. It accepts summary payload data and loading/error flags while polling completes. It surfaces final intent, outcome details, and timeline metadata.

`useLiveKit` is the session orchestration hook for room connection, track lifecycle, and event bindings. It accepts configuration and callback inputs needed to initialize and observe LiveKit state transitions. It returns connection state and handlers consumed by `App.jsx` and child components.

## Deployment

Deployed via Vercel. Any push to main branch triggers an automatic redeploy.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod
```

Environment variables must be set in the Vercel dashboard under Project Settings -> Environment Variables.
