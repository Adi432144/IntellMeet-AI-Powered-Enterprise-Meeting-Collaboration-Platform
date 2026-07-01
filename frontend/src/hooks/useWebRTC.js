import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * useWebRTC Custom Infrastructure Hook
 * Explicitly builds peer connections using a mesh layout topology.
 */
export function useWebRTC(roomId, userId, userName) {
  const { socket, localStream, peerStreams, setPeerStreams } = useSocket();
  const peerConnections = useRef({}); // Tracks active RTCPeerConnection objects map

  useEffect(() => {
    if (!socket || !roomId || !localStream) return;

    // Acknowledge entry to backend socket channel
    socket.emit('join-room', { roomId, userId, userName });

    // A. INCOMING PEER DETECTED: We are the 'Caller'
    socket.on('peer-joined', async ({ socketId, userName: peerName }) => {
      console.log(`🤝 Initiating handshake sequence with incoming peer: ${peerName}`);
      
      const pc = createPeerConnection(socketId);
      peerConnections.current[socketId] = pc;

      // Create connection offer configuration blueprint
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('webrtc-offer', { targetSocketId: socketId, sdp: offer });
    });

    // B. RECEIVE AN OFFER: We are the 'Receiver'
    socket.on('webrtc-offer', async ({ senderSocketId, sdp }) => {
      console.log(`📥 WebRTC Offer payload detected from peer endpoint: ${senderSocketId}`);
      
      const pc = createPeerConnection(senderSocketId);
      peerConnections.current[senderSocketId] = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc-answer', { targetSocketId: senderSocketId, sdp: answer });
    });

    // C. RECEIVE AN ANSWER: Finalizing the connection tunnel
    socket.on('webrtc-answer', async ({ senderSocketId, sdp }) => {
      console.log(`📤 WebRTC Answer payload detected from target: ${senderSocketId}`);
      const pc = peerConnections.current[senderSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    // D. RECEIVE NETWORK INFRASTRUCTURE CANDIDATE
    socket.on('webrtc-candidate', async ({ senderSocketId, candidate }) => {
      const pc = peerConnections.current[senderSocketId];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // E. CLEANUP REMOTE REMOVALS
    socket.on('peer-disconnected', ({ socketId }) => {
      console.log(`🗑️ Cleaning connection allocations for socket node: ${socketId}`);
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setPeerStreams((prev) => prev.filter((p) => p.socketId !== socketId));
    });

    // Helper: Instantiates a standardized RTCPeerConnection instance
    function createPeerConnection(targetSocketId) {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Public STUN server allocation
      });

      // Append local media feeds directly into the network pipe connection frame
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Listen for when network routes are resolved dynamically
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-candidate', { 
            targetSocketId, 
            candidate: event.candidate 
          });
        }
      };

      // When remote track media surfaces from connection pipeline, attach to hook state
      pc.ontrack = (event) => {
        console.log(`🎥 Remote media stream track synchronized successfully!`);
        setPeerStreams((prev) => {
          // Prevent duplicates inside component layout render map
          if (prev.some((p) => p.socketId === targetSocketId)) return prev;
          return [...prev, { socketId: targetSocketId, stream: event.streams[0] }];
        });
      };

      return pc;
    }

    return () => {
      socket.off('peer-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-candidate');
      socket.off('peer-disconnected');
    };
  }, [socket, roomId, localStream]);
}