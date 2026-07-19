const WebSocket = require('ws');
require('dotenv').config({ path: '../../backend/.env' }); // Load the shared .env if possible

// TODO: Import the official SmartSpectra SDK here. 
// For example: const PresageSDK = require('@presagetech/smartspectra-node');
// Since it's proprietary, adjust the import to match their actual package name.

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`Presage SmartSpectra WebSocket server started on ws://localhost:${PORT}`);

// Initialize SDK (example based on standard SDK structures)
let isSdkInitialized = false;
try {
    /* 
    PresageSDK.init({ apiKey: process.env.VITE_PRESAGE || process.env.PRESAGE });
    isSdkInitialized = true;
    console.log("PresageSDK Initialized successfully.");
    */
    console.warn("WARNING: Presage SDK is not imported. Using a passthrough fallback.");
} catch (e) {
    console.error("Failed to initialize Presage SDK:", e);
}

wss.on('connection', (ws) => {
    console.log('React Client connected to Presage Server.');

    ws.on('message', async (message) => {
        try {
            // The React app will send base64 image strings
            const data = JSON.parse(message);
            
            if (data.type === 'frame') {
                const base64Image = data.image; // "data:image/jpeg;base64,/9j/4AAQ..."
                
                let detections = null;

                if (isSdkInitialized) {
                    // Feed the frame into the SDK
                    // e.g., detections = PresageSDK.processFrameBase64(base64Image);
                } else {
                    // Fallback Mock output so the web app doesn't crash during setup
                    const state = Math.random();
                    let expressions = { neutral: 1.0 };
                    
                    if (state > 0.9) expressions = { anger: 0.95 };
                    else if (state > 0.8) expressions = { sadness: 0.9 };
                    else if (state > 0.7) expressions = { surprise: 0.85 };
                    else if (state > 0.6) expressions = { happiness: 0.8 };

                    detections = {
                        expressions: expressions,
                        eyeBlink: Math.random() > 0.85,
                        talking: Math.random() > 0.7,
                    };
                }

                // Send the detections back to the React app
                ws.send(JSON.stringify({
                    type: 'detections',
                    data: detections
                }));
            }
        } catch (error) {
            console.error("Error processing frame:", error);
        }
    });

    ws.on('close', () => {
        console.log('React Client disconnected.');
    });
});
