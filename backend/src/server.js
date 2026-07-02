/**
 * @file server.js
 * @description Advanced Node.js backend using a permanent SQLite Relational Database.
 * Enhanced to support room passwords, live host approval gatekeeping handshakes,
 * and session history archival clearing capabilities.
 */

import PDFDocument from 'pdfkit';
import 'dotenv/config'; // Loads variables from .env automatically
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// Expose the PDF download files securely to the public client context
app.use('/session_reports', express.static(path.join(process.cwd(), 'session_reports')));

// Expose persisted full-session audio recordings for direct download
app.use('/session_audio', express.static(path.join(process.cwd(), 'session_audio')));

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Ensure safe local directories exist for data streams
const TMP_DIR = path.join(process.cwd(), 'tmp_audio');
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

const REPORTS_FOLDER_PATH = path.join(process.cwd(), 'session_reports');
if (!fs.existsSync(REPORTS_FOLDER_PATH)) {
  fs.mkdirSync(REPORTS_FOLDER_PATH, { recursive: true });
}

const AUDIO_FOLDER_PATH = path.join(process.cwd(), 'session_audio');
if (!fs.existsSync(AUDIO_FOLDER_PATH)) {
  fs.mkdirSync(AUDIO_FOLDER_PATH, { recursive: true });
}

// -------------------------------------------------------------------------
// PERMANENT SQLITE DATABASE CONNECTION & SCHEMA INITIALIZATION
// -------------------------------------------------------------------------
const DB_PATH = path.join(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("❌ SQL Database connection error:", err.message);
  else console.log(`💾 [SQL DATABASE CONNECTED] Accessing: ${DB_PATH}`);
});

// Create tables using standard relational schemas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Member'
    )
  `, (err) => {
    if (err) {
      console.error("❌ Failed creating SQL users schema:", err.message);
    } else {
      console.log("📊 [SQL DB] Users table schema verified successfully.");
      
      // Seed a default administrator backup user just in case
      const seedQuery = `INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`;
      db.run(seedQuery, ['user_static_admin', 'Admin Operator', 'admin@core.io', 'password123', 'Admin']);
    }
  });

  // Completed Sessions Table (with AI summary and action items stored as JSON text)
  db.run(`
    CREATE TABLE IF NOT EXISTS completed_sessions (
      sessionId TEXT PRIMARY KEY,
      roomId TEXT NOT NULL,
      host TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      durationMinutes INTEGER NOT NULL,
      chatMessagesCount INTEGER NOT NULL,
      peakParticipants INTEGER NOT NULL,
      engagementScore INTEGER NOT NULL,
      aiSummary TEXT,
      chatSummary TEXT,
      audioFileName TEXT,
      actionItems TEXT
    )
  `, (err) => {
    if (err) return console.error("❌ Failed creating completed_sessions schema:", err.message);
    // Safe migrations for existing databases created before these columns existed.
    db.run(`ALTER TABLE completed_sessions ADD COLUMN chatSummary TEXT`, () => {
      // Ignored on purpose: fails harmlessly with "duplicate column name" if it already exists.
    });
    db.run(`ALTER TABLE completed_sessions ADD COLUMN audioFileName TEXT`, () => {
      // Ignored on purpose: fails harmlessly with "duplicate column name" if it already exists.
    });
  });

  // Seed default core users if table is empty
  db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
      stmt.run("user_alpha", "Operator Alpha", "alpha@intellmeet.core", "password123", "Admin");
      stmt.run("user_beta", "Engineer Beta", "beta@intellmeet.core", "password123", "Member");
      stmt.run("user_gamma", "Analyst Gamma", "gamma@intellmeet.core", "password123", "Member");
      stmt.finalize();
      console.log("🌱 [SQL DB] Default operator credentials seeded.");
    }
  });
});

// Active Live Session Tracking Structures
const activeRoomTrackers = new Map(); 
const socketProfileMap = new Map();    
const roomSecurityRegistry = new Map(); // Tracks optional { password, hostSocketId } metadata per roomId

// =========================================================================
// SQL REST ROUTING APIs
// =========================================================================

// POST: Register New Operator Account inside SQL DB
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are mandatory.' });
  }

  const checkQuery = `SELECT id FROM users WHERE LOWER(email) = LOWER(?)`;
  db.get(checkQuery, [email.trim()], (err, existingUser) => {
    if (err) return res.status(500).json({ error: 'Database failure.' });
    if (existingUser) return res.status(400).json({ error: 'Email exists.' });

    const newUserId = `user_${Date.now()}`;
    const insertQuery = `INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(insertQuery, [newUserId, name.trim(), email.trim(), password, 'Member'], (insertErr) => {
      if (insertErr) return res.status(500).json({ error: 'Failed to save.' });
      
      return res.json({
        success: true,
        user: { id: newUserId, name: name.trim(), email: email.trim(), role: 'Member' }
      });
    });
  });
});

