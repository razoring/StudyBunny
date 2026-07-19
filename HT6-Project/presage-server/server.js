const WebSocket = require('ws');
require('dotenv').config({ path: '../../backend/.env' });

const { SmartSpectraSDK, PixelFormat, faceMetrics, setMetricsClass, decodeMetrics } = require('@smartspectra/node-sdk');
const { Metrics } = require('@smartspectra/node-sdk/messages');

const fs = require('fs');
const path = require('path');
const { preconfigure } = require('@smartspectra/node-sdk/js/ffi');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });
console.log(`Presage SmartSpectra WebSocket server started on ws://localhost:${PORT}`);

setMetricsClass(Metrics);

let sdk = null;
try {
    const cacheDir = path.join(__dirname, '.cache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    preconfigure(cacheDir);

    sdk = new SmartSpectraSDK({ 
        apiKey: process.env.PRESAGE,
        requestedMetrics: faceMetrics
    });
    sdk.useCustomInput();
    
    sdk.on('metrics', (buf) => {
        try {
            const data = decodeMetrics(buf);
            let formatted = null;
            if (data && data.face) {
                // The SDK returns arrays of measurements (e.g. data.face.blinking, data.face.expression)
                // We'll extract the latest value if available.
                const lastExpr = data.face.expression?.length ? data.face.expression[data.face.expression.length - 1] : null;
                const lastBlink = data.face.blinking?.length ? data.face.blinking[data.face.blinking.length - 1] : null;
                const lastTalk = data.face.talking?.length ? data.face.talking[data.face.talking.length - 1] : null;

                // Build expressions dictionary based on whatever the protobuf returns
                let expressions = { neutral: 100.0 };
                if (lastExpr && lastExpr.scores) {
                    expressions = {
                        neutral: 0, happiness: 0, sadness: 0, anger: 0,
                        surprise: 0, fear: 0, disgust: 0
                    };
                    lastExpr.scores.forEach(score => {
                        switch(score.type) {
                            case 1: expressions.anger = score.confidence; break;
                            case 3: expressions.disgust = score.confidence; break;
                            case 4: expressions.fear = score.confidence; break;
                            case 5: expressions.happiness = score.confidence; break;
                            case 6: expressions.neutral = score.confidence; break;
                            case 7: expressions.sadness = score.confidence; break;
                            case 8: expressions.surprise = score.confidence; break;
                        }
                    });
                }

                formatted = {
                    expressions: expressions,
                    eyeBlink: lastBlink ? !!lastBlink.value : false,
                    talking: lastTalk ? !!lastTalk.value : false
                };
            }
            if (formatted) {
                const payload = JSON.stringify({ type: 'detections', data: formatted });
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(payload);
                    }
                });
            }
        } catch (e) {
            console.error("Error decoding metrics:", e);
        }
    });
    
    sdk.start();
    console.log("PresageSDK Initialized successfully.");
} catch (e) {
    console.error("Failed to initialize Presage SDK:", e);
}

let syntheticTimestampUs = 0;
let lastFrameBuffer = null;

// The SDK crashes if it doesn't receive frames at a steady >=20 FPS wall-clock rate.
// To isolate it from WebSocket jitter and React rendering pauses, we run a dedicated 30FPS
// loop in Node that continually feeds it the last received frame.
setInterval(() => {
    if (sdk && lastFrameBuffer) {
        try {
            const width = 640;
            const height = 480;
            const stride = width * 4;
            syntheticTimestampUs += 33333; 
            sdk.sendFrame(lastFrameBuffer, width, height, stride, PixelFormat.kRGBA, syntheticTimestampUs);
        } catch (error) {
            console.error("Error sending frame to SDK:", error);
        }
    }
}, 33);

wss.on('connection', (ws) => {
    console.log('React Client connected to Presage Server.');

    ws.on('message', async (message, isBinary) => {
        if (isBinary) {
            // Just update the latest frame, let the interval handle submission
            lastFrameBuffer = message;
        }
    });

    ws.on('close', () => {
        console.log('React Client disconnected.');
    });
});
