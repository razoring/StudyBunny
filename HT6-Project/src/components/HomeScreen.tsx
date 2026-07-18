import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Document } from '../services/api';

const MOCK_USER_ID = 'mock_user_123';

export const HomeScreen: React.FC = () => {
  const [sessions, setSessions] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const docs = await api.listDocuments(MOCK_USER_ID);
      setSessions(docs);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      const result = await api.uploadDocument(MOCK_USER_ID, file);
      // Route to plan development page which simulates generation loading state
      navigate(`/plan/${result.document_id}`);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="pixel-title">Cozy Study Room</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--c-sand-dark)', fontWeight: 600 }}>
          Your Animal Crossing-inspired virtual learning space
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Upload Zone */}
        <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-retro)', fontSize: '2.2rem', marginBottom: '15px', color: 'var(--c-red-brown)' }}>
            Start New Session
          </h2>
          <p style={{ marginBottom: '20px', color: 'var(--c-sand-dark)' }}>
            Upload a PDF, TXT or markdown course document. We will analyze it to set up your study assistant context.
          </p>

          <label
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px dashed var(--c-sand-med)',
              borderRadius: '12px',
              padding: '40px 20px',
              cursor: 'pointer',
              backgroundColor: dragActive ? 'var(--c-mint-bright)' : 'var(--bg-panel)',
              transition: 'background-color 0.2s ease',
              textAlign: 'center',
            }}
          >
            <input type="file" onChange={handleFileInput} style={{ display: 'none' }} accept=".pdf,.txt,.md" />
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📁</div>
            {uploading ? (
              <span style={{ fontWeight: 800, color: 'var(--c-clay)' }}>Uploading document...</span>
            ) : (
              <>
                <span style={{ fontWeight: 800, color: 'var(--c-brown-dark)' }}>
                  Drag & drop your file here
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--c-sand-med)', marginTop: '5px' }}>
                  or click to browse from files
                </span>
              </>
            )}
          </label>
        </div>

        {/* Previous Sessions / History */}
        <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-retro)', fontSize: '2.2rem', marginBottom: '15px', color: 'var(--c-red-brown)' }}>
            Study History
          </h2>
          <p style={{ marginBottom: '20px', color: 'var(--c-sand-dark)' }}>
            Select a previous document to jump right back into your study room.
          </p>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '250px', paddingRight: '5px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--c-sand-med)' }}>
                Loading previous sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--c-sand-med)' }}>
                No study sessions found. Start a new one!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => navigate(`/study/${session.id}`)}
                    className="history-card"
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--c-mint-pale)',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'transform 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.backgroundColor = 'var(--c-mint-bright)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.backgroundColor = 'var(--c-mint-pale)';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--c-brown-dark)', fontSize: '1.05rem' }}>
                        {session.filename}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--c-sand-dark)', marginTop: '2px' }}>
                        {new Date(session.created_at).toLocaleDateString()} at{' '}
                        {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        backgroundColor:
                          session.status === 'ready'
                            ? 'var(--c-sage-light)'
                            : session.status === 'failed'
                            ? 'var(--c-coral)'
                            : 'var(--c-peach)',
                        color: 'var(--c-brown-dark)',
                        border: '1.5px solid var(--border-color)',
                      }}
                    >
                      {session.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
