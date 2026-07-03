# IntellMeet - AI-Powered Enterprise Meeting & Collaboration Platform

Built on the MERN Stack with Real-Time Communication and Generative AI, **IntellMeet** is an enterprise-oriented meeting and collaboration platform designed to enhance communication and productivity for modern remote and hybrid teams. 

Beyond standard video conferencing, IntellMeet features an embedded artificial intelligence layer that automatically captures, transcribes, and summarizes meetings, transforming transient conversations into structured, actionable records.

---

## 🚀 Live Demo
Experience the platform live: **[IntellMeet Live Deployment]([https://intellmeet-demo.example.com)](https://intellmeet-ai-powered-enterprise.onrender.com/)**

---

## ✨ Key Features

- **Real-Time HD Video Conferencing:** Low-latency peer-to-peer audio/video streaming and screen sharing powered by WebRTC.
- **Host-Moderated Room Security:** Secure rooms featuring optional password protection and a manual guest join-request approval workflow.
- **Persistent Live Chat:** In-meeting text messaging broadcasted in real time and persisted server-side for AI analysis.
- **Automated AI Intelligence Layer:** - Automatic speech-to-text audio capture and transcription post-session using **Whisper**.
  - Natural-language executive summaries, action-item extraction, and engagement scoring generated via LLMs (**GPT-4o / Mistral**).
- **Pluggable AI Backend:** Interchangeable inference provider support (OpenAI API and Hugging Face Inference API) depending on cost, latency, or availability needs.
- **One-Click PDF Briefings:** Automatically compiles meeting intelligence and full chat logs into a professionally branded, downloadable PDF report using PDFKit.
- **Telemetry & Historical Analytics Dashboard:** A centralized interface for administrators and members to browse past session archives, aggregate usage statistics, and download reports.
- **Privacy-Friendly Role-Based Auth:** Support for Admin/Member roles with an unrestricted, privacy-first sign-up model that allows placeholder email aliases.

---

## 🛠️ Technology Stack

| Category | Technology / Library Used |
| :--- | :--- |
| **Frontend Framework** | React 18 (scaffolded with Vite build tooling) |
| **Real-time Communication** | Socket.IO Client, native WebRTC APIs (via custom `useWebRTC` hook) |
| **HTTP Client** | Axios |
| **Backend Runtime** | Node.js with Express.js |
| **Real-time Signaling Server** | Socket.IO Server |
| **Database** | SQLite3 (Lightweight, file-based relational database) |
| **AI / NLP Services** | OpenAI API (Whisper-1, GPT-4o) & Hugging Face Inference API (Whisper-large-v3, Mistral-7B-Instruct) |
| **Document Generation** | PDFKit |
| **Session / Middleware** | express-session, CORS |
| **Environment Management** | dotenv |

---

## 📐 System Architecture & Data Flow

IntellMeet follows a decoupled client-server architecture:
1. **Authentication:** The user logs in, receives a session token, and accesses the front-end memory-backed workspace.
2. **Signaling & Room Creation:** The host instantiates a room. The Node.js + Socket.IO server acts as the signaling intermediary, registering security configurations and routing WebRTC SDP offers/answers and ICE candidates.
3. **P2P Communication:** Media streams flow directly peer-to-peer via WebRTC to minimize server bandwidth overhead, while chat messages and binary audio chunks are logged server-side.
4. **Post-Meeting Pipeline:** Once the last participant disconnects, the server orchestrates a multi-phase pipeline:
   $$\text{Audio Recording} \longrightarrow \text{Whisper Transcription} \longrightarrow \text{LLM Summarization \& Extraction} \longrightarrow \text{PDFKit Report Generation} \longrightarrow \text{SQLite Persistence}$$

---

## 🗄️ Database Schema (SQLite)

### `users`
- `id` (TEXT, Primary Key)
- `name` (TEXT)
- `email` (TEXT, Unique)
- `password` (TEXT)
- `role` (TEXT, default: 'Member')

### `completed_sessions`
- `sessionId` (TEXT, Primary Key)
- `roomId` (TEXT), `host` (TEXT), `startTime` (TEXT), `endTime` (TEXT)
- `durationMinutes` (INTEGER), `chatMessagesCount` (INTEGER), `peakParticipants` (INTEGER), `engagementScore` (INTEGER)
- `aiSummary` (TEXT) - *Combined audio & chat intelligence summary*
- `actionItems` (TEXT) - *JSON-serialized array of extracted actionable items*

---

## 🛣️ API Endpoints

### Authentication
- `POST /api/auth/register` - Registers a new user account.
- `POST /api/auth/login` - Authenticates user and returns a session token.

### Meeting History & Analytics
- `GET /api/history` - Retrieves the archive of completed meeting sessions.
- `DELETE /api/history` - Clears the stored session-history archive.
- `GET /api/room-analytics/:roomId` - Fetches AI-generated insights for a specific room.
- `GET /api/analytics/summary` - Returns platform metrics (total meetings, total minutes, average engagement, peak participants).
- `GET /api/reports` - Lists all generated PDF session-report files available for download.

### Development Testing
- `POST /api/simulate-telemetry` - Injects sample chat traffic into an active room to test the AI pipeline without live multi-user connections.

---

## 📂 Project Structure

```text
├── backend/
│   ├── src/
│   │   ├── server.js                 # Application entry point, Express app, Socket.IO signaling, SQLite
│   │   ├── controllers/              # Route handler logic (auth, meeting)
│   │   ├── routes/                   # Express route definitions (auth, meeting)
│   │   ├── middleware/               # Authentication middleware
│   │   ├── services/openai.service.js# OpenAI Whisper + GPT-4o integration
│   │   └── sockets/meeting.socket.js # Modular Socket.IO event handlers
│   ├── session_reports/              # Generated PDF meeting reports
│   └── tmp_audio/                    # Temporary in-progress audio recordings
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # Root application component, routing, & Telemetry Dashboard
│   │   ├── main.jsx                  # React application entry point
│   │   ├── context/SocketContext.jsx # Shared Socket.IO client provider
│   │   ├── hooks/useWebRTC.js        # Custom WebRTC peer-connection hook
│   │   └── components/LoginCard.jsx  # Authentication UI component
│   ├── index.html
│   └── vite.config.js                # Vite build configuration
