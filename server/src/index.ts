import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { seedAdminUser } from './utils/seedAdmin.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
    throw new Error('Missing required environment variable: JWT_SECRET');
}

if (!process.env.MONGO_URI) {
    throw new Error('Missing required environment variable: MONGO_URI');
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Socket.io setup
const io = new Server(httpServer, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

const apiLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use('/api', apiLimiter);

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import adminRoutes from './routes/admin.routes.js';
import videoRoutes from './routes/video.routes.js';

// Basic route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Smart Healthcare API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/video', videoRoutes);

// Socket.io authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        (socket as any).user = decoded;
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
});

// Socket.io event handlers
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join video room
    socket.on('join-room', (data: { roomId: string; peerId?: string }) => {
        socket.join(data.roomId);
        console.log(`Socket ${socket.id} joined room ${data.roomId}`);

        // Notify others in the room
        socket.to(data.roomId).emit('user-joined');
    });

    // WebRTC Signaling: Offer from caller (doctor)
    socket.on('offer', (data: { roomId: string; offer: any }) => {
        console.log('Forwarding offer to room:', data.roomId);
        socket.to(data.roomId).emit('offer', { offer: data.offer });
    });

    // WebRTC Signaling: Answer from callee (patient)
    socket.on('answer', (data: { roomId: string; answer: any }) => {
        console.log('Forwarding answer to room:', data.roomId);
        socket.to(data.roomId).emit('answer', { answer: data.answer });
    });

    // WebRTC Signaling: ICE candidates
    socket.on('ice-candidate', (data: { roomId: string; candidate: any }) => {
        socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate });
    });

    socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});


const startServer = async () => {
    await connectDB();
    await seedAdminUser();

    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
});
