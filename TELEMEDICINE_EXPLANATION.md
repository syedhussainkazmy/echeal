# Telemedicine Implementation - Code Explanation

This document explains how the video calling feature works at the code level.

---

## Architecture Overview

```
┌─────────────┐     Socket.io      ┌─────────────┐
│   Doctor    │◄──────────────────►│   Patient   │
│  (Client)   │    Signaling       │  (Client)   │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │        WebRTC (Peer-to-Peer)    │
       └──────────────────────────────────┘
              Video & Audio Streams
```

**Two connections happen:**
1. **Socket.io** - Used for "signaling" (setting up the call)
2. **WebRTC** - Direct peer-to-peer connection for actual video/audio

---

## 1. Socket.io - The Signaling Server

### What is "Signaling"?
Before two people can share video directly (WebRTC), they need to **find each other** and **exchange connection information**. This is called "signaling" - Socket.io handles this.

### Server Side (`server/src/index.ts`)

```typescript
// This creates a Socket.io server attached to your Express app
const io = new Server(httpServer, {
    cors: { origin: CORS_ORIGIN },  // Allow client to connect
});
```

**Authentication - Every socket connection must provide a JWT token:**

```typescript
io.use((socket, next) => {
    const token = socket.handshake.auth.token;  // Get token from connection
    const decoded = jwt.verify(token, ...);      // Verify it's valid
    (socket as any).user = decoded;              // Attach user to socket
    next();                                      // Allow connection
});
```

**Event Handlers:**

| Event | Purpose |
|-------|---------|
| `join-room` | Doctor/patient joins a virtual "room" (like a chat room) |
| `leave-room` | User leaves the room |
| `call-user` | Doctor sends connection offer to patient |
| `answer-call` | Patient sends connection answer back to doctor |
| `ice-candidate` | Exchange network path information |

```typescript
io.on('connection', (socket) => {
    socket.on('join-room', (roomId: string) => {
        socket.join(roomId);
    });

    socket.on('call-user', (data: { roomId: string; signal: any; from: string }) => {
        io.to(data.roomId).emit('call-incoming', { signal: data.signal, from: data.from });
    });

    socket.on('answer-call', (data: { roomId: string; signal: any }) => {
        io.to(data.roomId).emit('call-answered', { signal: data.signal });
    });

    socket.on('ice-candidate', (data: { roomId: string; candidate: any }) => {
        io.to(data.roomId).emit('ice-candidate', { candidate: data.candidate });
    });
});
```

### Client Side (`client/src/context/SocketContext.tsx`)

```typescript
// Connect to Socket.io server when user logs in (has token)
const socketInstance = io('http://localhost:5000', {
    auth: { token },                    // Send JWT for auth
    transports: ['websocket', 'polling'] // Try WebSocket first, fallback to HTTP
});
```

---

## 2. WebRTC (via simple-peer) - The Video Connection

### What is WebRTC?
WebRTC (Web Real-Time Communication) lets browsers share **directly** (peer-to-peer):
- Video streams
- Audio streams
- Data

### Key Library: simple-peer
simple-peer is a wrapper around WebRTC that makes it much easier to use. It handles:
- Creating peer connections
- Managing ICE candidates
- Signal exchange

### How the Connection Works (Step-by-Step)

```
STEP 1: Get local camera/microphone
────────────────────────────────────
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    → Returns a MediaStream (your camera/video)

STEP 2: Create Peer Connection
────────────────────────────────────
    // Doctor (initiator = true)
    new Peer({ initiator: true, stream: localStream })

    // Patient (initiator = false)
    new Peer({ initiator: false, stream: localStream })

STEP 3: Exchange "Signals" (connection offer/answer)
────────────────────────────────────
    Doctor → creates offer → sends to patient via Socket.io
    Patient → creates answer → sends to doctor via Socket.io
    Both → exchange ICE candidates (network paths)

STEP 4: Direct P2P Connection Established!
────────────────────────────────────
    - Video/audio flows directly between browsers
    - Server NOT involved (except for initial signaling)
```

---

## 3. VideoCall Component Code Walkthrough

### File: `client/src/components/video/VideoCall.tsx`

#### State Variables

```typescript
const [stream, setStream] = useState<MediaStream | null>(null);        // Local video/audio
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null); // Remote video/audio
const [peer, setPeer] = useState<Peer.Instance | null>(null);          // WebRTC peer connection
const [isAudioEnabled, setIsAudioEnabled] = useState(true);           // Mute state
const [isVideoEnabled, setIsVideoEnabled] = useState(true);           // Video on/off
const [isConnecting, setIsConnecting] = useState(true);               // Connection status
const [error, setError] = useState<string | null>(null);              // Error message
```

#### Step 1: Get Camera and Microphone

```typescript
const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,   // Get camera
    audio: true,   // Get microphone
});
setStream(mediaStream);
localVideoRef.current.srcObject = mediaStream;  // Show in local video element
```

#### Step 2: Doctor Creates Peer (Initiator)

```typescript
if (isDoctor) {
    const peerInstance = new Peer({
        initiator: true,      // Doctor starts the call
        trickle: false,       // Don't use trickle ICE (simpler)
        stream: localStream,  // Send my video/audio
    });
    setupPeer(peerInstance);
}
```

#### Step 3: Patient Listens for Incoming Call

```typescript
socket.on('call-incoming', (data: { signal: Peer.SignalData; from: string }) => {
    const peerInstance = new Peer({
        initiator: false,     // I'm answering, not initiating
        stream: localStream,
    });
    peerInstance.signal(data.signal);  // Apply doctor's offer
    setupPeer(peerInstance);
});
```

