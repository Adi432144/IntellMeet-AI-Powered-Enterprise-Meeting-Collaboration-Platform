/**
 * @file App.jsx
 * @description Advanced Core Video Engine featuring real-time meeting creation/joining gatekeeping,
 * session authentication passwords, host permission dialog popups, history cache clearing, and theme switching.
 */

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import LoginCard from './components/LoginCard';

// Initialize socket client outside component lifecycle to prevent duplicate connection instances
const socket = io('https://intellmeet-ai-powered-enterpris.onrender.com', {
  autoConnect: false, // Controlled explicitly via security lifecycle states
  reconnectionAttempts: 5,
  timeout: 10000
}); 

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const analyticsStyles = {
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  metricCard: { backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', borderRadius: '12px' },
  giantStat: { fontSize: '28px', fontWeight: '800', marginTop: '8px', color: '#38bdf8' }
};

const stylesCyber = {
  appContainer: { minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', fontFamily: '"Courier New", Courier, monospace, system-ui', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' },
  themeToggleBtn: { padding: '8px 16px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  profileBadgeContainer: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', backgroundColor: '#1e293b', border: '1px solid #334155', cursor: 'pointer' },
  avatarIcon: { fontSize: '14px' },
  btnDisconnect: { padding: '8px 16px', borderRadius: '6px', backgroundColor: '#ef4444', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  centerView: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' },
  glassCard: { width: '100%', maxWidth: '460px', padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid #38bdf8', boxShadow: '0 0 20px rgba(56, 189, 248, 0.15)', backdropFilter: 'blur(8px)' },
  badgeTop: { display: 'inline-block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '4px', marginBottom: '12px', fontWeight: 'bold' },
  textPrimary: '#f8fafc',
  fieldLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginTop: '10px', marginBottom: '4px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#020617', border: '1px solid #334155', color: '#ffffff', fontSize: '14px', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#38bdf8', border: 'none', color: '#0f172a', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' },
  workspace: { flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 70px)' },
  networkBar: { padding: '12px 24px', backgroundColor: '#020617', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: '12px' },
  rosterSidebarContainer: { position: 'absolute', top: '50px', right: '16px', width: '260px', backgroundColor: '#0f172a', border: '1px solid #a855f7', borderRadius: '12px', padding: '16px', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  rosterRowItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  miniDirectChatBtn: { padding: '4px 8px', borderRadius: '4px', backgroundColor: '#a855f7', border: 'none', color: '#fff', fontSize: '11px', cursor: 'pointer' },
  videoGrid: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '24px', overflowY: 'auto' },
  videoCard: { position: 'relative', borderRadius: '12px', backgroundColor: '#0f172a', border: '1px solid #1e293b', overflow: 'hidden', aspectRatio: '16/9' },
  videoElementMirror: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
  videoOverlayBadge: { position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(15,23,42,0.75)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px' },
  hardwareControlsContainer: { position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' },
  toggleBtn: { padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(15,23,42,0.85)', border: '1px solid #334155', color: '#fff', fontSize: '11px', cursor: 'pointer' },
  collabContainer: { height: '140px', padding: '16px', backgroundColor: '#0f172a', borderTop: '1px solid #1e293b' },
  textArea: { width: '100%', height: '100%', padding: '12px', backgroundColor: '#020617', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '8px', resize: 'none', boxSizing: 'border-box' },
  sidebar: { width: '340px', borderLeft: '1px solid #1e293b', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column' },
  chatTargetSelectorSubBar: { padding: '12px', backgroundColor: '#020617', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '8px' },
  targetDropdownSelector: { flex: 1, padding: '4px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px', fontSize: '11px' },
  clearPrivateBtn: { background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' },
  chatFeed: { flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  chatBubble: { padding: '10px 14px', borderRadius: '8px', backgroundColor: '#1e293b', borderLeft: '3px solid #38bdf8' },
  chatMeta: { fontSize: '11px', color: '#94a3b8', marginBottom: '4px' },
  chatText: '#cbd5e1',
  chatForm: { padding: '16px', borderTop: '1px solid #1e293b', display: 'flex', gap: '8px' },
  chatInput: { flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px' },
  chatSendBtn: { padding: '10px 16px', backgroundColor: '#38bdf8', border: 'none', color: '#0f172a', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  profileModal: { width: '100%', maxWidth: '360px', padding: '24px', backgroundColor: '#0f172a', border: '1px solid #38bdf8', borderRadius: '16px' }
};

const stylesLight = {
  appContainer: { minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' },
  themeToggleBtn: { padding: '8px 16px', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  profileBadgeContainer: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer' },
  avatarIcon: { fontSize: '14px' },
  btnDisconnect: { padding: '8px 16px', borderRadius: '6px', backgroundColor: '#ef4444', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  centerView: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' },
  glassCard: { width: '100%', maxWidth: '460px', padding: '32px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' },
  badgeTop: { display: 'inline-block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '4px', marginBottom: '12px', fontWeight: 'bold' },
  textPrimary: '#1e293b',
  fieldLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 'bold', display: 'block', marginTop: '10px', marginBottom: '4px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', fontSize: '14px', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#0284c7', border: 'none', color: '#ffffff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' },
  workspace: { flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 70px)' },
  networkBar: { padding: '12px 24px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '12px' },
  rosterSidebarContainer: { position: 'absolute', top: '50px', right: '16px', width: '260px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
  rosterRowItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  miniDirectChatBtn: { padding: '4px 8px', borderRadius: '4px', backgroundColor: '#0284c7', border: 'none', color: '#fff', fontSize: '11px', cursor: 'pointer' },
  videoGrid: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '24px', overflowY: 'auto' },
  videoCard: { position: 'relative', borderRadius: '12px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', overflow: 'hidden', aspectRatio: '16/9' },
  videoElementMirror: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  videoElement: { width: '100%', height: '100%', objectFit: 'cover' },
  videoOverlayBadge: { position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.9)', color: '#1e293b', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  hardwareControlsContainer: { position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px' },
  toggleBtn: { padding: '6px 12px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', fontSize: '11px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  collabContainer: { height: '140px', padding: '16px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' },
  textArea: { width: '100%', height: '100%', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', resize: 'none', boxSizing: 'border-box' },
  sidebar: { width: '340px', borderLeft: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' },
  chatTargetSelectorSubBar: { padding: '12px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' },
  targetDropdownSelector: { flex: 1, padding: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', borderRadius: '4px', fontSize: '11px' },
  clearPrivateBtn: { background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' },
  chatFeed: { flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  chatBubble: { padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f1f5f9', borderLeft: '3px solid #0284c7' },
  chatMeta: { fontSize: '11px', color: '#64748b', marginBottom: '4px' },
  chatText: '#334155',
  chatForm: { padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' },
  chatInput: { flex: 1, padding: '10px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', fontSize: '13px' },
  chatSendBtn: { padding: '10px 16px', backgroundColor: '#0284c7', border: 'none', color: '#ffffff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  profileModal: { width: '100%', maxWidth: '360px', padding: '24px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px' }
};

export default function App() {
  const [view, setView] = useState('AUTH');
  const [userName, setUserName] = useState(`Operator_${Math.floor(Math.random() * 900 + 100)}`);
  const [userRole, setUserRole] = useState('Member');
  const [userEmail, setUserEmail] = useState('operator@intelmeet.io');
  const [roomId, setRoomId] = useState('intellmeet-secure-shared-room');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [theme, setTheme] = useState('NEON_CYBER');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);

  // New Dashboard State Controls
  const [dashboardOption, setDashboardOption] = useState('CREATE'); // 'CREATE' | 'JOIN'
  const [roomPassword, setRoomPassword] = useState('');
  const [joinPasswordInput, setJoinPasswordInput] = useState('');
  const [activeJoinRequests, setActiveJoinRequests] = useState([]); // List of requests on Host interface
  const [createRoomError, setCreateRoomError] = useState(''); // Real-time "room already exists" feedback

  // Gatekeeper states inside the room (mirrors code_1 join/create/request flow)
  const [isHostRole, setIsHostRole] = useState(false);
  const [isApprovedGuest, setIsApprovedGuest] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [activePeers, setActivePeers] = useState([]); 
  const [sharedNotes, setSharedNotes] = useState('');

  const [privateTarget, setPrivateTarget] = useState('ALL'); 
  const [showPeerRoster, setShowPeerRoster] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [historyLogs, setHistoryLogs] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [summaryStats, setSummaryStats] = useState({ totalMeetings: 0, totalMinutes: 0, avgEngagement: 0, peakUsersAllTime: 0 });

  const localVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const localStream = useRef(null);
  const peerConnections = useRef({}); 
  const [dataChannels, setDataChannels] = useState({});     
  
  const voiceRecorderRef = useRef(null);
  const currentStyles = theme === 'NEON_CYBER' ? stylesCyber : stylesLight;

  const handleAuthSuccess = (userData) => {
    setUserName(userData.name || userName);
    setUserRole(userData.role || 'Member');
    setUserEmail(userData.email || 'operator@intelmeet.io');
    loadHistoricalAnalytics();
    setView('DASHBOARD');
  };

  /**
   * Clears the operational cache records database from backend storage nodes
   */
  const clearSessionHistoryCache = async () => {
    if (!window.confirm("Are you sure you want to completely clear the historic session cache storage?")) return;
    try {
      const res = await fetch('https://intellmeet-ai-powered-enterpris.onrender.com/api/history', { method: 'DELETE' });
      if (res.ok) {
        setHistoryLogs([]);
        setSummaryStats({ totalMeetings: 0, totalMinutes: 0, avgEngagement: 0, peakUsersAllTime: 0 });
        alert("Success: Archival cache records wiped clean.");
      } else {
        throw new Error("Backend infrastructure rejection.");
      }
    } catch (err) {
      console.error("Failed clearing telemetry history matrix:", err);
      alert("Error clearing system history archive cache.");
    }
  };

  /**
   * Resets active sessions tokens and flags to sign out user nodes completely
   */
  const handleProfileLogout = () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
    setView('AUTH');
    setShowProfileModal(false);
    setRoomPassword('');
    setJoinPasswordInput('');
    setActiveJoinRequests([]);
    setIsHostRole(false);
    setIsApprovedGuest(false);
  };

  const loadHistoricalAnalytics = async () => {
    try {
      const resHist = await fetch('https://intellmeet-ai-powered-enterpris.onrender.com/api/history');
      const dataHist = await resHist.json();
      setHistoryLogs(Array.isArray(dataHist) ? dataHist : [dataHist]);

      const resStat = await fetch('https://intellmeet-ai-powered-enterpris.onrender.com/api/analytics/summary');
      const dataStat = await resStat.json();
      setSummaryStats(dataStat);
    } catch (err) {
      console.error("Failed fetching analytics pipeline metadata:", err);
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    // Connect socket on dashboard initialization to handle join-request handshakes seamlessly
    if (view === 'DASHBOARD' || view === 'ROOM') {
      if (!socket.connected) {
        socket.connect();
      }
    }

    // Handlers for incoming verification challenges
    socket.on('join-request-received', (data) => {
      // Triggered on host instance when another guest requests entry
      setActiveJoinRequests(prev => [...prev, data]);
    });

    socket.on('join-request-approved', ({ approvedRoomId }) => {
      // Triggered on guest instance when host hits accept
      setRoomId(approvedRoomId);
      setIsApprovedGuest(true);
      setConnectionStatus('Synchronized');
      setView('ROOM');
    });

    socket.on('join-request-denied', () => {
      alert("❌ Entry Rejection: The session host has denied your request to sync with this node.");
      setIsApprovedGuest(false);
      setIsHostRole(false);
      setView('DASHBOARD');
    });

    // Real-time duplicate room-name guard: fired by the backend in response to
    // 'register-session-security' when the requested room name is already live.
    socket.on('room-creation-allowed', ({ roomId: allowedRoomId }) => {
      setCreateRoomError('');
      setIsHostRole(true);
      setIsApprovedGuest(false);
      setRoomId(allowedRoomId);
      setView('ROOM');
    });

    socket.on('room-creation-failed', ({ message }) => {
      setCreateRoomError(message || 'That room name already exists. Please use a different name, or use Join Session to join the existing room.');
    });

    // Fired on every non-host participant's client the moment the host terminates
    // the session — forces them out immediately rather than lingering in a dead room.
    socket.on('session-terminated', ({ message }) => {
      alert(`🛑 ${message || 'The host has ended this session. You have been disconnected.'}`);
      terminateActiveStreams();
      setIsHostRole(false);
      setIsApprovedGuest(false);
      setActiveJoinRequests([]);
      setView('DASHBOARD');
    });

    return () => {
      socket.off('join-request-received');
      socket.off('join-request-approved');
      socket.off('join-request-denied');
      socket.off('room-creation-allowed');
      socket.off('room-creation-failed');
      socket.off('session-terminated');
    };
  }, [view]);

  useEffect(() => {
    if (view !== 'ROOM') return;

    // If guest is still waiting for host approval, do not execute WebRTC setup yet
    if (!isHostRole && !isApprovedGuest) {
      setConnectionStatus('Awaiting Host Approval...');
      return;
    }

    let isMounted = true;

    const startSignalingPipeline = async () => {
      await initializeMedia();
      if (!isMounted) return;
      socket.emit('join-room', { roomId, userName });
    };

    startSignalingPipeline();

    socket.on('current-room-peers', async (existingPeersList) => {
      if (!isMounted) return;
      const filteredPeers = existingPeersList
        .filter(peer => peer.id !== socket.id)
        .map(peer => ({ socketId: peer.id, userName: peer.name }));
      
      setActivePeers(filteredPeers);

      for (const peer of filteredPeers) {
        await initializePeerConnection(peer.socketId, false);
      }
    });

    socket.on('user-joined', async ({ socketId, userName: incomingName }) => {
      if (!isMounted) return;
      if (socketId === socket.id) return;

      setActivePeers((prev) => {
        if (prev.some(p => p.socketId === socketId)) return prev;
        return [...prev, { socketId, userName: incomingName }];
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: "SYSTEM // DATA",
          text: `✨ Operational Node "${incomingName}" has linked into the matrix.`,
          timestamp: new Date().toLocaleTimeString(),
          isSystem: true
        }
      ]);

      await initializePeerConnection(socketId, true);
    });

    socket.on('offer', async (data) => {
      const { offer, senderId } = data;
      if (senderId === socket.id) return;

      setActivePeers((prev) => {
        if (prev.some(p => p.socketId === senderId)) return prev;
        return [...prev, { socketId: senderId, userName: "Remote Operator" }];
      });

      await initializePeerConnection(senderId, false);
      const pc = peerConnections.current[senderId];
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { answer, targetSocketId: senderId });
      } catch (err) {
        console.error("Failed managing incoming WebRTC proposal offer description:", err);
      }
    });

    socket.on('answer', async (data) => {
      const { answer, senderId } = data;
      const pc = peerConnections.current[senderId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Failed parsing description handshakes response:", err);
        }
      }
    });

    socket.on('ice-candidate', (data) => {
      const { candidate, senderId } = data;
      const pc = peerConnections.current[senderId];
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          console.error("Error establishing network candidate mapping array index:", err);
        });
      }
    });

    socket.on('user-left', ({ socketId, userName: leavingName }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: "SYSTEM // DATA",
          text: `🚨 Operational Node "${leavingName || 'Unknown Operator'}" terminated synchronization connection.`,
          timestamp: new Date().toLocaleTimeString(),
          isSystem: true
        }
      ]);
      cleanPeerNodeContext(socketId);
    });

    return () => {
      isMounted = false;
      socket.off('current-room-peers');
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-left');
      terminateActiveStreams();
    };
  }, [view, roomId, isApprovedGuest, isHostRole]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setConnectionStatus("Connected // Active Mesh");
      startVoiceRecorderStreaming(stream);
    } catch (err) {
      console.error("Hardware streaming context initialization failed completely:", err);
      setConnectionStatus("Degraded Grid // No Camera Input Found");
    }
  };

  const startVoiceRecorderStreaming = (stream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("No audio track available on the media stream — skipping voice recorder setup.");
        return;
      }

      // MediaRecorder requires the stream's tracks to match the requested container.
      // Passing the full audio+video stream while requesting an audio-only mimeType
      // ('audio/webm') throws "There was an error starting the MediaRecorder" in Chrome,
      // so build an audio-only stream from just the audio track(s) instead.
      const audioOnlyStream = new MediaStream(audioTracks);

      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        console.warn("audio/webm is not supported in this browser — voice recording will be skipped.");
        return;
      }

      const options = { mimeType: 'audio/webm' };
      const recorder = new MediaRecorder(audioOnlyStream, options);
      voiceRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && socket.connected) {
          const arrayBuffer = await e.data.arrayBuffer();
          socket.emit('audio-chunk', { roomId, buffer: arrayBuffer });
        }
      };
      recorder.start(1000); // Send audio increments every 1000ms
    } catch (e) {
      console.error("Real-time telemetry pipeline audio parsing failed:", e.message);
    }
  };

  const initializePeerConnection = async (peerSocketId, isOfferCreator) => {
    if (peerConnections.current[peerSocketId]) return peerConnections.current[peerSocketId];

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerSocketId] = pc;

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('ice-candidate', { candidate: e.candidate, targetSocketId: peerSocketId });
      }
    };

    pc.ontrack = (e) => {
      const remoteVideoElement = document.getElementById(`video-element-${peerSocketId}`);
      if (remoteVideoElement && e.streams[0]) {
        remoteVideoElement.srcObject = e.streams[0];
      }
    };

    if (isOfferCreator) {
      const channel = pc.createDataChannel("meshCollabDataChannelExchange");
      setupDataChannelLifecycleHandlers(peerSocketId, channel);
      
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer, targetSocketId: peerSocketId });
      } catch (err) {
        console.error("Error formulating system discovery requests details:", err);
      }
    } else {
      pc.ondatachannel = (e) => {
        setupDataChannelLifecycleHandlers(peerSocketId, e.channel);
      };
    }

    return pc;
  };

  const setupDataChannelLifecycleHandlers = (peerSocketId, channel) => {
    channel.onopen = () => {
      setDataChannels(prev => ({ ...prev, [peerSocketId]: channel }));
    };
    channel.onclose = () => {
      setDataChannels(prev => {
        const copy = { ...prev };
        delete copy[peerSocketId];
        return copy;
      });
    };
    channel.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'CHAT_STREAM_BROADCAST') {
          setMessages(prev => [...prev, payload.messagePayload]);
        } else if (payload.type === 'SCRATCHPAD_NOTE_SYNC') {
          setSharedNotes(payload.textBlob);
        }
      } catch (err) {
        console.error("Failed to parse cross-channel byte buffers:", err);
      }
    };
  };

  const sendMessageViaDataChannel = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const atomicMessage = {
      id: `msg-${Date.now()}`,
      sender: userName,
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString(),
      target: privateTarget
    };

    // Log internally immediately
    setMessages(prev => [...prev, atomicMessage]);

    // Format target parameters for persistence over server-side trackers
    socket.emit('chat-logged', { roomId, sender: userName, text: chatInput.trim() });

    const wirePayload = JSON.stringify({
      type: 'CHAT_STREAM_BROADCAST',
      messagePayload: atomicMessage
    });

    if (privateTarget === 'ALL') {
      Object.values(dataChannels).forEach(channel => {
        if (channel.readyState === 'open') channel.send(wirePayload);
      });
    } else {
      const targetChannel = dataChannels[privateTarget];
      if (targetChannel && targetChannel.readyState === 'open') {
        targetChannel.send(wirePayload);
      }
    }

    setChatInput('');
  };

  const synchronizeScratchpadState = (updatedTextValue) => {
    setSharedNotes(updatedTextValue);
    socket.emit('notes-logged', { roomId, notes: updatedTextValue });

    const scratchpadPayload = JSON.stringify({
      type: 'SCRATCHPAD_NOTE_SYNC',
      textBlob: updatedTextValue
    });

    Object.values(dataChannels).forEach(channel => {
      if (channel.readyState === 'open') channel.send(scratchpadPayload);
    });
  };

  const toggleHardwareTrack = (trackKind) => {
    if (!localStream.current) return;
    if (trackKind === 'VIDEO') {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    } else {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const cleanPeerNodeContext = (peerSocketId) => {
    if (peerConnections.current[peerSocketId]) {
      peerConnections.current[peerSocketId].close();
      delete peerConnections.current[peerSocketId];
    }
    setDataChannels(prev => {
      const copy = { ...prev };
      delete copy[peerSocketId];
      return copy;
    });
    setActivePeers(prev => prev.filter(p => p.socketId !== peerSocketId));
  };

  const terminateActiveStreams = () => {
    if (voiceRecorderRef.current && voiceRecorderRef.current.state !== 'inactive') {
      voiceRecorderRef.current.stop();
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    Object.keys(peerConnections.current).forEach(cleanPeerNodeContext);
    setConnectionStatus("Disconnected");
    setActivePeers([]);
    setMessages([]);
    setSharedNotes('');
  };

  const handleDisconnectAction = () => {
    // If the host is the one ending the session, kick every other participant
    // out immediately instead of just quietly leaving and letting them linger.
    if (isHostRole && socket.connected) {
      socket.emit('host-terminate-session', { roomId });
    }

    terminateActiveStreams();
    socket.emit('leave-room', { roomId });
    // Force an actual socket disconnect so the backend's native disconnect handler
    // broadcasts 'user-left' to remaining peers in real time (matches code_1 behavior
    // where leaving a session fully tears down the connection rather than lingering).
    if (socket.connected) {
      socket.disconnect();
    }
    setIsHostRole(false);
    setIsApprovedGuest(false);
    setView('POST_SESSION');
  };

  const requestAccessFromHostNode = (e) => {
    e.preventDefault();
    if (!roomId.trim()) return alert("Invalid entry key string parameters.");

    setIsHostRole(false);
    setIsApprovedGuest(false);

    // Send standard authentication gatekeeping payload over socket connection (code_1 event contract)
    socket.emit('verify-and-request-join', {
      roomId: roomId.trim(),
      userName: userName,
      passwordAttempt: joinPasswordInput,
      guestSocketId: socket.id
    });

    // Immediately display the room layout shell (Holding State View), like code_1
    setView('ROOM');
  };

  const createNewAuthenticatedRoomMatrix = (e) => {
    e.preventDefault();
    if (!roomId.trim()) return alert("Room workspace label cannot remain empty.");

    setCreateRoomError('');

    // Do NOT flip to the ROOM view yet — wait for the backend's real-time
    // 'room-creation-allowed' / 'room-creation-failed' response so a duplicate
    // room name is caught before we ever try to join it.
    socket.emit('register-session-security', { roomId: roomId.trim(), password: roomPassword });
  };

  const approveIncomingGuestRequest = (requestData) => {
    socket.emit('host-decision-join', {
      guestSocketId: requestData.guestSocketId,
      approvedRoomId: roomId,
      status: 'ACCEPTED'
    });
    setActiveJoinRequests(prev => prev.filter(r => r.guestSocketId !== requestData.guestSocketId));
  };

  const denyIncomingGuestRequest = (requestData) => {
    socket.emit('host-decision-join', {
      guestSocketId: requestData.guestSocketId,
      approvedRoomId: roomId,
      status: 'DENIED'
    });
    setActiveJoinRequests(prev => prev.filter(r => r.guestSocketId !== requestData.guestSocketId));
  };

  if (view === 'AUTH') {
    return (
      <div style={currentStyles.appContainer}>
        <header style={currentStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              {theme === 'NEON_CYBER' ? '⚡ INTELMEET // CORE ENGINE' : 'Intelmeet Workspace'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              style={currentStyles.themeToggleBtn}
              onClick={() => setTheme(theme === 'NEON_CYBER' ? 'LIGHT_MINIMAL' : 'NEON_CYBER')}
            >
              {theme === 'NEON_CYBER' ? '☀️ Minimal Theme' : '🌙 Cyber Matrix'}
            </button>
          </div>
        </header>
        <div style={currentStyles.centerView}>
          <LoginCard onAuthSuccess={handleAuthSuccess} theme={theme} />
        </div>
      </div>
    );
  }

  return (
    <div style={currentStyles.appContainer}>
      <header style={currentStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            {theme === 'NEON_CYBER' ? '⚡ INTELMEET // CORE ENGINE' : 'Intelmeet Workspace'}
          </h2>
          {view === 'ROOM' && (
            <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 'bold' }}>
              📡 CHANNEL: {roomId}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            style={currentStyles.themeToggleBtn} 
            onClick={() => setTheme(theme === 'NEON_CYBER' ? 'LIGHT_MINIMAL' : 'NEON_CYBER')}
          >
            {theme === 'NEON_CYBER' ? '☀️ Minimal Theme' : '🌙 Cyber Matrix'}
          </button>

          {view === 'DASHBOARD' && (
            <button
              style={{ ...currentStyles.themeToggleBtn, border: '1px solid #10b981', color: '#10b981' }}
              onClick={() => { loadHistoricalAnalytics(); setView('POST_SESSION'); }}
            >
              📊 Telemetry Analysis Dashboard
            </button>
          )}

          <div style={currentStyles.profileBadgeContainer} onClick={() => setShowProfileModal(true)}>
            <span style={currentStyles.avatarIcon}>👤</span>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>{userName}</span>
          </div>

          {view === 'ROOM' && (
            <button style={currentStyles.btnDisconnect} onClick={handleDisconnectAction}>
              ❌ Terminate Link
            </button>
          )}
        </div>
      </header>

      {showProfileModal && (
        <div style={currentStyles.modalBackdrop} onClick={() => setShowProfileModal(false)}>
          <div style={currentStyles.profileModal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0 }}>Operator Node Information</h4>
              <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: '13px', margin: '6px 0' }}><strong>Handle:</strong> {userName}</p>
            <p style={{ fontSize: '13px', margin: '6px 0' }}><strong>Assigned Role:</strong> {userRole}</p>
            <p style={{ fontSize: '13px', margin: '6px 0' }}><strong>Grid Interface Address:</strong> {userEmail}</p>
            <button 
              style={{ ...currentStyles.btnPrimary, backgroundColor: '#ef4444', color: '#fff', marginTop: '16px' }}
              onClick={handleProfileLogout}
            >
              Log Out Node Configuration
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD GATEKEEPER VIEW */}
      {view === 'DASHBOARD' && (
        <div style={currentStyles.centerView}>
          <div style={currentStyles.glassCard}>
            <span style={currentStyles.badgeTop}>Security Perimeter Check</span>
            <h3 style={{ marginTop: 0, color: currentStyles.textPrimary }}>Initialize Vector Target</h3>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: '#020617', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <button 
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', color: '#fff', backgroundColor: dashboardOption === 'CREATE' ? '#1e293b' : 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => { setDashboardOption('CREATE'); setCreateRoomError(''); }}
              >
                Create Terminal
              </button>
              <button 
                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', color: '#fff', backgroundColor: dashboardOption === 'JOIN' ? '#1e293b' : 'transparent', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => { setDashboardOption('JOIN'); setCreateRoomError(''); }}
              >
                Join Coordinates
              </button>
            </div>

            {dashboardOption === 'CREATE' ? (
              <form onSubmit={createNewAuthenticatedRoomMatrix}>
                <label style={currentStyles.fieldLabel}>Workspace Session ID</label>
                <input
                  style={currentStyles.input}
                  type="text"
                  value={roomId}
                  onChange={(e) => { setRoomId(e.target.value); setCreateRoomError(''); }}
                />

                <label style={currentStyles.fieldLabel}>Authentication Password (Optional)</label>
                <input style={currentStyles.input} type="password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)} placeholder="••••••••" />

                {createRoomError && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    lineHeight: '1.5'
                  }}>
                    ⚠️ {createRoomError}{' '}
                    <button
                      type="button"
                      onClick={() => { setDashboardOption('JOIN'); setCreateRoomError(''); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 }}
                    >
                      Switch to Join Session
                    </button>
                  </div>
                )}

                <button style={currentStyles.btnPrimary} type="submit">Deploy Workspace Node</button>
              </form>
            ) : (
              <form onSubmit={requestAccessFromHostNode}>
                <label style={currentStyles.fieldLabel}>Destination Target Workspace Coordinate</label>
                <input style={currentStyles.input} type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} />

                <label style={currentStyles.fieldLabel}>Verification Access Password</label>
                <input style={currentStyles.input} type="password" value={joinPasswordInput} onChange={(e) => setJoinPasswordInput(e.target.value)} placeholder="••••••••" />

                <button style={currentStyles.btnPrimary} type="submit">Propose Infrastructure Connection</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CORE ACTIVE WORKSPACE MESH VIEW */}
      {view === 'ROOM' && (!isHostRole && !isApprovedGuest) && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2, 6, 23, 0.95)' }}>
          <div style={{ ...currentStyles.glassCard, textAlign: 'center', border: '1px dashed #eab308' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
            <h3 style={{ color: '#eab308', marginTop: 0 }}>CONNECTED TO SECURITY GATEWAY</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>Room: <strong>{roomId}</strong></p>
            <p style={{ fontSize: '14px' }}>Awaiting explicit room synchronization approval confirmation from the active Host layout...</p>
            <button
              style={{ ...currentStyles.btnDisconnect, marginTop: '20px' }}
              onClick={() => {
                socket.emit('leave-room', { roomId });
                setIsHostRole(false);
                setIsApprovedGuest(false);
                setView('DASHBOARD');
              }}
            >
              Cancel Request
            </button>
          </div>
        </div>
      )}

      {view === 'ROOM' && (isHostRole || isApprovedGuest) && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
          {/* DYNAMIC HOST VERIFICATION NOTIFICATION BAR POPPING UP INSIDE THE ROOM */}
          {isHostRole && activeJoinRequests.length > 0 && (
            <div style={{ position: 'absolute', top: '12px', left: '20px', right: '20px', zIndex: 99, padding: '16px', backgroundColor: '#0f172a', border: '2px solid #eab308', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
              <div style={{ color: '#eab308', fontWeight: 'bold', marginBottom: '10px' }}>📡 PENDING INBOUND ACCESS REQUEST HANDSHAKES</div>
              {activeJoinRequests.map((req) => (
                <div key={req.guestSocketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontSize: '14px' }}>Operator <strong>{req.userName}</strong> wants to sync to your hardware frame.</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ padding: '6px 12px', backgroundColor: '#22c55e', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => approveIncomingGuestRequest(req)}>Accept</button>
                    <button style={{ padding: '6px 12px', backgroundColor: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => denyIncomingGuestRequest(req)}>Deny</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={currentStyles.networkBar}>
            <div>
              <strong>Status:</strong> {connectionStatus} | <strong>Roster:</strong> {activePeers.length + 1} Node(s) Synchronized
              {' | '}<strong>Role:</strong> <span style={{ color: '#22c55e' }}>{isHostRole ? 'HOST CONTROL' : 'SYNCHRONIZED MEMBER'}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
              <button 
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={() => setShowPeerRoster(!showPeerRoster)}
              >
                👥 Members List ({activePeers.length + 1}) {activeJoinRequests.length > 0 && `⚠️ (${activeJoinRequests.length})`}
              </button>

              {showPeerRoster && (
                <div style={currentStyles.rosterSidebarContainer}>
                  <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>Active Matrix Roster</h4>
                  <div style={currentStyles.rosterRowItem}>
                    <div style={{ ...currentStyles.statusDot, backgroundColor: '#22c55e' }} />
                    <span style={{ fontSize: '13px' }}>{userName} (You - Host/Member)</span>
                  </div>
                  {activePeers.map((peer) => (
                    <div key={peer.socketId} style={currentStyles.rosterRowItem}>
                      <div style={{ ...currentStyles.statusDot, backgroundColor: '#38bdf8' }} />
                      <span style={{ fontSize: '13px', flex: 1 }}>{peer.userName}</span>
                      <button 
                        style={currentStyles.miniDirectChatBtn}
                        onClick={() => { setPrivateTarget(peer.socketId); setShowPeerRoster(false); }}
                      >
                        DM
                      </button>
                    </div>
                  ))}

                  {activeJoinRequests.length > 0 && (
                    <div style={{ marginTop: '16px', borderTop: '2px dashed #ef4444', paddingTop: '12px' }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>⚠️ Core Entry Requests</h5>
                      {activeJoinRequests.map((req) => (
                        <div key={req.guestSocketId} style={{ fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', marginBottom: '6px', border: '1px solid #334155' }}>
                          <p style={{ margin: '0 0 4px 0' }}><strong>Node:</strong> {req.userName}</p>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button style={{ flex: 1, backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }} onClick={() => approveIncomingGuestRequest(req)}>Accept</button>
                            <button style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px' }} onClick={() => denyIncomingGuestRequest(req)}>Deny</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={currentStyles.workspace}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={currentStyles.videoGrid}>
                <div style={currentStyles.videoCard}>
                  <video ref={localVideoRef} autoPlay playsInline muted style={currentStyles.videoElementMirror} />
                  <div style={currentStyles.videoOverlayBadge}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                    {userName} (Local Matrix Node Target)
                  </div>
                  <div style={currentStyles.hardwareControlsContainer}>
                    <button style={currentStyles.toggleBtn} onClick={() => toggleHardwareTrack('VIDEO')}>
                      {isCameraOn ? '📹 Camera Active' : '🚫 Video Stream Offline'}
                    </button>
                    <button style={currentStyles.toggleBtn} onClick={() => toggleHardwareTrack('AUDIO')}>
                      {isMicOn ? '🎙️ Mic Active' : '🚫 Audio Transmit Cut'}
                    </button>
                  </div>
                </div>

                {activePeers.map((peer) => (
                  <div key={peer.socketId} style={currentStyles.videoCard}>
                    <video id={`video-element-${peer.socketId}`} autoPlay playsInline style={currentStyles.videoElement} />
                    <div style={currentStyles.videoOverlayBadge}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                      {peer.userName}
                    </div>
                  </div>
                ))}
              </div>

              <div style={currentStyles.collabContainer}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', marginBottom: '6px' }}>
                  📝 Collaborative Core Scratchpad Layer (Propagates automatically via data channels)
                </div>
                <textarea 
                  style={currentStyles.textArea} 
                  value={sharedNotes} 
                  onChange={(e) => synchronizeScratchpadState(e.target.value)} 
                  placeholder="Type notes or code snippets here to update all concurrent peers instantly..." 
                />
              </div>
            </div>

            <div style={currentStyles.sidebar}>
              {privateTarget !== 'ALL' && (
                <div style={currentStyles.chatTargetSelectorSubBar}>
                  <span style={{ fontSize: '11px', color: '#a855f7' }}>🔒 Direct Encryption Active</span>
                  <button style={currentStyles.clearPrivateBtn} onClick={() => setPrivateTarget('ALL')}>✕ Clear Private Link</button>
                </div>
              )}

              <div style={currentStyles.chatFeed}>
                {messages.map((m) => (
                  <div key={m.id || Math.random()} style={{ ...currentStyles.chatBubble, borderLeftColor: m.target !== 'ALL' ? '#a855f7' : '#38bdf8' }}>
                    <div style={currentStyles.chatMeta}>
                      <strong>{m.sender}</strong> {m.target !== 'ALL' && '🔒 (Private Vector)'}
                    </div>
                    <div style={{ color: currentStyles.chatText }}>{m.text}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={sendMessageViaDataChannel} style={currentStyles.chatForm}>
                <input 
                  style={currentStyles.chatInput} 
                  type="text" 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  placeholder={privateTarget === 'ALL' ? "Broadcast signal message..." : "Direct message target peer..."} 
                />
                <button style={currentStyles.chatSendBtn} type="submit">Send</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* POST-SESSION RECONSTRUCTION ANALYTICS DASHBOARD VIEW */}
      {view === 'POST_SESSION' && (
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, color: currentStyles.textPrimary }}>Telemetry Analysis Dashboard</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Aggregated operations data parsed straight from persistent storage layers.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ ...currentStyles.btnDisconnect, backgroundColor: '#475569' }} onClick={loadHistoricalAnalytics}>
                🔄 Refresh Logs
              </button>
              <button style={{ ...currentStyles.btnDisconnect, backgroundColor: '#ef4444' }} onClick={clearSessionHistoryCache}>
                🗑️ Wipe Cache
              </button>
              <button style={{ ...currentStyles.themeToggleBtn, border: '1px solid #10b981', color: '#10b981' }} onClick={() => setView('DASHBOARD')}>
                Return to Command Terminal
              </button>
            </div>
          </div>

          <div style={analyticsStyles.metricGrid}>
            <div style={analyticsStyles.metricCard}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Sessions Managed</div>
              <div style={analyticsStyles.giantStat}>{summaryStats.totalMeetings}</div>
            </div>
            <div style={analyticsStyles.metricCard}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Operational Output Duration</div>
              <div style={analyticsStyles.giantStat}>{summaryStats.totalMinutes} Mins</div>
            </div>
            <div style={analyticsStyles.metricCard}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>Mean Engagement Factor</div>
              <div style={analyticsStyles.giantStat}>{summaryStats.avgEngagement}%</div>
            </div>
            <div style={analyticsStyles.metricCard}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>All-Time High Density Load</div>
              <div style={analyticsStyles.giantStat}>{summaryStats.peakUsersAllTime} Nodes</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <input 
              style={{ ...currentStyles.input, maxWidth: '360px' }} 
              type="text" 
              placeholder="Filter session logs archive..." 
              value={searchFilter} 
              onChange={(e) => setSearchFilter(e.target.value)} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {historyLogs.filter(log => log.roomId.includes(searchFilter) || log.host.includes(searchFilter)).length > 0 ? (
              historyLogs.filter(log => log.roomId.includes(searchFilter) || log.host.includes(searchFilter)).map((session) => {
                const cleanRoomId = session.roomId.trim();
                return (
                  <div key={session.sessionId} style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '16px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#38bdf8' }}>Room ID: {session.roomId}</h4>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Session Target ID Node: {session.sessionId}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '24px', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Session Commander</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{session.host}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Time Span Parameters</div>
                          <div style={{ fontSize: '13px' }}>{session.startTime} — {session.endTime}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Length Metrics</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{session.durationMinutes} Mins</div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Signals Logged</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{session.chatMessagesCount} Arrays</div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Peak Participants</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>{session.peakParticipants} Connected</div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Engagement Vector</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', color: '#10b981' }}>{session.engagementScore}%</div>
                      </div>
                    </div>

                    {session.aiSummary && (
                      <div style={{ backgroundColor: 'rgba(56,189,248,0.02)', border: '1px solid rgba(56,189,248,0.1)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                          🎙️ AI Audio Summary
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#cbd5e1' }}>{session.aiSummary}</p>
                      </div>
                    )}

                    {session.chatSummary && (
                      <div style={{ backgroundColor: 'rgba(168,85,247,0.02)', border: '1px solid rgba(168,85,247,0.1)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                          💬 AI Chat Summary
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#cbd5e1' }}>{session.chatSummary}</p>
                      </div>
                    )}

                    {Array.isArray(session.actionItems) && session.actionItems.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', color: '#a855f7', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                          ⚡ Extracted High-Priority Target Action Matrix
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#cbd5e1' }}>
                          {session.actionItems.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                      {session.audioFileName && (
                        <a
                          href={`https://intellmeet-ai-powered-enterpris.onrender.com/api/download-audio/${session.audioFileName}`}
                          download
                          style={{
                            ...currentStyles.themeToggleBtn,
                            backgroundColor: 'rgba(168,85,247,0.1)',
                            border: '1px solid #a855f7',
                            color: '#a855f7',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          🎧 Download Session Audio
                        </a>
                      )}
                      <button 
                        style={{ ...currentStyles.themeToggleBtn, backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid #38bdf8', color: '#38bdf8' }}
                        onClick={async () => {
                          try {
                            const response = await fetch('https://intellmeet-ai-powered-enterpris.onrender.com/api/reports');
                            const files = await response.json();
                            const targetFile = files
                              .filter(file => file.includes(cleanRoomId))
                              .sort()
                              .pop();

                            if (targetFile) {
                              window.open(`https://intellmeet-ai-powered-enterpris.onrender.com/session_reports/${targetFile}`, '_blank');
                            } else {
                              alert(`No binary PDF report asset found compiled yet for room code: ${cleanRoomId}.`);
                            }
                          } catch (err) {
                            console.error("Failed to fetch reports directory map:", err.message);
                            alert("⚠️ Communication breakdown with backend asset directory service.");
                          }
                        }}
                      >
                        📥 Download Executive PDF Report
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic', border: '1px dashed #334155', borderRadius: '8px' }}>
                No historical matching sessions found within core intelligence indices matching filter: "{searchFilter}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
