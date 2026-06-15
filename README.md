# P2P Web Share

Direct browser-to-browser file transfer with WebRTC data channels, React, Node.js, Express, and Socket.IO.

The signaling server creates rooms and relays WebRTC offer, answer, and ICE messages. It never receives the file payload. File bytes move only across the WebRTC data channel between the sender and receiver browsers.

## Features

- Drag-and-drop file selection with a 50 MB MVP limit.
- Unique one-time share room links.
- Socket.IO signaling for WebRTC offer, answer, and ICE exchange.
- Direct 1-to-1 file transfer over ordered WebRTC data channels.
- SHA-256 verification for every chunk and the final reassembled file.
- Live transfer percentage, verified chunk count, speed, and connection state.
- Graceful peer disconnect notifications.
- Receiver-side automatic download after final hash verification.
- Production server can also serve the built React app.

## Architecture

```text
Sender browser
  | 1. create room
  v
Node.js Socket.IO signaling server
  | 2. relay WebRTC offer/answer/ICE only
  v
Receiver browser

Sender browser <==== encrypted WebRTC data channel ==== Receiver browser
                 file chunks never pass through server
```

## Tech Stack

- Frontend: React + Vite + CSS
- Backend: Node.js + Express + Socket.IO
- P2P: WebRTC RTCPeerConnection + RTCDataChannel
- Integrity: Web Crypto API SHA-256
- File reads: Browser FileReader API

## Project Structure

```text
.
├── client/
│   ├── index.html
│   ├── vite.config.mjs
│   └── src/
│       ├── App.jsx
│       ├── styles.css
│       └── lib/
├── server/
│   └── index.js
├── .env.example
├── package.json
└── README.md
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file if you want to override defaults:

```bash
cp .env.example .env
```

Run the full app:

```bash
npm run dev
```

Open the sender UI:

```text
http://localhost:5173
```

The signaling server runs at:

```text
http://localhost:3001
```

## How to Test a Transfer

1. Open `http://localhost:5173`.
2. Drop a file under 50 MB.
3. Click `Create room`.
4. Copy the invite link.
5. Open the invite link in another browser window, tab, or device.
6. Keep the sender tab open until the receiver auto-downloads the verified file.

## Production Build

Build the React client:

```bash
npm run build
```

Start the Node server:

```bash
npm start
```

When `client/dist` exists, the Express server serves the built frontend and Socket.IO from the same origin.

## Deployment Options

### Single Render/Railway Service

Use one Node service:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: `PORT` is usually supplied by the platform.

This is the simplest deployment because the frontend and signaling server share one origin.

### Split Frontend and Backend

Backend on Render/Railway:

- Build command: `npm install`
- Start command: `npm start`
- Set `CLIENT_ORIGIN` to the deployed frontend URL.

Frontend on Vercel/Netlify:

- Build command: `npm install && npm run build`
- Publish directory: `client/dist`
- Set `VITE_SIGNALING_URL` to the deployed backend URL.

## Security and Limits

- The server stores room metadata only. It does not read, process, or persist file bytes.
- WebRTC data channels are encrypted by the browser transport.
- Each chunk is SHA-256 checked before the receiver accepts it.
- The final assembled Blob is SHA-256 checked before auto-download.
- This MVP enforces a 50 MB limit because chunks are reassembled in browser memory.
- Some strict NATs may require a TURN server. This demo uses a public STUN server only.

## Demo Video Checklist

- Show sender selecting a file and creating a room.
- Show receiver opening the generated link.
- Show signaling, peer, and data channel states moving to connected/open.
- Show transfer progress and speed.
- Show receiver auto-download.
- Mention that the server only relays signaling and stores zero file bytes.