#### Step 4: Signal Exchange

When peer creates connection data, send it via Socket.io:

```typescript
peerInstance.on('signal', (data) => {
    if (isDoctor) {
        // Doctor sends offer
        socket.emit('call-user', { roomId, signal: data, from: user?.id });
    } else {
        // Patient sends answer
        socket.emit('answer-call', { roomId, signal: data });
    }
});
```

#### Step 5: Receive Remote Video

```typescript
peerInstance.on('stream', (remoteStream) => {
    // Remote user's video arrived!
    remoteVideoRef.current.srcObject = remoteStream;
    setIsConnecting(false);
});
```

#### Step 6: Controls (Mute/Video/End)

```typescript
// Toggle Audio
stream.getAudioTracks().forEach((track) => {
    track.enabled = !isAudioEnabled;  // Enable/disable
});

// Toggle Video
stream.getVideoTracks().forEach((track) => {
    track.enabled = !isVideoEnabled;
});

// End Call
peer.destroy();
stream.getTracks().forEach((track) => track.stop());
socket.emit('leave-room', roomId);
```

---

## 4. API Routes

### File: `server/src/routes/video.routes.ts`

```typescript
router.post('/room/:appointmentId', verifyToken, createVideoRoom);    // Start video
router.get('/room/:appointmentId', verifyToken, getVideoRoom);        // Get room info
router.post('/room/:appointmentId/end', verifyToken, endVideoConsultation); // End
```

### Controller: `server/src/controllers/video.controller.ts`

```typescript
export const createVideoRoom = async (req, res) => {
    const { appointmentId } = req.params;
    const userId = req.user.id;

    const appointment = await Appointment.findById(appointmentId);

    // Verify user is part of the appointment
    const isDoctor = appointment.doctor.toString() === userId;
    const isPatient = appointment.patient.toString() === userId;

    if (!isDoctor && !isPatient) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    // Generate room ID
    const roomId = `video-${appointmentId}`;

    // If doctor is starting, save to database
    if (isDoctor) {
        appointment.videoRoomId = roomId;
        appointment.videoStartedAt = new Date();
        await appointment.save();
    }

    res.json({ roomId, appointmentId: appointment._id });
};
```

---

## 5. Complete Flow Diagram

```
┌──────────────────────────┐         ┌──────────────────────────┐
│       DOCTOR            │         │       PATIENT            │
├──────────────────────────┤         ├──────────────────────────┤
│ 1. Click "Start Video"  │         │                          │
│ 2. POST /video/room     │         │                          │
│    (creates room)       │         │                          │
├──────────────────────────┤         ├──────────────────────────┤
│                         │  Socket.io                          │
│ 3. getUserMedia()      │◄────────►│ 4. Click "Join Call"   │
│    (camera/mic)        │   HTTP    │ 5. GET /video/room      │
│                        │            │ 6. getUserMedia()      │
├──────────────────────────┤            (camera/mic)         │
│ 7. Create Peer          │            ├──────────────────────────┤
│    (initiator=true)    │            │                         │
├──────────────────────────┤         │ 8. Create Peer          │
│ 9. emit('call-user')   │───────────►│    (initiator=false)   │
│    (with signal)       │  Socket.io│                         │
├──────────────────────────┤            │ 10. signal(doctor's) │
│                         │            ├──────────────────────────┤
│ 11. emit('answer-call')│◄───────────│ 11. emit('answer-call')│
│     (with answer)       │  Socket.io │     (with answer)      │
├──────────────────────────┤            ├──────────────────────────┤
│                         │   WebRTC   │                         │
│ 12. Remote video       │◄───────────►│ 13. Remote video      │
│     shows up!          │   Direct    │     shows up!          │
└──────────────────────────┘            └──────────────────────────┘
```

---

## 6. Key Concepts Summary

| Concept | What it does |
|---------|-------------|
| **Socket.io** | Real-time messaging between clients via server |
| **Signaling** | Exchanging connection info before P2P is established |
| **WebRTC** | Direct peer-to-peer video/audio communication |
| **simple-peer** | Library that makes WebRTC easier to use |
| **MediaStream** | Object containing video/audio tracks from camera |
| **ICE Candidate** | Network path information for NAT traversal |
| **Room** | Virtual container - both users join same room to find each other |
| **initiator: true** | The user who starts the call (doctor) |
| **initiator: false** | The user who answers the call (patient) |
| **signal** | Connection data that must be exchanged between peers |

---

## 7. Files Modified/Created

### Backend
- `server/package.json` - Added socket.io
- `server/src/models/Appointment.ts` - Added videoRoomId, videoStartedAt, videoEndedAt
- `server/src/index.ts` - Integrated Socket.io with auth and event handlers
- `server/src/routes/video.routes.ts` - NEW - Video API routes
- `server/src/controllers/video.controller.ts` - NEW - Video controller

### Frontend
- `client/package.json` - Added socket.io-client, simple-peer
- `client/src/context/SocketContext.tsx` - NEW - Socket.io connection manager
- `client/src/components/video/VideoCall.tsx` - NEW - Video call UI component
- `client/src/App.tsx` - Added SocketProvider wrapper
- `client/src/pages/doctor/Appointments.tsx` - Added video button
- `client/src/pages/patient/Appointments.tsx` - Added video button

---

## Questions?

If you have questions about any specific part, feel free to ask!
