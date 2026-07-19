const WebSocket = require('ws');
require('dotenv').config({ path: '../../backend/.env' });

const { SmartSpectraSDK, PixelFormat, decodeMetrics } = require('@smartspectra/node-sdk');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });
console.log(`Presage SmartSpectra WebSocket server started on ws://localhost:${PORT}`);

let sdk = null;
try {
    sdk = new SmartSpectraSDK({ apiKey: process.env.PRESAGE });
    sdk.useCustomInput();
    
    sdk.on('metrics', (buf) => {
        try {
            const data = decodeMetrics(buf);
            let formatted = null;
            if (data && data.face) {
                formatted = {
                    expressions: data.face.expressions || {},
                    eyeBlink: !!data.face.isBlinking,
                    talking: !!data.face.isTalking
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

wss.on('connection', (ws) => {
    console.log('React Client connected to Presage Server.');

    ws.on('message', async (message, isBinary) => {
        if (isBinary && sdk) {
            try {
                // message is a Buffer containing RGBA data (640x480 * 4 = 1228800 bytes)
                const width = 640;
                const height = 480;
                const stride = width * 4;
                const timestampUs = Date.now() * 1000;
                
                sdk.sendFrame(message, width, height, stride, PixelFormat.kRGBA, timestampUs);
            } catch (error) {
                console.error("Error sending frame to SDK:", error);
            }
        }
    });

    ws.on('close', () => {
        console.log('React Client disconnected.');
    });
});
