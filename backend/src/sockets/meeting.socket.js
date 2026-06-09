// backend/src/sockets/meeting.socket.js
import fs from 'fs/promises';
import path from 'path';

const jsonPath = path.resolve(process.cwd(), 'chats.json');

/**
 * Orchestrates real-time WebRTC signaling, peer discovery, and live chat 
 * events for specific room spaces within IntellMeet.
 */
export const handleMeetingSockets = (io, socket) => {
  
  // 1. Room Management & Joining Matrix
  socket.on('join-room', async ({ roomId, userId, userName }) => {
    socket.roomId = roomId;
    socket.userId = userId;
    socket.userName = userName;

    socket.join(roomId);
    console.log(`👤 User [${userName}] (${userId}) entered room: [${roomId}]`);

    socket.to(roomId).emit('user-connected', {
      userId,
      userName,
      socketId: socket.id
    });

    try {
      const fileBuffer = await fs.readFile(jsonPath, 'utf-8').catch(() => '[]');
      const allMessages = JSON.parse(fileBuffer || '[]');
      const historicalBuffer = allMessages.filter(msg => msg.roomId === roomId);
      
      historicalBuffer.forEach(msg => {
        socket.emit('receive-message', msg);
      });
    } catch (err) {
      console.error(`⚠️ History sync bypass: ${err.message}`);
    }
  });

  // 2. WebRTC Signaling Infrastructure
  socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc-ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // 3. Persistent Live Chat Transactions
  socket.on('send-message', async ({ text }) => {
    const { roomId, userName, userId } = socket;
    if (!roomId) return;

    const messagePayload = {
      id: `${socket.id}-${Date.now()}`,
      roomId,
      text,
      sender: { userId, userName },
      timestamp: new Date().toISOString()
    };

    try {
      const fileBuffer = await fs.readFile(jsonPath, 'utf-8').catch(() => '[]');
      const currentLogs = JSON.parse(fileBuffer || '[]');
      currentLogs.push(messagePayload);
      await fs.writeFile(jsonPath, JSON.stringify(currentLogs, null, 2), 'utf-8');
    } catch (error) {
      console.error(`💥 Disk Transaction Refused: ${error.message}`);
    }

    io.to(roomId).emit('receive-message', messagePayload);
  });

  // 4. Lifecyle Disconnection Core
  socket.on('disconnect', () => {
    const { roomId, userId, userName } = socket;
    if (roomId) {
      console.log(`🔌 User [${userName}] disconnected out of room: [${roomId}]`);
      socket.to(roomId).emit('user-disconnected', {
        userId,
        socketId: socket.id
      });
    }
  });
};