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
  isThinking?: boolean;
}

const BunnyModel: React.FC<BunnyProps> = ({ emotion, triggerProjector, isThinking }) => {
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
        const restingBlink = isThinking ? 0.3 : (emotion === 'neutral' ? -0.8 : 0);

        if (isBlinking.current) {
          if (blinkTimer.current < blinkDuration.current) {
            mesh.morphTargetInfluences[blinkIdx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[blinkIdx], 1.5, delta * 30);
          } else if (blinkTimer.current < blinkDuration.current * 2) {
            mesh.morphTargetInfluences[blinkIdx] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[blinkIdx], restingBlink, delta * 30);
          } else {
            mesh.morphTargetInfluences[blinkIdx] = restingBlink;
          }
        } else {
          mesh.morphTargetInfluences[blinkIdx] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[blinkIdx],
            restingBlink,
            delta * 10
          );
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
      eyeLBone.current.rotation.x = -(Math.PI / 2) + lookX;
      eyeLBone.current.rotation.y = lookY;
      eyeRBone.current.rotation.x = -(Math.PI / 2) + lookX;
      eyeRBone.current.rotation.y = lookY;
    }

    if (headBone.current) {
      if (isThinking) {
        headBone.current.rotation.y = THREE.MathUtils.lerp(headBone.current.rotation.y, 0.2 + Math.sin(t * 0.4) * 0.03, delta * 5);
        headBone.current.rotation.z = THREE.MathUtils.lerp(headBone.current.rotation.z, Math.PI / 8 + Math.cos(t * 0.6) * 0.02, delta * 5);
      } else {
        headBone.current.rotation.y = THREE.MathUtils.lerp(headBone.current.rotation.y, Math.sin(t * 0.4) * 0.03, delta * 5);
        headBone.current.rotation.z = THREE.MathUtils.lerp(headBone.current.rotation.z, Math.cos(t * 0.6) * 0.02, delta * 5);
      }
    }

    const idleArmPosX = 1.2;
    const idleArmPosY = 2;
    const idleArmRotX = Math.PI * 1; // Straight down at sides
    const idleArmRotYL = -Math.PI * 0.5;
    const idleArmRotYR = Math.PI * 0.5;

    const grabArmPosX = 0.6;
    const grabArmPosY = 2.0;
    const grabArmRotX = Math.PI * 0.4; // T-rex grab pose
    const grabArmRotYL = Math.PI * 0.2;
    const grabArmRotYR = -Math.PI * 0.2;

    // Body idle movement & Jump animation
    if (jumpState.current === 'idle') {
      if (torsoBone.current) torsoBone.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
      if (modelRef.current) modelRef.current.position.y = 0;
      if (armLBone.current) {
        armLBone.current.position.set(idleArmPosX, idleArmPosY, 0);
        armLBone.current.rotation.set(idleArmRotX, idleArmRotYL, 0);
      }
      if (armRBone.current) {
        armRBone.current.position.set(-idleArmPosX, idleArmPosY, 0);
        armRBone.current.rotation.set(idleArmRotX, idleArmRotYR, 0);
      }
    } else if (jumpState.current === 'jumping') {
      if (jumpStartTime.current === 0) jumpStartTime.current = t;
      const jt = t - jumpStartTime.current;

      if (jt < 0.3) {
        // jumping up
        const progress = jt / 0.3;
        if (modelRef.current) modelRef.current.position.y = THREE.MathUtils.lerp(0, 20, progress);
        if (armLBone.current) {
          armLBone.current.position.set(
            THREE.MathUtils.lerp(idleArmPosX, grabArmPosX, progress),
            THREE.MathUtils.lerp(idleArmPosY, grabArmPosY, progress),
            0
          );
          armLBone.current.rotation.set(
            THREE.MathUtils.lerp(idleArmRotX, grabArmRotX, progress),
            THREE.MathUtils.lerp(idleArmRotYL, grabArmRotYL, progress),
            0
          );
        }
        if (armRBone.current) {
          armRBone.current.position.set(
            THREE.MathUtils.lerp(-idleArmPosX, -grabArmPosX, progress),
            THREE.MathUtils.lerp(idleArmPosY, grabArmPosY, progress),
            0
          );
          armRBone.current.rotation.set(
            THREE.MathUtils.lerp(idleArmRotX, grabArmRotX, progress),
            THREE.MathUtils.lerp(idleArmRotYR, grabArmRotYR, progress),
            0
          );
        }
      } else if (jt < 0.6) {
        // falling down
        const progress = (jt - 0.3) / 0.3;
        if (modelRef.current) modelRef.current.position.y = THREE.MathUtils.lerp(20, 0, progress);
        if (armLBone.current) {
          armLBone.current.position.set(
            THREE.MathUtils.lerp(grabArmPosX, idleArmPosX, progress),
            THREE.MathUtils.lerp(grabArmPosY, idleArmPosY, progress),
            0
          );
          armLBone.current.rotation.set(
            THREE.MathUtils.lerp(grabArmRotX, idleArmRotX, progress),
            THREE.MathUtils.lerp(grabArmRotYL, idleArmRotYL, progress),
            0
          );
        }
        if (armRBone.current) {
          armRBone.current.position.set(
            THREE.MathUtils.lerp(-grabArmPosX, -idleArmPosX, progress),
            THREE.MathUtils.lerp(grabArmPosY, idleArmPosY, progress),
            0
          );
          armRBone.current.rotation.set(
            THREE.MathUtils.lerp(grabArmRotX, idleArmRotX, progress),
            THREE.MathUtils.lerp(grabArmRotYR, idleArmRotYR, progress),
            0
          );
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
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [ttsActive, setTtsActive] = useState(true);

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

  // Service Health States
  const [serviceHealth, setServiceHealth] = useState({
    mongodb: 'OK',
    gemini: 'OK',
    eleven_labs: 'OK',
    auth0: 'OK',
    presage: 'OK'
  });

  const [maxProjectorChars, setMaxProjectorChars] = useState(200);

  // Hidden testing logic to find character limit that reaches middle height
  useEffect(() => {
    const determineMaxChars = () => {
      const container = document.getElementById('avatar-container');
      if (!container) return;

      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      div.style.bottom = '20px';
      div.style.left = '20px';
      div.style.right = '20px';
      div.style.padding = '16px 20px';
      div.style.fontFamily = 'var(--font-retro)';
      div.style.fontSize = '1.2rem';
      div.style.lineHeight = '1.5';
      div.style.border = '4px solid black';
      div.style.zIndex = '-100';

      container.appendChild(div);

      const targetHeight = container.clientHeight / 2;
      let testText = '';
      const sampleChunk = 'A '.repeat(5); // 10 chars per chunk

      while (div.clientHeight < targetHeight && testText.length < 2000) {
        testText += sampleChunk;
        div.innerText = testText;
      }

      // Give a little buffer (subtracting a chunk)
      setMaxProjectorChars(Math.max(50, testText.length - 10));
      container.removeChild(div);
    };

    const timer = setTimeout(determineMaxChars, 500); // Give styles time to paint
    window.addEventListener('resize', determineMaxChars);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', determineMaxChars);
    };
  }, []);

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
    ws.onopen = () => {
      console.log('Connected to Presage Node.js Server');
    };
    ws.onclose = () => {
      console.log('Disconnected from Presage Node.js Server');
    };
    ws.onerror = () => {
      console.error('Presage WebSocket Error');
    };
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

      // ElevenLabs speech output via backend proxy
      if (ttsActive) {
        try {
          const ttsRes = await fetch('http://localhost:8000/chat/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: response.reply })
          });
          if (ttsRes.ok) {
            const blob = await ttsRes.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            currentAudioRef.current = audio;
            audio.play().catch(err => console.error("Audio playback blocked/failed:", err));
          } else {
            console.error("TTS fetch failed with status:", ttsRes.status);
          }
        } catch (err) {
          console.error("TTS fetch failed", err);
        }
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
              You
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontFamily: 'var(--font-retro)', fontSize: '1.5rem', color: 'var(--c-red-brown)', margin: 0 }}>
                Easter
              </h3>
              <button
                className="pixel-button"
                onClick={() => {
                  setTtsActive(prev => {
                    const nextState = !prev;
                    if (!nextState) {
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      if (currentAudioRef.current) {
                        currentAudioRef.current.pause();
                        currentAudioRef.current.currentTime = 0;
                      }
                    }
                    return nextState;
                  });
                }}
                style={{ padding: '4px 12px', fontSize: '0.9rem', backgroundColor: ttsActive ? 'var(--c-peach)' : 'var(--c-coral)', height: 'auto', minHeight: '30px' }}
              >
                {ttsActive ? '🔊 TTS On' : '🔇 TTS Off'}
              </button>
            </div>

            {/* The Low-Res Retro Pixelated WebGL Container */}
            <div
              id="avatar-container"
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
                      triggerProjector={showDebug || (sessionStartIndex !== null && messages.length > 0 && messages.length - 1 >= sessionStartIndex && messages[messages.length - 1].role === 'avatar' && messages[messages.length - 1].text.length > maxProjectorChars)}
                      isThinking={sendingMsg}
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
                    <h2 style={{ marginBottom: '15px', color: 'var(--c-red-brown)', fontSize: '1.5rem', textTransform: 'uppercase', borderBottom: '2px solid #ccc', paddingBottom: '5px' }}>System Diagnostics</h2>

                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginBottom: '2px' }}>
                        <strong>Focus</strong>
                        <span style={{ color: focusMetrics.focus > 70 ? 'var(--c-sage-dark)' : 'var(--c-burnt-orange)' }}>{focusMetrics.focus}%</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', backgroundColor: '#ddd', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${focusMetrics.focus}%`, height: '100%', backgroundColor: focusMetrics.focus > 70 ? 'var(--c-sage-dark)' : 'var(--c-burnt-orange)' }}></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginBottom: '2px' }}>
                        <strong>Distraction</strong>
                        <span>{focusMetrics.distraction}%</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', backgroundColor: '#ddd', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${focusMetrics.distraction}%`, height: '100%', backgroundColor: 'var(--c-coral)' }}></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginBottom: '2px' }}>
                        <strong>Struggling</strong>
                        <span>{focusMetrics.struggling}%</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', backgroundColor: '#ddd', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${focusMetrics.struggling}%`, height: '100%', backgroundColor: 'var(--c-red-brown)' }}></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', marginBottom: '2px' }}>
                        <strong>Tiredness</strong>
                        <span>{focusMetrics.tiredness}%</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', backgroundColor: '#ddd', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${focusMetrics.tiredness}%`, height: '100%', backgroundColor: 'var(--c-burnt-orange)' }}></div>
                      </div>
                    </div>

                    <div style={{ borderTop: '2px dashed #ccc', paddingTop: '10px', marginBottom: '5px', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between' }}>
                      <strong>Primary Mood:</strong>
                      <span style={{ textTransform: 'capitalize', color: 'var(--c-brown-dark)' }}>{focusMetrics.mood} ({focusMetrics.mood_confidence}%)</span>
                    </div>

                    <div style={{ fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between' }}>
                      <strong>Tutor Status:</strong>
                      <span>{avatarEmotion === 'angry' ? 'Stern 💢' : avatarEmotion === 'sad' ? 'Concerned 😟' : 'Happy 😊'}</span>
                    </div>

                    {/* Service Health Status */}
                    <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '2px solid #ccc', fontSize: '0.9rem' }}>
                      <strong style={{ display: 'block', marginBottom: '8px' }}>Service Status</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '10px' }}>
                          <span>MongoDB</span> <span style={{ color: serviceHealth.mongodb === 'OK' ? 'var(--c-sage-dark)' : 'var(--c-coral)', fontWeight: 'bold' }}>{serviceHealth.mongodb}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Gemini API</span> <span style={{ color: serviceHealth.gemini === 'OK' ? 'var(--c-sage-dark)' : 'var(--c-coral)', fontWeight: 'bold' }}>{serviceHealth.gemini}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '10px' }}>
                          <span>Eleven Labs</span> <span style={{ color: serviceHealth.eleven_labs === 'OK' ? 'var(--c-sage-dark)' : 'var(--c-coral)', fontWeight: 'bold' }}>{serviceHealth.eleven_labs}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Auth0</span> <span style={{ color: serviceHealth.auth0 === 'OK' ? 'var(--c-sage-dark)' : 'var(--c-coral)', fontWeight: 'bold' }}>{serviceHealth.auth0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '10px' }}>
                          <span>Presage</span> <span style={{ color: serviceHealth.presage === 'OK' ? 'var(--c-sage-dark)' : 'var(--c-coral)', fontWeight: 'bold' }}>{serviceHealth.presage}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </StreamingBubble>
              ) : sendingMsg ? (
                <StreamingBubble
                  text="Thinking..."
                  isProjector={false}
                />
              ) : (
                <StreamingBubble
                  text={sessionStartIndex !== null && messages.length > 0 && messages.length - 1 >= sessionStartIndex && messages[messages.length - 1].role === 'avatar' ? messages[messages.length - 1].text : undefined}
                  isProjector={sessionStartIndex !== null && messages.length > 0 && messages.length - 1 >= sessionStartIndex && messages[messages.length - 1].role === 'avatar' && messages[messages.length - 1].text.length > maxProjectorChars}
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
