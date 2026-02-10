# 🎵 HarmonyHub

> **"Google Docs for Music"** — A real-time collaborative Digital Audio Workstation (DAW) where users can create, edit, and remix music together in the browser.

HarmonyHub allows multiple users to join a "Jam Session" via a unique link. Changes made by one user (adding a drum loop, adjusting a slider) 
are instantly synchronized to all other connected users using WebSockets and CRDTs (Conflict-free Replicated Data Types).

## 🚀 Tech Stack

### **Backend (The Conductor)**

* **Node.js & Express:** REST API for project management and file signing.
* **WebSocket (`ws`):** Real-time bidirectional communication.
* **Yjs:** CRDT library for shared state management (magic sync).
* **y-websocket:** Protocol for syncing Yjs documents over the network.

### **Frontend (The Studio)**

* **React (Vite):** Fast, component-based UI.
* **Tone.js:** Web Audio API wrapper for playback and synthesis.
* **Yjs Client:** Local state replica that syncs with the backend.

---

## 📂 Project Structure

```bash
HarmonyHub/
├── server.js            # Main backend entry point (API + WebSocket)
├── package.json         # Backend dependencies
├── README.md            # This file
└── client/              # React Frontend
    ├── src/
    │   ├── useHarmonyStore.js  # Custom hook for Yjs logic
    │   └── App.jsx             # Main Studio UI
    ├── package.json     # Frontend dependencies
    └── vite.config.js   # Build configuration

```

---

## 🛠️ Getting Started

Follow these steps to run the project locally.

### **1. Prerequisites**

* Node.js (v18 or higher recommended)
* npm

### **2. Backend Setup**

Navigate to the root directory and install dependencies:

```bash
# Install backend packages
npm install express ws yjs y-websocket@1.5.4 cors dotenv uuid

```

Start the backend server:

```bash
node server.js

```

* **REST API:** `http://localhost:3000/api`
* **WebSocket:** `ws://localhost:3000/jam/{room-id}`

### **3. Frontend Setup**

Open a **new terminal**, navigate to the client folder, and start the React app:

```bash
cd client
npm install
npm run dev

```

* Open your browser at `http://localhost:5173` (or the port shown in terminal).

---

## 🎮 How to Test Real-Time Sync

1. Open the app in **Browser Window A**.
2. Open the same URL in **Browser Window B** (simulate a second user).
3. Click **"+ Add Drum Track"** in Window A.
4. **Result:** You will see the track appear instantly in Window B without refreshing.

---

## 🛣️ Roadmap

* [x] **Phase 1:** Core Architecture (Node.js + Yjs setup)
* [x] **Phase 2:** Basic Real-time Sync (Add/Remove Tracks)
* [ ] **Phase 3:** Audio Playback Engine (Tone.js integration)
* [ ] **Phase 4:** Cloud Storage (AWS S3 for actual audio files)
* [ ] **Phase 5:** User Accounts & Profiles

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

### **License**

Distributed under the MIT License. See `LICENSE` for more information.
