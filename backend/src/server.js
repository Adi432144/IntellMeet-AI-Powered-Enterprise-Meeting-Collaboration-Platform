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

const PORT = 8080;
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
      actionItems TEXT
    )
  `);

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

// POST: Inject Simulated Test Telemetry Into an Active Room
app.post('/api/simulate-telemetry', (req, res) => {
  const { roomId } = req.body;
  const liveTracker = activeRoomTrackers.get(roomId);

  if (!liveTracker) {
    return res.status(404).json({ error: "Target simulation mesh room not found or inactive." });
  }

  // Inject a complete developer narrative tracking log (chats, notes, metrics context)
  liveTracker.chatLogs.push(
    { sender: "Operator Alpha", text: "Initializing infrastructure sync verification protocols.", timestamp: "2:59:41 pm" },
    { sender: "Engineer Beta", text: "The WebRTC layout adapts fluidly across parallel workspace screens.", timestamp: "3:00:21 pm" },
    { sender: "Analyst Gamma", text: "Confirmed. Ensure we trigger the final high-accuracy report compilation upon disconnect.", timestamp: "3:00:21 pm" }
  );

  console.log(`🧪 [SIMULATION TRAFFIC] Injected telemetry arrays into room: ${roomId}`);
  return res.json({ success: true, message: "Mock engineering traffic successfully written." });
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

// =========================================================================
// WEBRTC MATRIX SIGNALING + REALSURFACE VOICE STORAGE
// =========================================================================
io.on('connection', (socket) => {

  // Host Action: Register structural credentials and metadata configuration
  socket.on('register-session-security', ({ roomId, password }) => {
    try {
      roomSecurityRegistry.set(roomId, {
        password: password ? password.trim() : '',
        hostSocketId: socket.id
      });
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
    const liveTracker = activeRoomTrackers.get(roomId);
    if (liveTracker && buffer) {
      fs.appendFile(liveTracker.audioPath, Buffer.from(buffer), (err) => {
        if (err) console.error("⚠️ Audio write failure:", err);
      });
    }
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
        let actionItems = ["Review system connectivity lines for missing audio nodes"];
        let engagementScore = 75;

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
              }
            }
          } catch (e) {
            console.error("Whisper handling fallback triggered:", e.message);
          } finally {
            fs.unlink(liveTracker.audioPath, () => {});
          }
        }

        // ---------------------------------------------------------------------
        // PHASE 2: CONTEXT TRANSCRIPT SYNTHESIS (VOICE TRANSCRIPT + CHAT MESH)
        // ---------------------------------------------------------------------
        const combinedTextChatContext = liveTracker.chatLogs.map(log => `[Chat - ${log.sender}]: ${log.text}`).join("\n");
        
        const summaryContextPrompt = `<s>[INST] You are an automated system operations analyst. Synthesize a unified brief from this session telemetry:

AUDIO TRANSCRIPT ARCHIVE:
"${voiceTranscriptText || 'No verbal audio recorded over mic channels.'}"

CHAT FEED DATA RECOVERY:
"${combinedTextChatContext || 'No chat communications written on track feeds.'}"

Respond strictly with a single valid JSON object containing exactly these keys: "summary", "engagementScore", and "actionItems". Do not output any markdown code fences, headers, or explanations.