// POST: User Authentication via SQL Query Row Matching
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials.' });

  const query = `SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND password = ?`;
  db.get(query, [email.trim(), password], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }
    return res.json({
      token: "mock-jwt-token",
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  });
});

// GET: Historical Logs pulled straight from SQL database rows
app.get('/api/history', (req, res) => {
  db.all("SELECT * FROM completed_sessions ORDER BY startTime DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const formattedRows = rows.map(row => ({
      ...row,
      actionItems: JSON.parse(row.actionItems || '[]')
    }));
    return res.json(formattedRows);
  });
});

// DELETE: Clear Session History Cache completely
app.delete('/api/history', (req, res) => {
  db.run("DELETE FROM completed_sessions", [], (err) => {
    if (err) {
      console.error("❌ Failed to clear historical records from SQL database:", err.message);
      return res.status(500).json({ error: 'Failed to clear the operational archival database.' });
    }
    console.log("🗑️ [SQL DB] Session history repository completely cleared by operator request.");
    return res.json({ success: true, message: "Archival session cache records wiped clean successfully." });
  });
});

// Route to let the frontend fetch the AI payload for a room
app.get('/api/room-analytics/:roomId', (req, res) => {
  const { roomId } = req.params;
  const activeRoom = activeRoomTrackers.get(roomId); 
  
  if (activeRoom && activeRoom.summaryAnalytics) {
    return res.json(activeRoom.summaryAnalytics);
  }
  
  db.get("SELECT * FROM completed_sessions WHERE roomId = ?", [roomId], (err, row) => {
    if (!err && row) {
      return res.json({
        ...row,
        actionItems: JSON.parse(row.actionItems || '[]')
      });
    }
    return res.status(404).json({ error: "Session intelligence matrix not found for this channel." });
  });
});

