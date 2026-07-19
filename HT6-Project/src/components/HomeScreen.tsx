import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Document, Quest } from '../services/api';

const MOCK_USER_ID = 'mock_user_123';

export const HomeScreen: React.FC = () => {
  const [sessions, setSessions] = useState<Document[]>([]);
  const [sessionQuests, setSessionQuests] = useState<Record<string, Quest[]>>({});
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

      // Fetch quests for every "ready" document so each session can show
      // its own quest cards below it. "processing"/"failed" docs have no
      // quests yet, so skip those.
      const readyDocs = docs.filter((d) => d.status === 'ready');
      const questEntries = await Promise.all(
        readyDocs.map(async (doc) => {
          try {
            const quests = await api.listQuests(doc.id);
            return [doc.id, quests] as const;
          } catch (err) {
            console.error(`Error fetching quests for ${doc.id}:`, err);
            return [doc.id, []] as const;
          }
        })
      );
      setSessionQuests(Object.fromEntries(questEntries));
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
      navigate(`/plan/${result.document_id}`);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '40px auto', padding: '0 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="pixel-title">Cozy Study Room</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--c-sand-dark)', fontWeight: 600 }}>
          Your Animal Crossing-inspired virtual learning space
        </p>
      </header>

      <div style={{ width: '100%' }}>
        {/* Upload Zone */}
        <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', marginBottom: '30px' }}>
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

        {/* History — collapsed to one card per session, grouped by completion */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-retro)', fontSize: '2.2rem', marginBottom: '15px', color: 'var(--c-red-brown)' }}>
            Study History
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--c-sand-med)' }}>
              Loading previous sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--c-sand-med)' }}>
              No study sessions found. Start a new one!
            </div>
          ) : (
            (() => {
              const readySessions = sessions.filter((s) => s.status === 'ready');
              // This filters out both 'ready' AND 'failed' sessions, showing only 'processing' cards:
              const otherSessions = sessions.filter((s) => s.status !== 'ready' && s.status !== 'failed');

              const completed = readySessions.filter((s) => {
                const quests = sessionQuests[s.id] || [];
                return quests.length > 0 && quests.every((q) => q.status === 'done');
              });
              const inProgress = readySessions.filter((s) => !completed.includes(s));

              return (
                <>
                  {/* Processing / failed sessions, kept simple */}
                  {otherSessions.length > 0 && (
                    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {otherSessions.map((session) => (
                        <div
                          key={session.id}
                          className="pixel-panel"
                          style={{
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--c-brown-dark)' }}>{session.filename}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--c-sand-dark)' }}>
                              {new Date(session.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              backgroundColor: session.status === 'failed' ? 'var(--c-coral)' : 'var(--c-peach)',
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

                  {/* Two-column grouping */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <SessionColumn
                      dotColor="var(--c-clay)"
                      label="In Progress"
                      sessions={inProgress}
                      sessionQuests={sessionQuests}
                      buttonLabel="Continue"
                      onOpen={(id) => navigate(`/study/${id}`)}
                    />
                    <SessionColumn
                      dotColor="var(--c-sage-dark)"
                      label="Completed"
                      sessions={completed}
                      sessionQuests={sessionQuests}
                      buttonLabel="Review"
                      onOpen={(id) => navigate(`/study/${id}`)}
                    />
                  </div>
                </>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};

interface SessionColumnProps {
  dotColor: string;
  label: string;
  sessions: Document[];
  sessionQuests: Record<string, Quest[]>;
  buttonLabel: string;
  onOpen: (documentId: string) => void;
}

function SessionColumn({
  dotColor,
  label,
  sessions,
  sessionQuests,
  buttonLabel,
  onOpen,
}: SessionColumnProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--c-brown-dark)' }}>
          {label}
        </h3>
      </div>

      {sessions.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--c-sand-med)' }}>Nothing here yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map((session) => {
            const quests = sessionQuests[session.id] || [];
            const done = quests.filter((q) => q.status === 'done').length;
            const total = quests.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isComplete = buttonLabel === 'Review';

            return (
              <div key={session.id} className="pixel-panel" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      backgroundColor: isComplete ? 'var(--c-mint-pale)' : 'var(--c-peach)',
                      color: isComplete ? 'var(--c-sage-dark)' : 'var(--c-clay)',
                    }}
                  >
                    {isComplete ? '✓' : '⚡'}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 800,
                        color: 'var(--c-brown-dark)',
                        fontSize: '0.95rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {session.filename}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--c-sand-dark)' }}>
                      {total > 0 ? `${done}/${total} quests complete` : 'No quests yet'}
                    </p>
                  </div>
                </div>

                {total > 0 && (
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '3px',
                      background: 'var(--c-sand-light)',
                      border: '1px solid var(--border-color)',
                      overflow: 'hidden',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: isComplete ? 'var(--c-sage-dark)' : 'var(--c-clay)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="pixel-button"
                    onClick={() => onOpen(session.id)}
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    {buttonLabel} →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
