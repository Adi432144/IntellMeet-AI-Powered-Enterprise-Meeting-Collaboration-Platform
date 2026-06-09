// backend/src/server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import connectDB from './config/db.js';
import { handleMeetingSockets } from './sockets/meeting.socket.js';
import meetingRoutes from './routes/meeting.routes.js';

// 1. Initialize Express Application Context
const app = express();

// 2. Create the HTTP Server Core Wrapper (This resolves your ReferenceError!)
const server = http.createServer(app);

// 3. Attach Socket.io Real-Time Engine directly onto the HTTP Engine
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // Vite default port fallback
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 4. Configure Application-Wide Global Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// 5. Connect to MongoDB Cluster State
connectDB();

// 6. Bind Socket Room Real-Time Pipeline Events
io.on('connection', (socket) => {
  handleMeetingSockets(io, socket);
});

// 7. Mount Rest API Routers
app.use('/api/meetings', meetingRoutes);

// System Health Dashboard Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ONLINE', timestamp: new Date().toISOString() });
});

// 8. Launch Server Listening Engine
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 IntellMeet Enterprise Server deployed on Port: ${PORT}`);
  console.log(`📡 MongoDB Status Connected Successfully!`);
  console.log(`🔐 Socket.io Engine Live & Listening for Matrix Connections`);
  console.log(`==================================================\n`);
});