// GET: Analytics metrics calculated via SQL aggregate functions
app.get('/api/analytics/summary', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as totalMeetings,
      TOTAL(durationMinutes) as totalMinutes,
      AVG(engagementScore) as avgEngagement,
      MAX(peakParticipants) as peakUsersAllTime
    FROM completed_sessions
  `;

  db.get(query, [], (err, row) => {
    if (err || !row || row.totalMeetings === 0) {
      return res.json({ totalMeetings: 0, totalMinutes: 0, avgEngagement: 0, peakUsersAllTime: 0 });
    }
    return res.json({
      totalMeetings: row.totalMeetings,
      totalMinutes: Math.round(row.totalMinutes),
      avgEngagement: row.avgEngagement ? Math.round(row.avgEngagement) : 0,
      peakUsersAllTime: row.peakUsersAllTime || 0
    });
  });
});

/**
 * @route GET /api/reports
 * @description Retrieves a list of all compiled PDF session reports from the local filesystem.
 */
app.get('/api/reports', (req, res) => {
  fs.readdir(REPORTS_FOLDER_PATH, (err, files) => {
    if (err) {
      console.error("❌ Failed to parse reports filesystem directory:", err.message);
      return res.status(500).json({ error: "Failed to read compiled reports storage directory." });
    }
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    return res.json(pdfFiles);
  });
});

/**
 * @route GET /api/audio-reports
 * @description Retrieves a list of all persisted full-session audio recordings from the local filesystem.
 * Frontend can build a download link/button as: `${SERVER_URL}/session_audio/${filename}`
 */
app.get('/api/audio-reports', (req, res) => {
  fs.readdir(AUDIO_FOLDER_PATH, (err, files) => {
    if (err) {
      console.error("❌ Failed to parse session audio filesystem directory:", err.message);
      return res.status(500).json({ error: "Failed to read session audio storage directory." });
    }
    const audioFiles = files.filter(file => file.toLowerCase().endsWith('.webm'));
    return res.json(audioFiles);
  });
});

/**
 * @route GET /api/download-audio/:filename
 * @description Forces a real file download (Content-Disposition: attachment) instead of
 * inline playback. The plain /session_audio/<file> static route serves audio/webm with no
 * disposition header, so browsers open a playable audio player instead of saving the file —
 * this route exists specifically so the frontend's download button actually downloads.
 */
app.get('/api/download-audio/:filename', (req, res) => {
  const { filename } = req.params;

  // Basic path-traversal guard — filenames should only ever be what persistSessionAudio() generates.
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: "Invalid audio filename." });
  }

  const filePath = path.join(AUDIO_FOLDER_PATH, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Requested audio file was not found on the server." });
  }

  res.download(filePath, filename, (err) => {
    if (err) console.error(`❌ Failed to send audio file "${filename}" for download:`, err.message);
  });
});

// =========================================================================
// REUSABLE AI SUMMARIZATION HELPER (OpenAI API)
// =========================================================================
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

/**
 * Shared low-level caller for OpenAI's Chat Completions API in strict JSON mode.
 * Returns the parsed JSON object from the model, or null on any failure
 * (network error, non-OK status, or malformed JSON) — callers handle fallbacks.
 */
async function callOpenAIJSON(systemPrompt, userPrompt, maxTokens, logLabel) {
  if (!process.env.OPENAI_API_KEY) {
    console.error(`❌ [OPENAI] ${logLabel} request skipped: OPENAI_API_KEY is not set in .env`);
    return null;
  }

  try {
    console.log(`🧠 [OPENAI] Requesting ${logLabel}...`);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: maxTokens,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`❌ [OPENAI] ${logLabel} request failed. Status: ${response.status}. Body: ${errBody}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error(`❌ [OPENAI] ${logLabel} response had no message content.`);
      return null;
    }

    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ [OPENAI] ${logLabel} request threw an exception:`, err.message);
    return null;
  }
}

/**
 * Derives an engagement score (0-100) and a list of action items from the
 * combined audio + chat context. Kept separate from the per-channel summaries
 * below because this needs the full picture to judge engagement / follow-ups.
 */
async function generateEngagementAndActionItems(voiceTranscriptText, combinedTextChatContext) {
  const systemPrompt = "You are an automated system operations analyst. You review meeting telemetry (an audio transcript and a chat log) and respond only with a single JSON object — no prose, no markdown.";

  const userPrompt = `Review this session telemetry:

AUDIO TRANSCRIPT ARCHIVE:
"${voiceTranscriptText || 'No verbal audio recorded over mic channels.'}"

CHAT FEED DATA RECOVERY:
"${combinedTextChatContext || 'No chat communications written on track feeds.'}"

Respond with a JSON object containing exactly these keys: "engagementScore" (integer 0-100) and "actionItems" (array of short strings, empty array if none apply).`;

  const fallback = {
    engagementScore: 75,
    actionItems: ["Review system connectivity lines for missing audio nodes"]
  };

  const parsed = await callOpenAIJSON(systemPrompt, userPrompt, 300, "engagement score and action items");
  if (!parsed) return fallback;

  return {
    engagementScore: typeof parsed.engagementScore === 'number' ? parsed.engagementScore : fallback.engagementScore,
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : fallback.actionItems
  };
}

/**
 * Appends a live audio chunk to the room's temporary cache file on disk.
 * This is the single point of truth for writing incoming mic buffer data,
 * so the audio-chunk socket handler and any future producer can reuse it.
 */
function cacheAudioChunk(roomId, buffer) {
  const liveTracker = activeRoomTrackers.get(roomId);
  if (!liveTracker || !buffer) return;

  fs.appendFile(liveTracker.audioPath, Buffer.from(buffer), (err) => {
    if (err) console.error(`⚠️ [AUDIO CACHE] Write failure for room "${roomId}":`, err.message);
  });
}

/**
 * Moves a room's cached raw audio file out of the temporary tmp_audio cache
 * and into the persistent session_audio folder so it can be downloaded later
 * via the /session_audio static route. Returns the persisted filename, or
 * null if there was nothing to persist / the move failed.
 */
function persistSessionAudio(roomId, tempAudioPath) {
  if (!fs.existsSync(tempAudioPath)) return null;

  try {
    const persistedFileName = `SessionAudio_${roomId}_${Date.now()}.webm`;
    const persistedPath = path.join(AUDIO_FOLDER_PATH, persistedFileName);
    fs.renameSync(tempAudioPath, persistedPath);
    console.log(`💾 [AUDIO CACHE] Full session audio persisted for download: ${persistedFileName}`);
    return persistedFileName;
  } catch (err) {
    console.error(`❌ [AUDIO CACHE] Failed to persist session audio for room "${roomId}":`, err.message);
    return null;
  }
}

/**
 * Single static-prompt AI call that receives BOTH the audio transcript and the
 * chat log together, and asks the model to independently summarize whichever
 * channel(s) have data. One OpenAI request covers both channels rather than
 * making two separate model calls.
 */
async function generateChannelSummaries(voiceTranscriptText, chatLogText) {
  const hasAudio = !!(voiceTranscriptText && voiceTranscriptText.trim());
  const hasChat = !!(chatLogText && chatLogText.trim());

  const audioEmptyFallback = "No explicit audio telemetry gathered to generate an operations brief.";
  const chatEmptyFallback = "No explicit historic text chat communications recorded to process.";

  if (!hasAudio && !hasChat) {
    return { audioSummary: audioEmptyFallback, chatSummary: chatEmptyFallback };
  }

  const systemPrompt = "You are an enterprise communication analyzer. You are given two possible data channels from a meeting: an AUDIO TRANSCRIPT and a CHAT LOG. Either channel may be empty. Respond only with a single JSON object — no prose, no markdown.";

  const userPrompt = `Instructions:
