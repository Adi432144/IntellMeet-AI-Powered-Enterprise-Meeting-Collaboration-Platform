// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './context/SocketContext';
import { useWebRTC } from './hooks/useWebRTC';

export default function App() {
  // Identity and Session States
  const [inCall, setInCall] = useState(false);
  const [roomId, setRoomId] = useState('enterprise-alpha');
  const [userName, setUserName] = useState(`User_${Math.floor(Math.random() * 900 + 100)}`);
  const [userId] = useState(`usr_${Math.random().toString(36).substr(2, 9)}`);

  // UI Component Layout Controls
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const { socket, localStream, startLocalMedia, peerStreams } = useSocket();
  const localVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  // Hook up our modular WebRTC Signaling Mesh network layer
  useWebRTC(inCall ? roomId : null, userId, userName);

  // Bind the local camera/mic stream to the local video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, inCall]);

  // Socket event monitoring for real-time text exchange
  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (messagePayload) => {
      setMessages((prev) => [...prev, messagePayload]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, [socket]);

  // Autoscroll chat window to bottom on new message events
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    if (!roomId.trim() || !userName.trim()) return;
    try {
      await startLocalMedia();
      setInCall(true);
    } catch (err) {
      alert('Hardware acquisition failed. Please enable camera and microphone options.');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('send-message', { text: chatInput });
    setChatInput('');
  };

  // frontend/src/App.jsx
  
  const handleTriggerAIPipeline = async () => {
    // 1. Enter the loading phase to spin up the purple visual loaders
    setIsProcessingAI(true);

    // 2. Gather all current chat text to pass as context for the transcript
    const aggregateTranscript = messages.length > 0 
      ? messages.map(m => `${m.sender.userName}: ${m.text}`).join('\n')
      : "No spoken transmission metrics recorded. Default session protocol analysis initialized.";

    try {
      // 3. Dispatch the payload across your local port straight to MongoDB & OpenAI
      const response = await fetch('http://localhost:5000/api/meetings/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: roomId,
          transcriptText: aggregateTranscript
        })
      });

      const data = await response.json();

      if (data.success) {
        // 4. Populate your beautiful glassmorphic UI with the actual database response!
        setAiInsights({
          aiSummary: data.aiSummary,
          actionItems: data.actionItems
        });
      } else {
        alert(`Pipeline Processing Refused: ${data.error}`);
      }
    } catch (error) {
      console.error("💥 UI Failed communication link with server:", error);
      alert("Could not reach the processing server. Verify your backend is running.");
    } finally {
      // 5. Terminate the loading spinner animation state
      setIsProcessingAI(false);
    }
  };

  // =========================================================================
  // VIEWPORT LAYOUT 1: DYNAMIC ANIMATED GATEWAY LOBBY
  // =========================================================================
  if (!inCall) {
    return (
      <div style={styles.lobbyContainer}>
        {/* Immersive Animated Background Canvas Element */}
        <div style={styles.animatedMeshBg}>
          <div style={{...styles.pulseGlow, top: '20%', left: '15%', animationDelay: '0s'}}></div>
          <div style={{...styles.pulseGlow, top: '60%', left: '75%', animationDelay: '3s', backgroundColor: '#a855f7'}}></div>
        </div>

        <div style={styles.lobbyCard}>
          {/* Header Branding Zone with Micro-Animations */}
          <div style={styles.brandContainer}>
            <h1 style={styles.brandTitle}>
              IntellMeet 
              <span style={styles.glowBadge}>LIVE</span>
            </h1>
            <div style={styles.animatedBar}></div>
          </div>
          
          <p style={styles.brandSubtitle}>AI-Powered Enterprise Collaboration Engine</p>
          
          {/* Interactive Form Processing Matrix */}
          <form onSubmit={handleJoinMeeting} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Corporate Display Name</label>
              <input 
                style={styles.inputAnimated} 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                required 
                placeholder="Enter display identity..."
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Meeting Room Identifier</label>
              <input 
                style={styles.inputAnimated} 
                type="text" 
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)} 
                required 
                placeholder="Enter room secure token..."
              />
            </div>
            
            <button style={styles.primaryButtonAnimated} type="submit">
              <span>Initialize Production Call</span>
              <span style={styles.buttonArrow}> →</span>
            </button>
          </form>

          {/* Footer Infrastructure Telemetry Status */}
          <div style={styles.lobbyFooter}>
            <div style={styles.statusIndicator}>
              <span style={styles.statusDot}></span>
              WebRTC Core Signal Ready
            </div>
            <span style={{color: '#64748b'}}>v1.0.0</span>
          </div>
        </div>

        {/* Global Keyframe CSS Injection to drive the animations natively */}
        <style>{`
          @keyframes floatGlow {
            0% { transform: translate(0, 0) scale(1); opacity: 0.3; }
            50% { transform: translate(60px, -40px) scale(1.2); opacity: 0.6; }
            100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          }
          @keyframes gradientSlide {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes pulsePulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }
  // =========================================================================
  // VIEWPORT LAYOUT 2: COLLABORATION CONSOLE (VIDEO GRID / CHAT / AI)
  // =========================================================================
 // =========================================================================
  // VIEWPORT LAYOUT 2: HIGH-FIDELITY IMMERSIVE COLLABORATION CONSOLE
  // =========================================================================
  return (
    <div style={styles.appContainer}>
      {/* Background ambient lighting element to maintain the UI design pattern */}
      <div style={styles.dashboardMeshBg}>
        <div style={{...styles.pulseGlow, top: '-10%', right: '-10%', width: '600px', height: '600px', backgroundColor: '#a855f7', opacity: 0.15}}></div>
        <div style={{...styles.pulseGlow, bottom: '-10%', left: '-10%', width: '500px', height: '500px', backgroundColor: '#0284c7', opacity: 0.15}}></div>
      </div>

      {/* Glassmorphic Status Header Control Panel */}
      <header style={styles.headerPremium}>
        <div style={styles.headerInfo}>
          <div style={styles.sessionStatusBadge}>
            <span style={styles.liveIndicatorDot}></span>
            <span style={styles.sessionText}>SECURE LINE</span>
          </div>
          <h2 style={styles.headerTitle}>Session Room: <span style={styles.roomHighlight}>{roomId}</span></h2>
        </div>
        
        <div style={styles.headerActions}>
          <div style={styles.identityTagPremium}>
            <span style={styles.avatarMock}>{userName.charAt(0).toUpperCase()}</span>
            <div>
              <div style={styles.identityLabel}>Operator Identity</div>
              <div style={styles.identityValue}>{userName}</div>
            </div>
          </div>
          <button style={styles.dangerButtonPremium} onClick={() => window.location.reload()}>
            Terminate Session
          </button>
        </div>
      </header>

      {/* Main Split-Screen Matrix Workspace */}
      <div style={styles.workspacePremium}>
        
        {/* Left Side: Video Stream Array */}
        <div style={styles.videoGridPremium}>
          <div style={styles.videoCardPremium}>
            <video ref={localVideoRef} autoPlay playsInline muted style={styles.videoStreamPremium} />
            <div style={styles.videoOverlayBadge}>
              <span style={{...styles.statusDot, backgroundColor: '#38bdf8', boxShadow: '0 0 8px #38bdf8'}}></span>
              Local Feed (You)
            </div>
          </div>

          {peerStreams.map((peer) => (
            <div key={peer.socketId} style={styles.videoCardPremium}>
              <video
                autoPlay
                playsInline
                style={styles.videoStreamPremium}
                ref={(el) => { if (el) el.srcObject = peer.stream; }}
              />
              <div style={styles.videoOverlayBadge}>
                <span style={styles.statusDot}></span>
                Remote Peer Node [{peer.socketId.substr(0, 5).toUpperCase()}]
              </div>
            </div>
          ))}
        </div>

        {/* Right Side: Command Sideboard Console */}
        <div style={styles.sidebarPremium}>
          
          {/* Encrypted Messaging Hub */}
          <div style={styles.chatSectionPremium}>
            <h3 style={styles.sidebarHeadingPremium}>
              <span style={{marginRight: '8px'}}>💬</span> Encrypted Communications
            </h3>
            
            <div style={styles.chatFeedPremium}>
              {messages.length === 0 ? (
                <div style={styles.emptyStateMessage}>No transmission data detected in active buffer channel.</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} style={styles.chatBubblePremium}>
                    <div style={styles.chatMetaPremium}>
                      <span style={styles.chatSenderName}>{msg.sender.userName}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={styles.chatTextPremium}>{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} style={styles.chatFormPremium}>
              <input 
                style={styles.chatInputPremium} 
                type="text" 
                placeholder="Type secure transmission message..." 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
              />
              <button style={styles.sendButtonPremium} type="submit">Send</button>
            </form>
          </div>

          {/* AI Orchestration & Automation Core */}
          <div style={styles.aiSectionPremium}>
            <h3 style={styles.sidebarHeadingPremium}>
              <span style={{marginRight: '8px'}}>🧠</span> Cognitive Processing Hub
            </h3>
            
            {!aiInsights ? (
              <div style={{padding: '4px'}}>
                <button style={styles.aiButtonPremium} onClick={handleTriggerAIPipeline} disabled={isProcessingAI}>
                  {isProcessingAI ? (
                    <div style={styles.loadingFlex}>
                      <div style={styles.spinnerMock}></div>
                      <span>Analyzing Audio Stream Metrics...</span>
                    </div>
                  ) : 'Compute Session Intelligence Insights'}
                </button>
              </div>
            ) : (
              <div style={styles.aiResultsPremium}>
                <div style={styles.aiBlockPremium}>
                  <div style={styles.aiBlockTitle}>Executive Summary</div>
                  <p style={styles.aiBlockContent}>{aiInsights.aiSummary}</p>
                </div>
                
                <div style={styles.aiBlockPremium}>
                  <div style={styles.aiBlockTitle}>Extracted Deliverables Matrix</div>
                  <ul style={styles.taskListPremium}>
                    {aiInsights.actionItems.map((item, idx) => (
                      <li key={idx} style={styles.taskItemPremium}>
                        <div style={styles.taskTextPremium}>🎯 {item.task}</div>
                        <div style={styles.taskUserPremium}>@{item.assigneeName}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Dynamic Keyframes Injection to handle UI micro-interactions */}
      <style>{`
        @keyframes scanlinePulse {
          0% { border-color: rgba(56, 189, 248, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          50% { border-color: rgba(56, 189, 248, 0.5); box-shadow: 0 4px 20px rgba(56, 189, 248, 0.15); }
          100% { border-color: rgba(56, 189, 248, 0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        }
        @keyframes rotationLoop {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// =========================================================================
// PRODUCTION GRAPHICS STYLING SHEETS (Clean, inline, platform independent)
// =========================================================================
const styles = {
 // Upgraded High-Fidelity UI Styling Sheets
  lobbyContainer: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh', 
    backgroundColor: '#0b0f19', 
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  animatedMeshBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    overflow: 'hidden'
  },
  pulseGlow: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    backgroundColor: '#0284c7',
    filter: 'blur(80px)',
    animation: 'floatGlow 8s infinite ease-in-out',
    pointerEvents: 'none'
  },
  lobbyCard: { 
    backgroundColor: 'rgba(30, 41, 59, 0.7)', 
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    padding: '40px', 
    borderRadius: '16px', 
    width: '100%', 
    maxWidth: '440px', 
    boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)', 
    color: '#f8fafc',
    zIndex: 2,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'transform 0.3s ease'
  },
  brandContainer: {
    marginBottom: '8px',
    position: 'relative'
  },
  brandTitle: { 
    margin: 0, 
    fontSize: '32px', 
    fontWeight: '800',
    letterSpacing: '-0.025em',
    color: '#ffffff', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  glowBadge: { 
    fontSize: '11px', 
    fontWeight: '700',
    letterSpacing: '0.05em',
    backgroundColor: 'rgba(56, 189, 248, 0.15)', 
    border: '1px solid #38bdf8',
    padding: '4px 10px', 
    borderRadius: '20px', 
    color: '#38bdf8',
    textShadow: '0 0 8px rgba(56, 189, 248, 0.5)'
  },
  animatedBar: {
    height: '3px',
    width: '60px',
    borderRadius: '2px',
    background: 'linear-gradient(90deg, #38bdf8, #a855f7)',
    marginTop: '8px'
  },
  brandSubtitle: { 
    margin: '0 0 32px 0', 
    fontSize: '14px', 
    color: '#94a3b8',
    fontWeight: '400'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '24px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { 
    fontSize: '11px', 
    textTransform: 'uppercase', 
    letterSpacing: '0.075em', 
    color: '#94a3b8', 
    fontWeight: '700' 
  },
  inputAnimated: { 
    padding: '14px 16px', 
    borderRadius: '8px', 
    border: '1px solid #334155', 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    color: '#f8fafc', 
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },
  primaryButtonAnimated: { 
    padding: '16px', 
    borderRadius: '8px', 
    border: 'none', 
    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
    color: '#ffffff', 
    fontSize: '16px', 
    fontWeight: '600', 
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px 0 rgba(2, 132, 199, 0.3)'
  },
  buttonArrow: {
    transition: 'transform 0.2s ease',
    display: 'inline-block'
  },
  lobbyFooter: {
    marginTop: '32px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(51, 65, 85, 0.5)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px'
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#94a3b8'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 8px 2px rgba(34, 197, 94, 0.5)',
    animation: 'pulsePulse 2s infinite ease-in-out'
  },
  // High-Fidelity Dashboard System Stylesheet
  appContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh', 
    backgroundColor: '#070a13', 
    color: '#f8fafc', 
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  dashboardMeshBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none' },
  headerPremium: {
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '16px 28px', 
    backgroundColor: 'rgba(15, 23, 42, 0.65)', 
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    zIndex: 2
  },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  sessionStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '2px 8px',
    borderRadius: '4px',
    width: 'fit-content'
  },
  liveIndicatorDot: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulsePulse 1.5s infinite' },
  sessionText: { fontSize: '10px', fontWeight: '700', letterSpacing: '0.05em', color: '#f87171' },
  headerTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#e2e8f0' },
  roomHighlight: { color: '#38bdf8', fontWeight: '800' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '20px' },
  identityTagPremium: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' },
  avatarMock: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' },
  identityLabel: { fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  identityValue: { fontSize: '13px', fontWeight: '600', color: '#cbd5e1' },
  dangerButtonPremium: { padding: '10px 18px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s', '&:hover': { backgroundColor: '#ef4444', color: '#fff' } },
  workspacePremium: { display: 'flex', flex: 1, overflow: 'hidden', zIndex: 2, position: 'relative' },
  videoGridPremium: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px', padding: '24px', overflowY: 'auto', alignContent: 'start' },
  videoCardPremium: { position: 'relative', aspectRatio: '16/9', backgroundColor: 'rgba(30, 41, 59, 0.3)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 12px 24px -10px rgba(0,0,0,0.4)', animation: 'scanlinePulse 6s infinite ease-in-out' },
  videoStreamPremium: { width: '100%', height: '100%', objectFit: 'cover' },
  videoOverlayBadge: { position: 'absolute', bottom: '16px', left: '16px', backgroundColor: 'rgba(11, 15, 25, 0.75)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.08)' },
  sidebarPremium: { width: '400px', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)' },
  sidebarHeadingPremium: { fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.075em', color: '#94a3b8', margin: '0 0 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' },
  chatSectionPremium: { flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  chatFeedPremium: { flex: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' },
  emptyStateMessage: { fontSize: '12px', color: '#475569', textAlign: 'center', marginTop: '20px', fontStyle: 'italic' },
  chatBubblePremium: { backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', borderLeft: '3px solid #0284c7' },
  chatMetaPremium: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '6px' },
  chatSenderName: { color: '#38bdf8', fontWeight: '700' },
  chatTextPremium: { fontSize: '13px', color: '#e2e8f0', lineHeight: '1.4' },
  chatFormPremium: { display: 'flex', gap: '10px' },
  chatInputPremium: { flex: 1, padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '13px', outline: 'none', transition: 'border 0.2s', '&:focus': { borderColor: '#0284c7' } },
  sendButtonPremium: { padding: '0 20px', backgroundColor: '#0284c7', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#fff', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s' },
  aiSectionPremium: { padding: '24px', height: '42%', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  aiButtonPremium: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(168, 85, 247, 0.25)', transition: 'transform 0.2s' },
  loadingFlex: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  spinnerMock: { width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'rotationLoop 0.8s linear infinite' },
  aiResultsPremium: { display: 'flex', flexDirection: 'column', gap: '16px' },
  aiBlockPremium: { backgroundColor: 'rgba(168, 85, 247, 0.04)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.15)', borderLeft: '3px solid #a855f7' },
  aiBlockTitle: { fontSize: '12px', fontWeight: '700', color: '#c084fc', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.025em' },
  aiBlockContent: { fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: '1.4' },
  taskListPremium: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  taskItemPremium: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,0.06)' },
  taskTextPremium: { fontSize: '13px', color: '#e2e8f0' },
  taskUserPremium: { fontSize: '11px', color: '#f472b6', fontWeight: '700', backgroundColor: 'rgba(244, 114, 182, 0.1)', padding: '2px 6px', borderRadius: '4px' }
};