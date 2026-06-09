// frontend/src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [peerStreams, setPeerStreams] = useState([]); // Array of remote tracks { socketId, stream }
  
  const peersRef = useRef({}); // Keeps operational track of peer connections
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    // 1. Initialize global websocket connection to our backend
    const socketInstance = io(backendUrl, { autoConnect: true });
    setSocket(socketInstance);

    // 2. Clear out infrastructure sockets on component unmount
    return () => {
      socketInstance.disconnect();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Requests local hardware permissions for high-definition audio and video capture.
   */
  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error(`💥 Hardware Media Capture Permission Denied: ${error.message}`);
      throw error;
    }
  };

  return (
    <SocketContext.Provider value={{ socket, localStream, startLocalMedia, peerStreams, setPeerStreams, peersRef }}>
      {children}
    </SocketContext.Provider>
  );
};