- If the AUDIO TRANSCRIPT is not empty, write a concise, professional summary paragraph of it for the "audioSummary" field.
- If the CHAT LOG is not empty, write a concise, professional summary paragraph of it for the "chatSummary" field.
- If a channel is marked empty, set that field to exactly: "No data recorded for this channel."
- Keep each channel's summary based only on that channel's own content — do not blend the two together.
- Do not use lists, headers, or markdown formatting in either summary.

AUDIO TRANSCRIPT (${hasAudio ? 'has content' : 'empty'}):
"${hasAudio ? voiceTranscriptText : 'empty'}"

CHAT LOG (${hasChat ? 'has content' : 'empty'}):
"${hasChat ? chatLogText : 'empty'}"

Respond with a JSON object containing exactly these two keys: "audioSummary" and "chatSummary".`;

  const parsed = await callOpenAIJSON(systemPrompt, userPrompt, 600, "combined audio + chat summaries");

  if (!parsed) {
    return {
      audioSummary: hasAudio ? "Automated audio summary unavailable (request failed)." : audioEmptyFallback,
      chatSummary: hasChat ? "Automated chat summary unavailable (request failed)." : chatEmptyFallback
    };
  }

  return {
    audioSummary: hasAudio ? (parsed.audioSummary || "Audio summary unavailable.") : audioEmptyFallback,
    chatSummary: hasChat ? (parsed.chatSummary || "Chat summary unavailable.") : chatEmptyFallback
  };
}

/**
 * Checks whether a room name is currently in use by a live session — either
 * actively tracked with connected participants, or already registered with
 * security config by a host who created it but hasn't joined yet. Used to
 * block a duplicate room name from being created in real time.
 */
function isRoomNameTaken(roomId) {
  return activeRoomTrackers.has(roomId) || roomSecurityRegistry.has(roomId);
}

// =========================================================================
// WEBRTC MATRIX SIGNALING + REALSURFACE VOICE STORAGE
// =========================================================================
io.on('connection', (socket) => {

  // Host Action: Explicit real-time availability check when creating a new room.
  // Frontend should call this first when the user clicks "Create Room" — before
  // showing the password field or calling register-session-security — so a
  // duplicate name is rejected immediately instead of silently merging into
  // an existing live session.
  socket.on('create-room', ({ roomId }) => {
    try {
      if (isRoomNameTaken(roomId)) {
        socket.emit('room-creation-failed', {
          roomId,
          message: `Room "${roomId}" already exists. Please use a different name, or use Join Session to join the existing room.`
        });
        console.log(`⚠️ [Room Creation Blocked] Duplicate room name rejected: "${roomId}"`);
        return;
      }

      socket.emit('room-creation-allowed', { roomId });
      console.log(`🆕 [Room Availability] Room name "${roomId}" is available for creation.`);
    } catch (err) {
      console.error("❌ Error checking room name availability:", err.message);
    }
  });

  // Host Action: Register structural credentials and metadata configuration
  socket.on('register-session-security', ({ roomId, password }) => {
    try {
      // Safety net in case a client calls this directly without going through
      // 'create-room' first — still blocks duplicate room names in real time.
      if (isRoomNameTaken(roomId)) {
        socket.emit('room-creation-failed', {
          roomId,
          message: `Room "${roomId}" already exists. Please use a different name, or use Join Session to join the existing room.`
        });
        console.log(`⚠️ [Room Creation Blocked] Duplicate room name rejected: "${roomId}"`);
        return;
      }

      roomSecurityRegistry.set(roomId, {
        password: password ? password.trim() : '',
        hostSocketId: socket.id
      });
      socket.emit('room-creation-allowed', { roomId });
      console.log(`🔒 [Security Config] Security parameters saved for room: "${roomId}"`);
    } catch (err) {
      console.error("❌ Failed to register room security criteria:", err.message);
    }
  });

  // Guest Action: Verification challenge handler and gatekeeper signaling step
  socket.on('verify-and-request-join', ({ roomId, userName, passwordAttempt, guestSocketId }) => {
    try {
      const criteria = roomSecurityRegistry.get(roomId);
      
      // If room has security restrictions, validate input password sequence
      if (criteria && criteria.password !== '') {
        if (criteria.password !== (passwordAttempt ? passwordAttempt.trim() : '')) {
          io.to(guestSocketId).emit('join-request-denied');
          console.log(`🔒 [Access Denied] Password mismatch on channel connection request: ${roomId}`);
          return;
        }
      }

      // Route entry proposal to the active host terminal if host node is connected
      if (criteria && criteria.hostSocketId) {
        io.to(criteria.hostSocketId).emit('join-request-received', {
          roomId,
          userName,
          guestSocketId
        });
        console.log(`📡 [Handshake Dispatched] Verification request routed to host on room: ${roomId}`);
      } else {
        // Fallback: If no host registry is present, auto-allow entry to preserve robustness
        io.to(guestSocketId).emit('join-request-approved', { approvedRoomId: roomId });
      }
    } catch (err) {
      console.error("❌ Error handling join validation handshake logic:", err.message);
    }
  });

  // Host Decision Endpoint: Approves or rejects guest link requests
  socket.on('host-decision-join', ({ guestSocketId, approvedRoomId, status }) => {
    try {
      if (status === 'ACCEPTED') {
        io.to(guestSocketId).emit('join-request-approved', { approvedRoomId });
        console.log(`🟢 [Host Gatekeeper] Access granted to guest node: ${guestSocketId}`);
      } else {
        io.to(guestSocketId).emit('join-request-denied');
        console.log(`🛑 [Host Gatekeeper] Access denied to guest node: ${guestSocketId}`);
      }
    } catch (err) {
      console.error("❌ Error dispatching gatekeeper decision:", err.message);
    }
  });

  // Handle room entry with user mapping arrays
  socket.on('join-room', ({ roomId, userName }) => {
    socket.join(roomId);
    socketProfileMap.set(socket.id, { roomId, userName });

    if (!activeRoomTrackers.has(roomId)) {
      const audioPath = path.join(TMP_DIR, `room_${roomId}_${Date.now()}.webm`);
      activeRoomTrackers.set(roomId, {
        roomId: roomId,
        host: userName || "Unknown Node",
        startTime: new Date(),
        historicalPeers: new Set([userName]),
        chatLogs: [],
        audioPath: audioPath
      });
      
      // Self-heal room registries if creator joined without manual step
      if (!roomSecurityRegistry.has(roomId)) {
        roomSecurityRegistry.set(roomId, { password: '', hostSocketId: socket.id });
      }
    } else {
      activeRoomTrackers.get(roomId).historicalPeers.add(userName);
    }

    const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const existingPeersList = clientsInRoom
      .filter(id => id !== socket.id)
      .map(id => {
        const profile = socketProfileMap.get(id);
        return { id: id, name: profile ? profile.userName : "Operator Node" };
      });

    socket.emit('current-room-peers', existingPeersList);
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userName: userName || "Anonymous Node"
    });

    console.log(`🌐 [Room Entry] User "${userName}" (${socket.id}) linked to mesh: ${roomId}`);
  });

  socket.on('audio-chunk', ({ roomId, buffer }) => {
    cacheAudioChunk(roomId, buffer);
  });

  socket.on('chat-logged', ({ roomId, sender, text }) => {
    if (activeRoomTrackers.has(roomId)) {
      activeRoomTrackers.get(roomId).chatLogs.push({ sender, text, timestamp: new Date().toLocaleTimeString() });
    }
  });

  socket.on('offer', (data) => {
    socket.to(data.targetSocketId).emit('offer', { offer: data.offer, senderId: socket.id });
  });

  socket.on('answer', (data) => {
    socket.to(data.targetSocketId).emit('answer', { answer: data.answer, senderId: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.targetSocketId).emit('ice-candidate', { candidate: data.candidate, senderId: socket.id });
  });

  // Host Action: Immediately kick every other participant out of the room.
  // Unlike a normal disconnect (which only removes the disconnecting socket),
  // this force-ends the session for everyone the moment the host terminates it.
  socket.on('host-terminate-session', ({ roomId }) => {
    const criteria = roomSecurityRegistry.get(roomId);
    const isHost = criteria && criteria.hostSocketId === socket.id;

    if (!isHost) {
      console.warn(`⚠️ [Unauthorized Termination Attempt] Non-host socket "${socket.id}" tried to terminate room: "${roomId}"`);
      return;
    }

    console.log(`🛑 [Host Termination] Host is ending session for room: "${roomId}" — kicking all participants.`);

    // Tell every other socket in the room the session is over before force-disconnecting them,
    // so their frontend can show a clear message instead of just silently dropping.
    socket.to(roomId).emit('session-terminated', {
      message: "The host has ended this session. You have been disconnected."
    });

    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (clientsInRoom) {
      for (const clientSocketId of clientsInRoom) {
        if (clientSocketId === socket.id) continue; // Host disconnects itself separately via its own leave flow
        const clientSocket = io.sockets.sockets.get(clientSocketId);
        if (clientSocket) clientSocket.disconnect(true);
      }
    }
  });

  socket.on('disconnect', async () => {
    const profile = socketProfileMap.get(socket.id);
    if (!profile) return;

    const { roomId, userName } = profile;
    
    socket.to(roomId).emit('user-left', {
      socketId: socket.id,
      userName: userName || "Anonymous Node"
    });
    
    socketProfileMap.delete(socket.id);
    console.log(`🚪 [Room Exit] User "${userName}" (${socket.id}) broken away from mesh: ${roomId}`);

    const activeSockets = io.sockets.adapter.rooms.get(roomId);
    if (!activeSockets || activeSockets.size === 0) {
      const liveTracker = activeRoomTrackers.get(roomId);
      if (liveTracker) {
        const endTime = new Date();
        const durationMinutes = Math.max(1, Math.round((endTime - liveTracker.startTime) / 60000));
        const peakParticipants = liveTracker.historicalPeers.size;

        let voiceTranscriptText = "";
        let aiSummary = "No explicit audio telemetry gathered to generate an operations brief.";
        let chatSummary = "No explicit historic text chat communications recorded to process.";
        let actionItems = ["Review system connectivity lines for missing audio nodes"];
        let engagementScore = 75;
        let sessionAudioFileName = null;

        // ---------------------------------------------------------------------
        // PHASE 1: AUDIO SPEECH-TO-TEXT PROCESSING VIA HUGGING FACE WHISPER
        // ---------------------------------------------------------------------
        if (fs.existsSync(liveTracker.audioPath)) {
          try {
            console.log(`🎙️ [HF WHISPER] Processing recorded voice binary stream for channel: ${roomId}`);
            const audioBuffer = fs.readFileSync(liveTracker.audioPath);

            if (audioBuffer.length > 1000) {
              const hfAudioResponse = await fetch(
                "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
                {
                  headers: { 
                    "Authorization": `Bearer ${process.env.HF_FINEGRAINED_TOKEN}`,
                    "Content-Type": "application/octet-stream"
                  },
                  method: "POST",
                  body: audioBuffer,
                }
              );

              if (hfAudioResponse.ok) {
                const audioResult = await hfAudioResponse.json();
                voiceTranscriptText = audioResult.text || "";
                console.log("🟢 [HF WHISPER SUCCESS] Mic channels fully transcribed.");
              } else {
                const errBody = await hfAudioResponse.text();
                console.error(`❌ [HF WHISPER] Transcription failed. Status: ${hfAudioResponse.status}. Body: ${errBody}`);
              }
            }
          } catch (e) {
            console.error("Whisper handling fallback triggered:", e.message);
          } finally {
            // Persist the raw recording to session_audio for the download button
            // instead of deleting it, regardless of whether transcription succeeded.
            sessionAudioFileName = persistSessionAudio(roomId, liveTracker.audioPath);
          }
        }

        // ---------------------------------------------------------------------
        // PHASE 2: STATIC-PROMPT AI SUMMARIES FOR AUDIO TRANSCRIPT + CHAT LOG
        // ---------------------------------------------------------------------
        const formattedChatLogs = liveTracker.chatLogs
          .map(log => `[${log.timestamp}] ${log.sender}: ${log.text}`)
          .join('\n');

        const [{ audioSummary, chatSummary: computedChatSummary }, { engagementScore: computedEngagementScore, actionItems: computedActionItems }] =
          await Promise.all([
            generateChannelSummaries(voiceTranscriptText, formattedChatLogs),
            generateEngagementAndActionItems(voiceTranscriptText, formattedChatLogs)
          ]);

        aiSummary = audioSummary;
        chatSummary = computedChatSummary;
        engagementScore = computedEngagementScore;
        actionItems = computedActionItems;

        // Expose both analytics summaries to the local map memory so client REST API calls read it immediately
        liveTracker.summaryAnalytics = {
          roomId: roomId,
          aiSummary,
          chatSummary,
          engagementScore,
          actionItems,
          audioFileName: sessionAudioFileName,
          timestamp: new Date().toISOString()
        };

        // ---------------------------------------------------------------------
        // PHASE 3: SECURE EXECUTIVE PDF EXPORT COMPILATION ENGINE
        // ---------------------------------------------------------------------
        const reportFileName = `IntelReport_${roomId}_${Date.now()}.pdf`;
        const localTargetPdfPath = path.join(REPORTS_FOLDER_PATH, reportFileName);

        try {
          const doc = new PDFDocument({ margin: 45 });
          doc.pipe(fs.createWriteStream(localTargetPdfPath));

          // Brand Layout Banner Construction
          doc.fillColor('#0284c7').fontSize(22).text('INTELLMEET // CORE BRIEFING REPORT', { align: 'center' });
          doc.moveDown(0.3);
          doc.strokeColor('#cbd5e1').lineWidth(1.5).moveTo(45, doc.y).lineTo(565, doc.y).stroke();
          doc.moveDown(1);

          // Technical Parameter Meta Blocks
          doc.fillColor('#1e293b').fontSize(11).text(`Channel Stream Identifier: ${roomId}`);
          doc.text(`Origin Host Node: ${liveTracker.host}`);
          doc.text(`Active Frame Runtime: ${durationMinutes} Minute(s)`);
          doc.text(`Total Dynamic Peak Staff: ${peakParticipants}`);
          doc.text(`Evaluated Metrics Score: ${engagementScore}%`);
          doc.moveDown(1.5);

          // Synthesis Description Display (Voice Telemetry Summary) — only shown when
          // real audio was actually captured and transcribed for this session.
          if (voiceTranscriptText && voiceTranscriptText.trim()) {
            doc.fillColor('#0284c7').fontSize(13).text('AI AUDIO SUMMARY', { underline: true });
            doc.moveDown(0.4);
            doc.font('Helvetica').fillColor('#334155').fontSize(10).text(aiSummary, { align: 'justify', lineGap: 3 });
            doc.moveDown(1.5);
          }

          // Dedicated Chat Records AI Text Paragraph Brief — only shown when there
          // was actual chat activity in the session.
          if (liveTracker.chatLogs.length > 0) {
            doc.fillColor('#0284c7').fontSize(13).text('AI CHAT SUMMARY', { underline: true });
            doc.moveDown(0.4);
            doc.font('Helvetica').fillColor('#1e293b').fontSize(10).text(chatSummary, { align: 'justify', lineGap: 3 });
            doc.moveDown(1.5);
          }

          // Task Assignment Mapping Frame Loop
          doc.font('Helvetica-Bold').fillColor('#0284c7').fontSize(13).text('EXTRACTED OPERATIONAL TARGET ACTIONS', { underline: true });
          doc.moveDown(0.4);
          doc.font('Helvetica').fillColor('#334155').fontSize(10);
          if (actionItems.length === 0) {
            doc.text('No high-priority task targets isolated in message records.');
          } else {
            actionItems.forEach((item, index) => {
              doc.text(`${index + 1}. [ ] ${item}`);
            });
          }
          doc.moveDown(1.5);

          // Chat Feed Appendix Block
          doc.fillColor('#64748b').fontSize(12).text('ARCHIVAL TEXT CHAT HISTORIC RECORDS', { underline: true });
          doc.moveDown(0.4);
          doc.font('Courier').fontSize(8.5);
          if (liveTracker.chatLogs.length === 0) {
            doc.text('Zero logs registered to room data feeds.');
          } else {
            liveTracker.chatLogs.forEach(log => {
              doc.text(`[${log.timestamp}] ${log.sender}: ${log.text}`, { lineGap: 2 });
            });
          }

          doc.end();
          console.log(`💾 [PDF RECOVERY COMPLETE] Executive sheet archived securely at: ${localTargetPdfPath}`);
        } catch (pdfCompileError) {
          console.error("❌ PDF Engine crashed writing system files:", pdfCompileError.message);
        }

        // ---------------------------------------------------------------------
        // PHASE 4: WRITE RAW ROW TRANSACTION INTO SQL DATABASE ENGINE
        // ---------------------------------------------------------------------
        const insertStmt = db.prepare(`
          INSERT INTO completed_sessions (
            sessionId, roomId, host, startTime, endTime, 
            durationMinutes, chatMessagesCount, peakParticipants, engagementScore, 
            aiSummary, chatSummary, audioFileName, actionItems
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
          `sess_${Date.now()}`,
          roomId,
          liveTracker.host,
          liveTracker.startTime.toISOString(),
          endTime.toISOString(),
          durationMinutes,
          liveTracker.chatLogs.length,
          peakParticipants,
          engagementScore,
          aiSummary,
          chatSummary,
          sessionAudioFileName,
          JSON.stringify(actionItems),
          (err) => {
            if (err) console.error("❌ SQL Insertion Failed:", err.message);
            else console.log(`💾 [SQL Archival Success] Row committed for room: ${roomId}`);
          }
        );
        insertStmt.finalize();

        // Evict session configuration memory nodes
        activeRoomTrackers.delete(roomId);
        roomSecurityRegistry.delete(roomId);
      }
    }
  });
});

