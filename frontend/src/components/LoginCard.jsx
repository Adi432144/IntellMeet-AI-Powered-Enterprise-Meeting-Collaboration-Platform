import React, { useState } from 'react';

export default function LoginCard({ onAuthSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegisterMode ? { name, email, password } : { email, password };

    try {
      const response = await fetch(`https://intellmeet-ai-powered-enterprise-meeting-hbvs.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Operational transmission exception.');
      }

      if (isRegisterMode) {
        setSuccessMessage('Account provisioned successfully! Switching to Login...');
        setName('');
        setPassword('');
        setTimeout(() => {
          setIsRegisterMode(false);
          setSuccessMessage('');
        }, 2000);
      } else {
        // Log user directly into the main app dashboard core mesh
        onAuthSuccess(data.user);
      }
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>
        {isRegisterMode ? 'PROVISION OPERATOR ACCOUNT' : 'SECURE MESH INTERACTION'}
      </h2>
      <p style={styles.subtitle}>
        {isRegisterMode ? 'Register profile directly into Relational SQL storage matrix.' : 'Provide clearance tokens to bridge internal node streams.'}
      </p>

      {errorMessage && <div style={styles.errorBox}>⚠️ {errorMessage}</div>}
      {successMessage && <div style={styles.successBox}>✨ {successMessage}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        {isRegisterMode && (
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name / Node Call Sign</label>
            <input 
              type="text" 
              style={styles.input} 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Engineer Delta" 
              required 
            />
          </div>
        )}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Corporate Email Address</label>
          <input 
            type="email" 
            style={styles.input} 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="operator@intellmeet.core" 
            required 
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Access Clearance Password</label>
          <input 
            type="password" 
            style={styles.input} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••••••" 
            required 
          />
        </div>

        <button type="submit" style={styles.submitBtn}>
          {isRegisterMode ? 'Commit to Relational Database' : 'Authenticate Console Node'}
        </button>
      </form>

      <div style={styles.toggleContainer}>
        <button 
          onClick={() => {
            setIsRegisterMode(!isRegisterMode);
            setErrorMessage('');
            setSuccessMessage('');
          }} 
          style={styles.toggleBtn}
        >
          {isRegisterMode ? 'Already registered? Access Bridge Login' : 'Need an profile account? Initialize Registration'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '36px',
    width: '100%',
    maxWidth: '420px',
    boxSizing: 'border-box',
    textAlign: 'left',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '18px',
    fontWeight: '800',
    letterSpacing: '1px',
    color: '#38bdf8',
  },
  subtitle: {
    margin: '0 0 24px 0',
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(7, 10, 19, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '12px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    textTransform: 'uppercase',
  },
  toggleContainer: {
    marginTop: '20px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '16px',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#38bdf8',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '16px',
  },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#4ade80',
    fontSize: '13px',
    marginBottom: '16px',
  },
};
