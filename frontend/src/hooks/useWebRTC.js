// frontend/src/hooks/useWebRTC.js
import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Public STUN server for NAT traversal routing
};

export const useWebRTC = (roomId, userId, userName) => {
  const { socket, localStream, startLocalMedia, setPeerStreams, peersRef } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const initializeSignalingPipeline = async () => {
      // 1. Ensure local camera/mic media is capturing active tracks
      const stream = localStream || await startLocalMedia();

      // 2. Tell the backend signaling server we want to enter the room
      socket.emit('join-room', { roomId, userId, userName });

      // 3. Listener: Someone else joined! We need to create an Offer to connect
      socket.on('user-connected', async ({ socketId }) => {
        const peerConnection = createPeerConnection(socketId, stream);
        peersRef.current[socketId] = peerConnection;

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('webrtc-offer', { targetSocketId: socketId, offer });
      });

      // 4. Listener: Handle incoming WebRTC connection offers
      socket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
        const peerConnection = createPeerConnection(senderSocketId, stream);
        peersRef.current[senderSocketId] = peerConnection;

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer });
      });

      // 5. Listener: Handle finalized answers back from peers
      socket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
        const peerConnection = peersRef.current[senderSocketId];
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      // 6. Listener: Track dynamic network configuration updates via ICE Candidates
      socket.on('webrtc-ice-candidate', async ({ senderSocketId, candidate }) => {
        const peerConnection = peersRef.current[senderSocketId];
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      // 7. Listener: Remove streams when users disconnect
      socket.on('user-disconnected', ({ socketId }) => {
        if (peersRef.current[socketId]) {
          peersRef.current[socketId].close();
          delete peersRef.current[socketId];
        }
        setPeerStreams(prev => prev.filter(p => p.socketId !== socketId));
      });
    };

    initializeSignalingPipeline();

    return () => {
      socket.off('user-connected');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('user-disconnected');
    };
  }, [socket, roomId, localStream]);

  /**
   * Factory function setting up a new RTCPeerConnection for network mesh nodes.
   */
  const createPeerConnection = (targetSocketId, stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Stream our local tracks down to this new peer node
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Handle network candidate updates discovery
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice-candidate', { targetSocketId, candidate: event.candidate });
      }
    };

    // Capture incoming stream tracks from this remote peer node
    pc.ontrack = (event) => {
      setPeerStreams(prev => {
        const exists = prev.find(p => p.socketId === targetSocketId);
        if (exists) return prev;
        return [...prev, { socketId: targetSocketId, stream: event.streams[0] }];
      });
    };

    return pc;
  };
};