server.listen(PORT, async () => {
  console.log(`\n🚀 [MATRIX INFRASTRUCTURE LIVE ON PORT ${PORT} WITH RELATIONAL SQL]`);

  // ---------------------------------------------------------------------
  // Hugging Face token check (still used for Whisper audio transcription)
  // ---------------------------------------------------------------------
  console.log("⚡ [DIAGNOSTIC] Validating Intelmeet Fine-Grained Token status...");
  try {
    const token = process.env.HF_FINEGRAINED_TOKEN;
    if (!token || token.startsWith("hf_YOUR_COPIED_TOKEN")) {
      throw new Error("Token missing or set to default placeholder in your .env file.");
    }

    const response = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Platform rejected token authorization. Status: ${response.status}`);
    }

    const userData = await response.json();
    console.log(`🟢 [PLATFORM CORE ONLINE] Authenticated as user: "${userData.name}" with token scope privileges.\n`);
  } catch (error) {
    console.error("🔴 [PLATFORM CORE OFFLINE] Fine-Grained Token validation failed!");
    console.error(`Reason: ${error.message}`);
  }

  // ---------------------------------------------------------------------
  // OpenAI API key check (used for audio + chat summaries and action items)
  // ---------------------------------------------------------------------
  console.log(`⚡ [DIAGNOSTIC] Validating OpenAI API key status (model: ${OPENAI_MODEL})...`);
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || openaiKey.startsWith("sk-YOUR_COPIED_KEY")) {
      throw new Error("OPENAI_API_KEY missing or set to a placeholder in your .env file.");
    }

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { "Authorization": `Bearer ${openaiKey}` }
    });

    if (!response.ok) {
      throw new Error(`OpenAI rejected the API key. Status: ${response.status}`);
    }

    console.log("🟢 [OPENAI CORE ONLINE] API key validated successfully.\n");
  } catch (error) {
    console.error("🔴 [OPENAI CORE OFFLINE] OpenAI API key validation failed!");
    console.error(`Reason: ${error.message}`);
  }
});

// Friendlier error message than the default unhandled-exception stack trace
// when the port is already occupied by a previous (possibly zombie) process.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n🔴 [STARTUP FAILED] Port ${PORT} is already in use by another process.`);
    console.error(`   Windows: run "netstat -ano | findstr :${PORT}" to find the PID, then "taskkill /PID <pid> /F".`);
    console.error(`   macOS/Linux: run "lsof -i :${PORT}" to find the PID, then "kill -9 <pid>".`);
    process.exit(1);
  } else {
    console.error("🔴 [STARTUP FAILED] Unexpected server error:", err.message);
    process.exit(1);
  }
});
