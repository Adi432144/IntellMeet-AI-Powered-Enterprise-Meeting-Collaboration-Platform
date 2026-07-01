/**
 * WebRTC Signaling & Chat Socket Controller
 * Coordinates peer handshakes and manages room states.
 */
export const handleMeetingSockets = (io, socket) => {
  
  // 1. Client requests entry into a room container
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.roomId = roomId;
    socket.userId = userId;
    socket.userName = userName;
    
    socket.join(roomId);
    
    // Broadcast to existing room members that a new peer node is available
    socket.to(roomId).emit('peer-joined', { 
      socketId: socket.id, 
      userId, 
      userName 
    });
    
    console.log(`📡 Peer [${userName}] successfully routed to room: ${roomId}`);
  });

  // 2. Relay WebRTC SDP Offer to a specific targeted target peer
  socket.on('webrtc-offer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      sdp
    });
  });

  // 3. Relay WebRTC SDP Answer back to the initial offer originator
  socket.on('webrtc-answer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      sdp
    });
  });

  // 4. Transport ICE network routing footprints between devices
  socket.on('webrtc-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // 5. Traditional instant message broadcasting
  socket.on('send-message', (data) => {
    const messagePayload = {
      id: `msg-${Date.now()}`,
      text: data.text,
      sender: { userName: socket.userName, userId: socket.userId },
      timestamp: new Date().toISOString()
    };
    io.to(socket.roomId).emit('receive-message', messagePayload);
  });

  // 6. Handle client disconnect cleanups safely
  socket.on('disconnect', () => {
    if (socket.roomId) {
      io.to(socket.roomId).emit('peer-disconnected', { socketId: socket.id });
      console.log(`🔌 Peer [${socket.userName}] disconnected from room: ${socket.roomId}`);
    }
  });
};