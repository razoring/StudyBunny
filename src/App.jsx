import { useEffect, useRef, useState } from 'react';
import { Camera, Activity, AlertTriangle, BatteryWarning, Brain, Smile, Zap, VideoOff } from 'lucide-react';
import { MockPresageAPI } from './MockPresageAPI';

function MetricCard({ title, value, unit, icon: Icon, color, percent, max = 100 }) {
  const getProgressColor = () => {
    if (color) return color;
    if (percent < 30) return '#10b981'; // green
    if (percent < 70) return '#f59e0b'; // yellow
    return '#ef4444'; // red (for negative metrics like boredom)
  };

  return (
    <div className="metric-card glass-panel">
      <div className="metric-header">
        <span>{title}</span>
        <div className="metric-icon" style={{ color: getProgressColor() }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="metric-value-container">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.min(100, Math.max(0, (percent / max) * 100))}%`, backgroundColor: getProgressColor() }}
        ></div>
      </div>
    </div>
  );
}

function App() {
  const videoRef = useRef(null);
  const apiRef = useRef(null);
  
  const [isActive, setIsActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [metrics, setMetrics] = useState({
    boredom: 0,
    distraction: 0,
    struggling: 0,
    mood: 'Initializing',
    matchPercentage: 0
  });

  const startTracking = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsActive(true);
        setCameraError(null);
        
        // Start "Presage API"
        apiRef.current = new MockPresageAPI();
        apiRef.current.start((newMetrics) => {
          setMetrics(newMetrics);
        });
      }
    } catch (err) {
      console.error(err);
      setCameraError('Camera access denied or unavailable.');
    }
  };

  const stopTracking = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (apiRef.current) {
      apiRef.current.stop();
    }
    setIsActive(false);
    setMetrics({ boredom: 0, distraction: 0, struggling: 0, mood: 'Offline', matchPercentage: 0 });
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => stopTracking();
  }, []);

  const getMoodColor = (mood) => {
    if (['Focused', 'Engaged', 'Happy'].includes(mood)) return '#10b981';
    if (['Frustrated', 'Tired'].includes(mood)) return '#ef4444';
    if (['Distracted'].includes(mood)) return '#f59e0b';
    return '#0ea5e9';
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>
          <Brain color="#6366f1" size={28} />
          Presage Spectra Dash
        </h1>
        <div className="badge">
          <div className="status-indicator" style={{ backgroundColor: isActive ? '#10b981' : '#ef4444', animation: isActive ? 'pulse 2s infinite' : 'none' }}></div>
          {isActive ? 'Tracking Active' : 'Offline'}
        </div>
      </header>

      <main className="main-content">
        <section className="camera-section glass-panel">
          <div className="camera-view-wrapper">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="video-preview"
              style={{ display: isActive ? 'block' : 'none' }}
            ></video>
            
            {isActive ? (
              <>
                <div className="camera-overlay"></div>
                <div className="face-bracket"></div>
              </>
            ) : (
              <div className="empty-state">
                {cameraError ? (
                  <>
                    <VideoOff size={48} color="#ef4444" />
                    <p style={{ color: '#ef4444' }}>{cameraError}</p>
                  </>
                ) : (
                  <>
                    <Camera size={48} opacity={0.5} />
                    <p>Camera is currently off</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
            {!isActive ? (
              <button className="btn" onClick={startTracking}>
                <Zap size={18} /> Enable Presage Smart Spectra
              </button>
            ) : (
              <button 
                className="btn" 
                onClick={stopTracking}
                style={{ background: 'linear-gradient(135deg, #ef4444, #be123c)' }}
              >
                <VideoOff size={18} /> Stop Tracking
              </button>
            )}
          </div>
        </section>

        <section className="metrics-grid">
          {/* Main Hero Card for Match Percentage */}
          <div className="metric-card glass-panel match-card">
            <div className="metric-header">
              <span>Match Percentage</span>
              <div className="metric-icon" style={{ color: '#0ea5e9' }}>
                <Activity size={24} />
              </div>
            </div>
            <div className="metric-value-container">
              <span className="metric-value">{isActive ? metrics.matchPercentage.toFixed(1) : '--'}</span>
              <span className="metric-unit">%</span>
            </div>
          </div>

          <MetricCard 
            title="Boredom" 
            value={isActive ? metrics.boredom.toFixed(0) : '--'} 
            percent={isActive ? metrics.boredom : 0} 
            icon={BatteryWarning} 
          />
          
          <MetricCard 
            title="Distraction" 
            value={isActive ? metrics.distraction.toFixed(0) : '--'} 
            percent={isActive ? metrics.distraction : 0} 
            icon={AlertTriangle} 
          />

          <MetricCard 
            title="Struggling" 
            value={isActive ? metrics.struggling.toFixed(0) : '--'} 
            percent={isActive ? metrics.struggling : 0} 
            icon={Activity} 
          />

          <div className="metric-card glass-panel mood-card">
            <div className="metric-header">
              <span>Current Mood</span>
              <div className="metric-icon" style={{ color: getMoodColor(metrics.mood) }}>
                <Smile size={20} />
              </div>
            </div>
            <div className="metric-value-container" style={{ marginTop: '0.5rem' }}>
              <span className="metric-value" style={{ color: isActive ? getMoodColor(metrics.mood) : '#949aab' }}>
                {metrics.mood}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
