import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Phone } from 'lucide-react';

interface VideoCallProps {
    appointmentId: string;
    roomId: string;
    isDoctor: boolean;
    onEnd: () => void;
}

// Simple WebRTC without PeerJS - using Socket.io for all signaling
export function VideoCall({ appointmentId, roomId, isDoctor, onEnd }: VideoCallProps) {
    const { socket, isConnected } = useSocket();

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isConnecting, setIsConnecting] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const socketIdRef = useRef<string>('');

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ],
    };

    // Initialize local stream
    useEffect(() => {
        const initMedia = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 },
                    audio: true,
                });
                streamRef.current = mediaStream;
                setStream(mediaStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error('Error accessing media devices:', err);
                setError('Failed to access camera/microphone. Please check permissions.');
            }
        };

        initMedia();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    // Initialize WebRTC peer connection
    const createPeerConnection = (): RTCPeerConnection => {
        const pc = new RTCPeerConnection(iceServers);

        // Add local tracks to connection
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, streamRef.current!);
            });
        }

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log('Received remote track');
            const [remoteMediaStream] = event.streams;
            setRemoteStream(remoteMediaStream);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteMediaStream;
            }
            setIsConnecting(false);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket && socket.connected) {
                socket.emit('ice-candidate', { roomId, candidate: event.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setIsConnecting(false);
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                onEnd();
            }
        };

        return pc;
    };

    // Initialize socket events
    useEffect(() => {
        if (!stream || !socket || !isConnected) return;

        console.log('Initializing WebRTC with Socket.io signaling');

        // Create peer connection
        const peerConnection = createPeerConnection();
        peerConnectionRef.current = peerConnection;

        // Join room
        socket.emit('join-room', { roomId });
        console.log('Joined room:', roomId);

        // If doctor, create and send offer
        if (isDoctor) {
            const createOffer = async () => {
                try {
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    socket.emit('offer', { roomId, offer });
                    console.log('Created and sent offer');
                } catch (err) {
                    console.error('Error creating offer:', err);
                }
            };

            // Wait a bit for patient to join
            setTimeout(createOffer, 2000);
        }

        // Handle incoming offer (patient)
        socket.on('offer', async (data: { offer: RTCSessionDescriptionInit }) => {
            console.log('Received offer');
            if (peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(data.offer);
                    const answer = await peerConnectionRef.current.createAnswer();
                    await peerConnectionRef.current.setLocalDescription(answer);
                    socket.emit('answer', { roomId, answer });
                    console.log('Created and sent answer');
                } catch (err) {
                    console.error('Error handling offer:', err);
                }
            }
        });

        // Handle incoming answer (doctor)
        socket.on('answer', async (data: { answer: RTCSessionDescriptionInit }) => {
            console.log('Received answer');
            if (peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(data.answer);
                    console.log('Set remote description from answer');
                } catch (err) {
                    console.error('Error handling answer:', err);
                }
            }
        });

        // Handle ICE candidates
        socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
            console.log('Received ICE candidate');
            if (peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.addIceCandidate(data.candidate);
                } catch (err) {
                    console.error('Error adding ICE candidate:', err);
                }
            }
        });

        // Handle user joined (for doctor to know when patient is ready)
        socket.on('user-joined', () => {
            console.log('User joined room');
            // If doctor and we have a peer connection, recreate the offer
            if (isDoctor && peerConnectionRef.current) {
                const recreateOffer = async () => {
                    try {
                        const offer = await peerConnectionRef.current!.createOffer();
                        await peerConnectionRef.current!.setLocalDescription(offer);
                        socket.emit('offer', { roomId, offer });
                        console.log('Recreated and sent offer');
                    } catch (err) {
                        console.error('Error recreating offer:', err);
                    }
                };
                setTimeout(recreateOffer, 1000);
            }
        });

        return () => {
            console.log('Cleaning up...');
            socket.off('offer');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('user-joined');
            socket.emit('leave-room', roomId);
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, [stream, socket, isConnected, roomId, isDoctor, onEnd]);

    const toggleAudio = () => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !isAudioEnabled;
            });
            setIsAudioEnabled(!isAudioEnabled);
        }
    };

    const toggleVideo = () => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = !isVideoEnabled;
            });
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    const endCall = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (socket) {
            socket.emit('leave-room', roomId);
        }
        onEnd();
    };

    if (error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                <div className="bg-white rounded-lg p-6 max-w-md text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={onEnd}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-800">
                <h3 className="text-white text-lg font-semibold">
                    Video Consultation
                </h3>
                <div className="flex items-center gap-2">
                    {isConnecting && (
                        <span className="text-yellow-400 text-sm">Connecting...</span>
                    )}
                    {isDoctor && (
                        <span className="text-green-400 text-sm">Doctor</span>
                    )}
                    {!isDoctor && (
                        <span className="text-blue-400 text-sm">Patient</span>
                    )}
                </div>
            </div>

            {/* Video Container */}
            <div className="flex-1 relative">
                {/* Remote Video (main) */}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    {remoteStream ? (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                                <Video className="w-12 h-12" />
                            </div>
                            <p>{isConnecting ? 'Connecting to call...' : 'Waiting for participant...'}</p>
                        </div>
                    )}
                </div>

                {/* Local Video (picture-in-picture) */}
                <div className="absolute bottom-24 right-6 w-48 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-gray-600">
                    {stream ? (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover mirror"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <VideoOff className="w-8 h-8 text-gray-400" />
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-6 bg-gray-800">
                <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-full ${
                        isAudioEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-700'
                    } text-white transition-colors`}
                    title={isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                    {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full ${
                        isVideoEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-700'
                    } text-white transition-colors`}
                    title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                    {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </button>

                <button
                    onClick={endCall}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                    title="End call"
                >
                    {isDoctor ? <PhoneOff className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
                </button>
            </div>
        </div>
    );
}
