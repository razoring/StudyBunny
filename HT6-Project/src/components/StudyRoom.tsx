import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { api } from '../services/api';
import type { ChatMessage, FocusEvent } from '../services/api';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// working
import QuestProgress from '../components/QuestBar';


// --- 3D Avatar Subcomponent ---
interface BunnyProps {
  emotion: 'neutral' | 'angry' | 'sad';
  triggerProjector?: boolean;
}

const BunnyModel: React.FC<BunnyProps> = ({ emotion, triggerProjector }) => {
  const { scene } = useGLTF('/bunny.glb?v=8');
  const clonedScene = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const modelRef = useRef<THREE.Group>(null);

  const earLBone = useRef<THREE.Bone | null>(null);
  const earRBone = useRef<THREE.Bone | null>(null);
  const eyeLBone = useRef<THREE.Bone | null>(null);
  const eyeRBone = useRef<THREE.Bone | null>(null);
  const eyebrowLBone = useRef<THREE.Bone | null>(null);
  const eyebrowRBone = useRef<THREE.Bone | null>(null);
  const headBone = useRef<THREE.Bone | null>(null);
  const armLBone = useRef<THREE.Bone | null>(null);
  const armRBone = useRef<THREE.Bone | null>(null);
  const torsoBone = useRef<THREE.Bone | null>(null);
  const meshRefs = useRef<THREE.SkinnedMesh[]>([]);
  const jumpState = useRef<'idle' | 'jumping'>('idle');
  const jumpStartTime = useRef(0);

  useEffect(() => {
    if (triggerProjector) {
      jumpState.current = 'jumping';
      jumpStartTime.current = 0;
    }
  }, [triggerProjector]);

  useEffect(() => {
    meshRefs.current = [];
    clonedScene.traverse((obj) => {
      const lowerName = (obj.name || '').toLowerCase();

      if (lowerName.includes('ear') && (lowerName.includes('l') || lowerName.includes('_l'))) earLBone.current = obj as THREE.Bone;
      if (lowerName.includes('ear') && (lowerName.includes('r') || lowerName.includes('_r'))) earRBone.current = obj as THREE.Bone;
      if (lowerName.includes('eye') && (lowerName.includes('l') || lowerName.includes('_l')) && !lowerName.includes('brow')) eyeLBone.current = obj as THREE.Bone;
      if (lowerName.includes('eye') && (lowerName.includes('r') || lowerName.includes('_r')) && !lowerName.includes('brow')) eyeRBone.current = obj as THREE.Bone;
      if (lowerName.includes('eyebrow') && (lowerName.includes('l') || lowerName.includes('_l'))) eyebrowLBone.current = obj as THREE.Bone;
      if (lowerName.includes('eyebrow') && (lowerName.includes('r') || lowerName.includes('_r'))) eyebrowRBone.current = obj as THREE.Bone;
      if (lowerName.includes('head')) headBone.current = obj as THREE.Bone;
      if (lowerName.includes('arm') && (lowerName.includes('l') || lowerName.includes('_l'))) armLBone.current = obj as THREE.Bone;
      if (lowerName.includes('arm') && (lowerName.includes('r') || lowerName.includes('_r'))) armRBone.current = obj as THREE.Bone;
      if (lowerName.includes('torso')) torsoBone.current = obj as THREE.Bone;

      if ((obj as any).isMesh || (obj as any).isSkinnedMesh) {
        if ((obj as any).morphTargetInfluences) {
          meshRefs.current.push(obj as THREE.SkinnedMesh);
        }
      }
    });
  }, [clonedScene]);

  const blinkTimer = useRef(0);
  const blinkDuration = useRef(0.15);
  const isBlinking = useRef(false);
  const earTwitchTimer = useRef(0);
  const isEarTwitching = useRef(false);
  const earTwitchSide = useRef<'L' | 'R' | 'BOTH'>('L');

  useFrame((state, delta) => {
    // Blinking
    blinkTimer.current += delta;
    if (!isBlinking.current && blinkTimer.current > 3 + Math.random() * 4) {
      isBlinking.current = true;
      blinkTimer.current = 0;
    }

    meshRefs.current.forEach((mesh) => {
      const blinkIdx = mesh.morphTargetDictionary?.['Blink'];
      if (blinkIdx !== undefined) {
        if (isBlinking.current) {
          if (blinkTimer.current < blinkDuration.current) {
            mesh.morphTargetInfluences[blinkIdx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[blinkIdx], 1.5, delta * 30);
          } else if (blinkTimer.current < blinkDuration.current * 2) {
            mesh.morphTargetInfluences[blinkIdx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[blinkIdx], 0, delta * 30);
          } else {
            mesh.morphTargetInfluences[blinkIdx] = 0;
          }
        } else {
          mesh.morphTargetInfluences[blinkIdx] = 0;
        }
      }
    });

    if (isBlinking.current && blinkTimer.current >= blinkDuration.current * 2) {
      isBlinking.current = false;
      blinkTimer.current = 0;
    }

    // Ear Twitching
    earTwitchTimer.current += delta;
    if (!isEarTwitching.current && earTwitchTimer.current > 8 + Math.random() * 7) {
      isEarTwitching.current = true;
      earTwitchTimer.current = 0;
      const rand = Math.random();
      if (rand < 0.33) earTwitchSide.current = 'L';
      else if (rand < 0.66) earTwitchSide.current = 'R';
      else earTwitchSide.current = 'BOTH';
    }

    if (isEarTwitching.current) {
      const bones = [];
      if (earTwitchSide.current === 'L' || earTwitchSide.current === 'BOTH') bones.push(earLBone.current);
      if (earTwitchSide.current === 'R' || earTwitchSide.current === 'BOTH') bones.push(earRBone.current);

      if (earTwitchTimer.current < 0.3) {
        // Soft, single twitch pulse
        const rotation = Math.sin(earTwitchTimer.current * 10) * 0.1;
        bones.forEach(bone => {
          if (bone) {
            bone.rotation.x = 0;
            bone.rotation.z = rotation;
          }
        });
      } else {
        bones.forEach(bone => {
          if (bone) {
            bone.rotation.x = 0;
            bone.rotation.z = 0;
          }
        });
        isEarTwitching.current = false;
        earTwitchTimer.current = 0;
      }
    }

    // Eye and Head Micro-movement
    const t = state.clock.getElapsedTime();
    const lookX = Math.sin(t * 0.5) * 0.05;
    const lookY = Math.cos(t * 0.3) * 0.05;

    if (eyeLBone.current && eyeRBone.current) {
      eyeLBone.current.rotation.x = lookX;
      eyeLBone.current.rotation.y = lookY;
      eyeRBone.current.rotation.x = lookX;
      eyeRBone.current.rotation.y = lookY;
    }

    if (headBone.current) {
      headBone.current.rotation.y = Math.sin(t * 0.4) * 0.03;
      headBone.current.rotation.z = Math.cos(t * 0.6) * 0.02;
    }

    const idleArmX = Math.PI * 0.35; // Pitch forward slightly to avoid pointing backward
    const idleArmYL = Math.PI * 0.9;  // Flare outward to avoid clipping in torso
    const idleArmYR = -Math.PI * 0.9; // Flare outward

    // Body idle movement & Jump animation
    if (jumpState.current === 'idle') {
      if (torsoBone.current) torsoBone.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
      if (modelRef.current) modelRef.current.position.y = 0;
      if (armLBone.current) {
        armLBone.current.rotation.x = idleArmX;
        armLBone.current.rotation.y = idleArmYL;
        armLBone.current.rotation.z = 0;
      }
      if (armRBone.current) {
        armRBone.current.rotation.x = idleArmX;
        armRBone.current.rotation.y = idleArmYR;
        armRBone.current.rotation.z = 0;
      }
    } else if (jumpState.current === 'jumping') {
      if (jumpStartTime.current === 0) jumpStartTime.current = t;
      const jt = t - jumpStartTime.current;

      if (jt < 0.3) {
        // jumping up
        const progress = jt / 0.3;
        if (modelRef.current) modelRef.current.position.y = THREE.MathUtils.lerp(0, 20, progress);
        if (armLBone.current) {
          armLBone.current.rotation.x = THREE.MathUtils.lerp(idleArmX, -Math.PI * 0.8, progress); // Pitch forward/up
          armLBone.current.rotation.y = THREE.MathUtils.lerp(idleArmYL, Math.PI * 0.2, progress);  // Outward flare
          armLBone.current.rotation.z = 0;
        }
        if (armRBone.current) {
          armRBone.current.rotation.x = THREE.MathUtils.lerp(idleArmX, -Math.PI * 0.8, progress); // Pitch forward/up
          armRBone.current.rotation.y = THREE.MathUtils.lerp(idleArmYR, -Math.PI * 0.2, progress); // Outward flare
          armRBone.current.rotation.z = 0;
        }
      } else if (jt < 0.6) {
        // falling down
        const progress = (jt - 0.3) / 0.3;
        if (modelRef.current) modelRef.current.position.y = THREE.MathUtils.lerp(20, 0, progress);
        if (armLBone.current) {
          armLBone.current.rotation.x = THREE.MathUtils.lerp(-Math.PI * 0.8, idleArmX, progress);
          armLBone.current.rotation.y = THREE.MathUtils.lerp(Math.PI * 0.2, idleArmYL, progress);
          armLBone.current.rotation.z = 0;
        }
        if (armRBone.current) {
          armRBone.current.rotation.x = THREE.MathUtils.lerp(-Math.PI * 0.8, idleArmX, progress);
          armRBone.current.rotation.y = THREE.MathUtils.lerp(-Math.PI * 0.2, idleArmYR, progress);
          armRBone.current.rotation.z = 0;
        }
      } else {
        jumpState.current = 'idle';
      }
    }

    // Emotion Shapekeys
    meshRefs.current.forEach((mesh) => {
      if (mesh.morphTargetInfluences) {
        const angryIdx = mesh.morphTargetDictionary?.['Angry'];
        const sadIdx = mesh.morphTargetDictionary?.['Sad'];

        if (angryIdx !== undefined) {
          mesh.morphTargetInfluences[angryIdx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[angryIdx], emotion === 'angry' ? 1 : 0, delta * 8);
        }
        if (sadIdx !== undefined) {
          mesh.morphTargetInfluences[sadIdx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[sadIdx], emotion === 'sad' ? 1 : 0, delta * 8);
        }
      }
    });
  });

  // Generate an authentic 16x16 pixel art shadow texture
  const shadowTexture = React.useMemo(() => {
    const size = 16;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cx = x - size / 2 + 0.5;
        const cy = y - size / 2 + 0.5;
        // Ellipse equation for the shadow shape
        const dist = (cx * cx) / 49 + (cy * cy) / 16;
        const i = (y * size + x) * 4;
        if (dist <= 1.2) {
          data[i] = 20;     // R
          data[i + 1] = 15; // G
          data[i + 2] = 30; // B
          data[i + 3] = 160;// Alpha
        } else {
          data[i + 3] = 0;  // Transparent
        }
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter; // This enforces the chunky pixel look
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group position={[30, -45, 0]}>
      {/* Pixel art drop shadow using NearestFilter texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-30, 0, 0]} scale={[40, 20, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </mesh>
      <primitive ref={modelRef} object={clonedScene} scale={[12, 12, 12]} />
    </group>
  );
};


// Loader placeholder for model load
const AvatarLoader = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial color="gray" wireframe />
  </mesh>
);

// --- Streaming Speech Bubble Component ---
interface StreamingBubbleProps {
  text?: string;
  isProjector?: boolean;
  forceShow?: boolean;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

const StreamingBubble: React.FC<StreamingBubbleProps> = ({ text, isProjector, forceShow, onDismiss, children }) => {
  const [displayed, setDisplayed] = useState('');
  const [dismissedText, setDismissedText] = useState<string | null>(null);
  const [showProjector, setShowProjector] = useState(false);

  useEffect(() => {
    if ((text || forceShow) && isProjector) {
      const timer = setTimeout(() => setShowProjector(true), 300); // 0.3s wait for jump to peak
      return () => clearTimeout(timer);
    } else {
      setShowProjector(false);
    }
  }, [text, isProjector, forceShow]);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      return;
    }
    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  const isDismissed = text ? text === dismissedText : !forceShow;
  if (!forceShow && (!text || isDismissed)) return null;
  if (isProjector && !showProjector) return null; // Waiting for jump

  const containerStyle: React.CSSProperties = isProjector ? {
    position: 'absolute',
    top: '0',
    left: '10px',
    right: '10px',
    bottom: '20px', // Pulls down adequately covering the screen
    backgroundColor: '#e6e6e6',
    border: '4px solid #333',
    borderTop: '20px solid #555', // Projector roller
    borderBottom: '10px solid #555', // Bottom weight
    padding: '30px',
    color: 'black',
    fontFamily: 'var(--font-retro)',
    fontSize: '1.2rem',
    lineHeight: '1.5',
    overflowY: 'auto',
    boxShadow: '0px 10px 30px rgba(0,0,0,0.5)',
    zIndex: 10,
    cursor: 'pointer',
    animation: 'projectorPullDown 0.4s ease-out forwards',
  } : {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '20px',
    maxHeight: '40%',
    backgroundColor: 'white',
    border: '4px solid black',
    padding: '16px 20px',
    color: 'black',
    fontFamily: 'var(--font-retro)',
    fontSize: '1.2rem',
    lineHeight: '1.5',
    overflowY: 'auto',
    boxShadow: '4px 4px 0px rgba(0,0,0,0.2)',
    zIndex: 10,
    cursor: 'pointer',
  };

  return (
    <>
      {isProjector && (
        <style>{`
          @keyframes projectorPullDown {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(0); }
          }
        `}</style>
      )}
      <div
        onClick={() => {
          if (text) setDismissedText(text);
          if (onDismiss) onDismiss();
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        }}
        style={containerStyle}
      >
        <div style={{ position: 'absolute', top: isProjector ? '24px' : '8px', right: '12px', fontSize: '0.75rem', color: isProjector ? '#555' : '#999', fontWeight: 'bold' }}>
          Click to dismiss
        </div>
        {text && (
          <div className="markdown-content" style={{ margin: 0, marginTop: isProjector ? '20px' : '8px' }}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {displayed}
            </ReactMarkdown>
          </div>
        )}
        {children}
      </div>
    </>
  );
};

// --- Main Study Room Component ---
export const StudyRoom: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Webcam stream & controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);

  // Presage SDK tracking metrics
  const [focusMetrics, setFocusMetrics] = useState<FocusEvent>({
    user_id: 'mock_user_123',
    document_id: documentId || '',
    focus: 92,
    distraction: 8,
    struggling: 0,
    mood: 'neutral',
    mood_confidence: 90,
    tiredness: 5,
  });

  // Avatar states
  const [avatarEmotion, setAvatarEmotion] = useState<'neutral' | 'angry' | 'sad'>('neutral');
  const [showDebug, setShowDebug] = useState(false);

  const [sessionStartIndex, setSessionStartIndex] = useState<number | null>(null);

  // Load chat history & initialize webcam on component mount
  useEffect(() => {
    if (!documentId) return;

    // Fetch previous chat history
    api.getChatHistory(documentId)
      .then((history) => {
        setMessages(history);
        setSessionStartIndex(history.length);
      })
      .catch((err) => console.error('Error fetching chat history:', err));

    // Request Webcam and Microphone permission
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error('Camera/Mic permission denied or unavailable:', err);
      });

    // Cleanup video stream on unmount
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [documentId]);

  // WebSocket Connection to Node.js Presage Server
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    canvasRef.current = canvas;

    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => console.log('Connected to Presage Node.js Server');
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'detections' && message.data) {
          const sdkData = message.data;
          let currentMood = 'neutral';
          let maxProb = 0;

          if (sdkData.expressions) {
            for (const [expr, prob] of Object.entries(sdkData.expressions)) {
              if ((prob as number) > maxProb) {
                maxProb = prob as number;
                currentMood = expr;
              }
            }
          }

          const isBlinking = sdkData.eyeBlink || false;
          const updatedMetrics = {
            user_id: 'mock_user_123',
            document_id: documentId || '',
            focus: (currentMood === 'happiness' || currentMood === 'neutral') ? 90 : 40,
            distraction: (currentMood === 'surprise' || currentMood === 'fear') ? 80 : 10,
            struggling: (currentMood === 'anger' || currentMood === 'sadness') ? 85 : 0,
            mood: currentMood,
            mood_confidence: Math.floor(maxProb * 100) || 100,
            tiredness: isBlinking ? 80 : 5,
          };

          setFocusMetrics(updatedMetrics);

          if (updatedMetrics.struggling > 50) {
            setAvatarEmotion('sad');
          } else if (updatedMetrics.distraction > 50) {
            setAvatarEmotion('angry');
          } else {
            setAvatarEmotion('neutral');
          }
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };
    ws.onclose = () => console.log('Disconnected from Presage Node.js Server');
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [documentId]);

  // Periodic Presage Tracking Loop (sends webcam frames to Node.js)
  useEffect(() => {
    if (!documentId || !cameraActive) return;

    const interval = setInterval(() => {
      // Extract frame from video and send over WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL('image/jpeg', 0.5); // Compress quality to 50%

          wsRef.current.send(JSON.stringify({
            type: 'frame',
            image: base64Image
          }));
        }
      }

      // Also send the latest focusMetrics state to the FastAPI backend
      setFocusMetrics(prevMetrics => {
        if (prevMetrics) {
          api.sendFocusEvent(prevMetrics).catch((err) => console.error('Error posting focus metrics:', err));
        }
        return prevMetrics;
      });

    }, 5000);

    return () => clearInterval(interval);
  }, [documentId, cameraActive]);

  // Handle camera toggle
  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraActive(videoTrack.enabled);
      }
    }
  };

  // Handle microphone toggle
  const toggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
      }
    }
  };

  // Handle chat messaging
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !documentId) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setSendingMsg(true);

    // Optimistically add user message to list
    const tempUserMsg: ChatMessage = {
      id: Math.random().toString(),
      quest_id: '',
      role: 'user',
      text: userMsg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await api.sendChatMessage('', documentId, 'mock_user_123', userMsg);

      const avatarMsg: ChatMessage = {
        id: Math.random().toString(),
        quest_id: '',
        role: 'avatar',
        text: response.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, avatarMsg]);

      // Mock ElevenLabs speech output using browser speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response.reply);
        // Select a cozy/pleasant voice if available
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find((v) => v.name.includes('Google') || v.lang.startsWith('en'));
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.pitch = 1.1; // Make it sound a bit more cartoony
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('Chat query failed:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>

      {/* 1. Quest Sidebar (Preserved placeholder for teammate) */}
      <div
        style={{
          borderRight: 'var(--border-thick)',
          backgroundColor: 'var(--c-sand-light)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--font-retro)', fontSize: '2rem', color: 'var(--c-brown-dark)', marginBottom: '15px' }}>
            Quests
          </h2>
          <QuestProgress documentId={documentId || ''} />

        </div>

        <button className="pixel-button" onClick={() => navigate('/home')} style={{ width: '100%', justifyContent: 'center' }}>
          Leave Room
        </button>
      </div>

      {/* 2. Main Area (Zoom layout grid) */}
      <div style={{ display: 'grid', gridTemplateRows: '1fr 50px', overflow: 'hidden' }}>

        {/* Top Grid: Camera Feeds */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', overflow: 'hidden' }}>

          {/* Webcam Feed Box */}
          <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            <h3 style={{ fontFamily: 'var(--font-retro)', fontSize: '1.5rem', marginBottom: '8px', color: 'var(--c-red-brown)' }}>
              Webcam (You)
            </h3>
            <div style={{ flex: 1, backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '2px solid var(--border-color)' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              {!cameraActive && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--c-dark-slate)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
                  Camera Disabled
                </div>
              )}
            </div>

            {/* A/V Control Buttons inside feed */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="pixel-button" onClick={toggleCamera} style={{ flex: 1, justifyContent: 'center' }}>
                {cameraActive ? '📹 Stop Video' : '📹 Start Video'}
              </button>
              <button className="pixel-button" onClick={toggleMic} style={{ flex: 1, justifyContent: 'center', backgroundColor: micActive ? 'var(--c-peach)' : 'var(--c-coral)' }}>
                {micActive ? '🎙️ Mute' : '🎙️ Unmute'}
              </button>
            </div>


          </div>

          {/* 3D Bunny Avatar Box */}
          <div className="pixel-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h3 style={{ fontFamily: 'var(--font-retro)', fontSize: '1.5rem', marginBottom: '8px', color: 'var(--c-red-brown)' }}>
              Study Buddy (Tutor)
            </h3>

            {/* The Low-Res Retro Pixelated WebGL Container */}
            <div
              style={{
                flex: 1,
                backgroundImage: 'url(/board.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid var(--border-color)',
                position: 'relative',
              }}
            >
              {/* Native retro-pixelation scaler trick */}
              <div style={{ width: '100%', height: '100%' }}>
                <Canvas
                  style={{
                    width: '100%',
                    height: '100%',
                    imageRendering: 'pixelated', /* Crucial CSS properties */
                  }}
                  gl={{ antialias: false, alpha: true }} /* Disable anti-aliasing, keep transparent */
                  camera={{ position: [0, 0, 150], fov: 45 }}
                >
                  <ambientLight intensity={0.6} color="#ffffff" />
                  <directionalLight position={[-20, 30, 20]} intensity={3.5} color="#fff4d4" />
                  <directionalLight position={[20, -10, 10]} intensity={0.4} color="#8a9cba" />
                  <Suspense fallback={<AvatarLoader />}>
                    <BunnyModel
                      emotion={avatarEmotion}
                      triggerProjector={showDebug || (sessionStartIndex !== null && messages.length > 0 && messages.length - 1 >= sessionStartIndex && messages[messages.length - 1].role === 'avatar' && messages[messages.length - 1].text.length > 200)}
                    />
                  </Suspense>
                </Canvas>
              </div>

              {showDebug ? (
                <StreamingBubble
                  forceShow={true}
                  isProjector={true}
                  onDismiss={() => setShowDebug(false)}
                >
                  <div style={{ marginTop: '20px', fontFamily: 'var(--font-retro)' }}>
                    <h2 style={{ marginBottom: '15px', color: 'var(--c-red-brown)', fontSize: '1.5rem', textTransform: 'uppercase' }}>System Diagnostics</h2>
                    <div style={{ marginBottom: '10px', fontSize: '1.2rem' }}><strong>Focus Level:</strong> <span style={{ color: focusMetrics.focus > 70 ? 'var(--c-sage-dark)' : 'var(--c-burnt-orange)' }}>{focusMetrics.focus}%</span></div>
                    <div style={{ marginBottom: '10px', fontSize: '1.2rem' }}><strong>Stress/Tiredness:</strong> <span>{focusMetrics.tiredness}%</span></div>
                    <div style={{ marginBottom: '10px', fontSize: '1.2rem' }}><strong>User Mood:</strong> <span style={{ textTransform: 'capitalize' }}>{focusMetrics.mood}</span></div>
                    <div style={{ fontSize: '1.2rem' }}><strong>Tutor Status:</strong> {avatarEmotion === 'angry' ? 'Stern 💢' : avatarEmotion === 'sad' ? 'Concerned 😟' : 'Happy 😊'}</div>
                  </div>
                </StreamingBubble>
              ) : (
                <StreamingBubble
                  text={sessionStartIndex !== null && messages.length > 0 && messages.length - 1 >= sessionStartIndex && messages[messages.length - 1].role === 'avatar' ? messages[messages.length - 1].text : undefined}
                  isProjector={sessionStartIndex !== null && messages.length > 0 && messages.length - 1 >= sessionStartIndex && messages[messages.length - 1].role === 'avatar' && messages[messages.length - 1].text.length > 200}
                />
              )}

              {/* Debug Menu & Info Button */}
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--c-brown-dark)', color: 'white', border: '2px solid var(--c-sand-light)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'var(--font-retro)' }}
                  title="Debug Info"
                >
                  i
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Panel: Text Input */}
        <div
          style={{
            borderTop: 'var(--border-thick)',
            backgroundColor: 'var(--bg-panel)',
            overflow: 'hidden',
          }}
        >
          {/* Text Input Row */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', height: '100%' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                border: 'none',
                padding: '0 15px',
                fontSize: '1rem',
                fontFamily: 'var(--font-cozy)',
                backgroundColor: 'var(--bg-panel)',
                color: 'var(--c-brown-dark)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="pixel-button"
              style={{
                borderRadius: 0,
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                height: '100%',
                padding: '0 25px',
              }}
              disabled={sendingMsg}
            >
              Ask
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
