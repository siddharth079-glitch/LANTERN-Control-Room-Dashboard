# LANTERN Control Room Dashboard

LANTERN is a disaster SOS coordination and command-and-control prototype. This repository contains the web control-room interface and its Node.js API/WebSocket backend.

> Prototype note: confirm whether displayed incidents, teams, and system status are simulated or live before presenting them as real operational data. Do not commit credentials, personal data, or real emergency reports.

## Stack

- Frontend: React, Vite, Leaflet, Lucide
- Backend: Node.js, Express, WebSockets
- Package manager: npm

## Requirements

- Node.js compatible with the versions required by the installed Vite dependencies
- npm

## Install

From the repository root:

```bash
npm install
```

## Run locally

In terminal 1, start the backend:

```bash
npm run dev:server
```

In terminal 2, start the frontend:

```bash
npm run dev:client
```

Vite normally serves the frontend at `http://localhost:5173`; the backend defaults to `http://localhost:3001`.

## Production build

```bash
npm run build
npm start
```

The server serves `client/dist` when the frontend build exists. Set `PORT` in the deployment environment if needed. Keep real secrets in environment variables and out of Git.
