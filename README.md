## About StudyBunny 
Meet StudyBunny: a virtual study room that gamifies learning with a 3D bunny avatar. Upload dense documents and StudyBunny turns topics into bite-sized quests. The avatar uses computer vision to detect distraction and encourages you to stay on track. You can talk to the bunny about your material, and it teaches you out loud.

## Inspiration
Current study methods are often lonely and exhausting. Inspired by the rewarding loops of games like Animal Crossing, we wanted to bridge the gap between gaming and academics. We created an interactive virtual study buddy that monitors your progress and keeps you company.

## What it does
StudyBunny is a gamified AI study environment:
* **Quest Generation:** Upload PDFs or text files. The system segments topics and generates a structured Quest Board.
* **Focus Tracking:** StudyBunny tracks facial micro-expressions and attention metrics (Focus, Distraction, Struggling) via webcam.
* **Proactive Interventions:** If you lose focus, the avatar changes its mood and speaks to you to regain attention.
* **Conversational AI Tutor:** Speak to the bunny via microphone. Using RAG, it consults your documents and answers questions out loud.
* **Session Analytics:** View a breakdown of study history and struggling time after each session.

## How we built it
StudyBunny uses a decoupled microservice architecture:
* **Frontend:** React, Vite, and TypeScript. React Three Fiber renders and animates the 3D bunny.
* **Backend:** Python backend powered by FastAPI.
* **AI Pipeline (RAG):** Documents are parsed, chunked, and stored in ChromaDB. The Google Gemini API generates quests and answers questions.
* **Computer Vision:** The Presage SmartSpectra SDK in a Node.js WebSocket proxy analyzes webcam frames locally to calculate telemetry.
* **Voice Integration:** OpenAI Whisper for speech-to-text and ElevenLabs for text-to-speech.
* **Database & Auth:** Auth0 for authentication and MongoDB Atlas for data persistence.

## Challenges we ran into
* **3D Rigging:** Synchronizing React state with 3D bone rotations required linear interpolation and animation loops for smooth movement.
* **Concurrent Audio:** Designing a system where users can interrupt the AI required orchestration of Voice Activity Detection to clear audio contexts.
**Computer Vision Server Stability:** The native Node.js Presage SmartSpectra SDK was unstable when fed 30fps webcam data from a React frontend, causing race conditions and backend crashes. We stabilized it by introducing a dedicated Node.js WebSocket proxy that isolates the SDK loop, manages client multiplexing, and adds synthetic telemetry jitter to prevent disconnect‑related failures.

## Accomplishments that we're proud of
* **Interactivity:** The avatar successfully detects distraction and intervenes in real time.
* **Full-Stack Integration:** Bridging a Python backend, Node.js proxy, and WebGL frontend into a low-latency dashboard.
* **Aesthetic:** Combining retro pixel-art UI with a 3D environment to create an engaging experience.

## What we learned
* Managing local vector databases (ChromaDB) for RAG pipelines.
* Handling state across browser WebSockets and background Node.js processes.
* Integrating 3D model animations in web applications.

## What's next for StudyBunny
* **Multiplayer Rooms:** Let friends join the same room to track collective focus.
* **Leveling UP:** Unlock outfits and furniture by completing quests and maintaining streaks.
* **More accountability:** Screensharing to keep you on track.