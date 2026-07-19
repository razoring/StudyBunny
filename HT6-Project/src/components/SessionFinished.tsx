import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Center } from '@react-three/drei';
import { BunnyModel } from './StudyRoom';

export const SessionFinished: React.FC = () => {
  const navigate = useNavigate();
  const history = JSON.parse(localStorage.getItem('studySessions') || '[]');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 500px', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)' }}>
      <div style={{ padding: '40px', fontFamily: 'var(--font-cozy)', overflowY: 'auto' }}>
        <h1 style={{ fontFamily: 'var(--font-retro)', color: 'var(--c-brown-dark)', fontSize: '3rem' }}>Session Finished! 🎉</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>Great job! Here is your study history across all sessions:</p>
        <button className="pixel-button" onClick={() => navigate('/home')} style={{ marginBottom: '20px' }}>Go Home</button>
        <div style={{ display: 'grid', gap: '15px' }}>
          {history.length === 0 && (
            <p style={{ fontStyle: 'italic', color: '#666' }}>No study sessions recorded yet. Finish a session to see it here!</p>
          )}
          {history.map((s: any, i: number) => (
            <div key={i} className="pixel-panel" style={{ backgroundColor: 'white', color: 'black' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>{s.date}</h3>
              <p><strong>Total Time:</strong> {s.duration}</p>
              <p><strong>Time Distracted:</strong> {s.distracted}</p>
              <p><strong>Time Struggling:</strong> {s.struggling}</p>
              <p><strong>Notes:</strong> Keep practicing the topics you spent the most time struggling on!</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--c-sage-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
        <Canvas camera={{ position: [0, 0, 150], fov: 45 }} style={{ width: '100%', height: '100%' }}>
          <ambientLight intensity={1.5} />
          <pointLight position={[-10, 20, 20]} intensity={500} />
          <Suspense fallback={null}>
            <Center position={[25, -10, 0]}>
              <group scale={0.75}>
                <BunnyModel emotion="neutral" isDancing={true} />
              </group>
            </Center>
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};
