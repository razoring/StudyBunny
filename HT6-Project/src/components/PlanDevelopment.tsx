import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const PlanDevelopment: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('processing');

  useEffect(() => {
    if (!documentId) return;

    let intervalId: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      try {
        const doc = await api.getDocument(documentId);
        setStatus(doc.status);

        if (doc.status === 'ready') {
          // Document processing is finished, route to Study Room
          clearInterval(intervalId);
          navigate(`/study/${documentId}`);
        } else if (doc.status === 'failed') {
          clearInterval(intervalId);
          setError('Failed to process document. Please check the file formatting and try again.');
        }
      } catch (err) {
        console.error('Error polling document status:', err);
        clearInterval(intervalId);
        setError('Error connecting to backend database.');
      }
    };

    // Initial check
    checkStatus();

    // Poll every 2 seconds
    intervalId = setInterval(checkStatus, 2000);

    return () => clearInterval(intervalId);
  }, [documentId, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px' }}>
      <div className="pixel-panel" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <h1 className="pixel-title" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>
          {error ? 'Oops!' : 'Preparing Room...'}
        </h1>

        {error ? (
          <div>
            <p style={{ color: 'var(--c-red-brown)', fontWeight: 800, marginBottom: '25px' }}>{error}</p>
            <button className="pixel-button" onClick={() => navigate('/home')}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          <div>
            {/* Spinning/pulsing retro element */}
            <div style={{ display: 'inline-block', fontSize: '4rem', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>
              ⏳
            </div>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-brown-dark)', marginBottom: '10px' }}>
              Setting up your workspace... (Status: {status})
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--c-sand-dark)' }}>
              Analyzing text and feeding the Gemini tutor model. Hang tight!
            </p>
            <div style={{
              width: '100%',
              backgroundColor: 'var(--c-sand-light)',
              border: '2px solid var(--border-color)',
              height: '20px',
              borderRadius: '4px',
              marginTop: '25px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                height: '100%',
                backgroundColor: 'var(--c-sage-dark)',
                width: '60%', /* Static/Simulated progress */
                animation: 'loading-bar 3s ease-in-out infinite'
              }} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes loading-bar {
          0% { width: 10%; }
          50% { width: 85%; }
          100% { width: 10%; }
        }
      `}</style>
    </div>
  );
};