Example output format:
{"summary": "Text content here.", "engagementScore": 80, "actionItems": ["Task item 1"]} [/INST]`;

        try {
          console.log("⚡ [HF MISTRALAI] Compiling cross-channel data inputs into text model context...");
          const hfTextResponse = await fetch(
            "https://api-inference.huggingface.co/models/MistralAI/Mistral-7B-Instruct-v0.3",
            {
              headers: {
                "Authorization": `Bearer ${process.env.HF_FINEGRAINED_TOKEN}`,
                "Content-Type": "application/json"
              },
              method: "POST",
              body: JSON.stringify({ 
                inputs: summaryContextPrompt, 
                parameters: { return_full_text: false, max_new_tokens: 300, temperature: 0.3 } 
              }),
            }
          );

          if (hfTextResponse.ok) {
            const textResult = await hfTextResponse.json();
            const rawContent = Array.isArray(textResult) ? textResult[0].generated_text : textResult.generated_text;
            
            const jsonSanitizationRegex = rawContent.match(/\{[\s\S]*\}/);
            if (jsonSanitizationRegex) {
              try {
                const aiPayload = JSON.parse(jsonSanitizationRegex[0].trim());
                aiSummary = aiPayload.summary || "Summary successfully compiled.";
                engagementScore = aiPayload.engagementScore || 80;
                actionItems = Array.isArray(aiPayload.actionItems) ? aiPayload.actionItems : ["Review system log lines"];
              } catch (jsonErr) {
                aiSummary = rawContent.replace(/["'{}]/g, '').substring(0, 180) + "...";
                if (liveTracker.chatLogs.length > 0) {
                  actionItems = liveTracker.chatLogs.slice(-2).map(c => `Follow up on statement from ${c.sender}: "${c.text}"`);
                }
              }
            }
          }
        } catch (openaiErr) {
          console.error("HuggingFace pipeline extraction error:", openaiErr.message);
        }

        // ---------------------------------------------------------------------
        // PHASE 2.5: DEDICATED ARCHIVAL CHAT INSIGHTS PARAGRAPH COMPILER
        // ---------------------------------------------------------------------
        let chatAiParagraphSummary = "No explicit historic text chat communications recorded to process.";

        if (liveTracker.chatLogs.length > 0) {
          try {
            console.log("🧠 [HF TEXT CHAT PROMPT ENGINE] Submitting text transcripts for dedicated professional text summarizing...");
            const formattedChatLogs = liveTracker.chatLogs.map(log => 
              `[${log.timestamp}] ${log.sender}: ${log.text}`
            ).join('\n');

            const staticPromptPayload = `<s>[INST] You are an enterprise communication analyzer. Ingest the following archival conversation logs and write a single, cohesive, elegant executive summary paragraph explaining the key technical consensus items, engineering discussion points, and actions taken. Do not use lists or headers.
            
ARCHIVAL TEXT CHAT HISTORIC RECORDS:
${formattedChatLogs} [/INST]`;

            const hfChatSummaryResponse = await fetch(
              "https://api-inference.huggingface.co/models/MistralAI/Mistral-7B-Instruct-v0.3",
              {
                headers: {
                  "Authorization": `Bearer ${process.env.HF_FINEGRAINED_TOKEN}`,
                  "Content-Type": "application/json"
                },
                method: "POST",
                body: JSON.stringify({
                  inputs: staticPromptPayload,
                  parameters: { return_full_text: false, max_new_tokens: 250, temperature: 0.2 }
                })
              }
            );

            if (hfChatSummaryResponse.ok) {
              const resJson = await hfChatSummaryResponse.json();
              chatAiParagraphSummary = Array.isArray(resJson) ? resJson[0].generated_text : resJson.generated_text;
              chatAiParagraphSummary = chatAiParagraphSummary.trim();
            }
          } catch (chatSummaryErr) {
            console.error("❌ Chat summary inference failed, fallback engaged:", chatSummaryErr.message);
          }
        }

        // Expose both analytics summaries to the local map memory so client REST API calls read it immediately
        liveTracker.summaryAnalytics = {
          roomId: roomId,
          aiSummary,
          chatAiParagraphSummary, 
          engagementScore,
          actionItems,
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

          // Synthesis Description Display (Voice Telemetry Summary)
          doc.fillColor('#0284c7').fontSize(13).text('⚡ AI AUDIO TELEMETRY SYNTHESIS BRIEF', { underline: true });
          doc.moveDown(0.4);
          doc.fillColor('#334155').fontSize(10).text(aiSummary, { align: 'justify', lineGap: 3 });
          doc.moveDown(1.5);

          // Dedicated Chat Records AI Text Paragraph Brief
          doc.fillColor('#0284c7').fontSize(13).text('🧠 AI ARCHIVAL CHAT INSIGHTS SUMMARY', { underline: true });
          doc.moveDown(0.4);
          doc.fillColor('#1e293b').font('Helvetica').fontSize(10).text(chatAiParagraphSummary, { align: 'justify', lineGap: 3 });
          doc.moveDown(1.5);

          // Task Assignment Mapping Frame Loop
          doc.font('Helvetica-Bold').fillColor('#0284c7').fontSize(13).text('🎯 EXTRACTED OPERATIONAL TARGET ACTIONS', { underline: true });
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
          doc.fillColor('#64748b').fontSize(12).text('📝 ARCHIVAL TEXT CHAT HISTORIC RECORDS', { underline: true });
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
            aiSummary, actionItems
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          aiSummary + `\n\n[CHAT INSIGHTS SUMMARY]\n` + chatAiParagraphSummary, 
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
});