import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { CalendarDays, Clock, Plus, X, Stethoscope, Video } from 'lucide-react';
import { PageLoading } from '../../components/ui/PageLoading';
import { ModalShell } from '../../components/ui/ModalShell';
import { AppointmentStatusBadge } from '../../components/appointments/AppointmentStatusBadge';
import { VideoCall } from '../../components/video/VideoCall';

interface Doctor {
    _id: string;
    specialization: string;
    consultationFee: number;
    user: { firstName: string; lastName: string; email: string };
}

interface Appointment {
    _id: string;
    doctor: { firstName: string; lastName: string; email: string };
    appointmentDate: string;
    reasonForVisit: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
    videoRoomId?: string;
    videoStartedAt?: string;
}

const formatLocalDateTimeInput = (date: Date): string => {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function PatientAppointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBooking, setShowBooking] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [appointmentDate, setAppointmentDate] = useState('');
    const [reason, setReason] = useState('');
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState('');
    const [videoCall, setVideoCall] = useState<{ roomId: string; appointmentId: string } | null>(null);
    const [joiningVideo, setJoiningVideo] = useState(false);

    const fetchData = async () => {
        try {
            const [apptRes, docRes] = await Promise.all([
                api.get('/patient/appointments', { params: { page: 1, limit: 100, sortOrder: 'desc' } }),
                api.get('/patient/doctors', { params: { page: 1, limit: 100, sortOrder: 'asc' } }),
            ]);
            setAppointments(apptRes.data.data);
            setDoctors(docRes.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Auto-refresh appointments every 10 seconds to check for video ready status
    useEffect(() => {
        const interval = setInterval(() => {
            api.get('/patient/appointments', { params: { page: 1, limit: 100, sortOrder: 'desc' } })
                .then(res => setAppointments(res.data.data))
                .catch(console.error);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const joinVideoCall = async (appointmentId: string) => {
        setJoiningVideo(true);
        try {
            const res = await api.get(`/video/room/${appointmentId}`);
            if (res.data.roomId) {
                setVideoCall({
                    roomId: res.data.roomId,
                    appointmentId: appointmentId
                });
            } else {
                alert('Video call has not been started yet. Please wait for the doctor to start the call.');
            }
        } catch (e) {
            console.error('Failed to join video call:', e);
            alert('Failed to join video call. Please try again.');
        } finally {
            setJoiningVideo(false);
        }
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const parsedAppointmentDate = new Date(appointmentDate);
        const reasonText = reason.trim();

        if (Number.isNaN(parsedAppointmentDate.getTime())) {
            setError('Please select a valid appointment date and time.');
            return;
        }

        // Keep a small buffer to avoid race conditions between client and server clocks.
        if (parsedAppointmentDate.getTime() <= Date.now() + 60 * 1000) {
            setError('Appointment date must be at least 1 minute in the future.');
            return;
        }

        if (reasonText.length < 5 || reasonText.length > 500) {
            setError('Reason for visit must be between 5 and 500 characters.');
            return;
        }

        setBooking(true);
        try {
            await api.post('/patient/appointments', {
                doctorId: selectedDoctor,
                appointmentDate: parsedAppointmentDate.toISOString(),
                reasonForVisit: reasonText,
            });
            setShowBooking(false);
            setSelectedDoctor('');
            setAppointmentDate('');
            setReason('');
            await fetchData();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to book appointment');
        } finally {
            setBooking(false);
        }
    };

    const upcoming = appointments.filter(a => new Date(a.appointmentDate) >= new Date() && a.status !== 'cancelled');
    const past = appointments.filter(a => new Date(a.appointmentDate) < new Date() || a.status === 'completed' || a.status === 'cancelled');

    if (loading) return <PageLoading role="patient" />;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
                    <p className="text-gray-500 mt-1">Manage and book your appointments</p>
                </div>
                <button
                    onClick={() => setShowBooking(true)}
                        className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-teal-700 transition-colors"
                >
                    <Plus className="h-4 w-4" /> Book Appointment
                </button>
            </div>

            {/* Booking Modal */}
            {showBooking && (
                <ModalShell>
                    <div className="bg-white rounded-md border border-gray-200 w-full max-w-md mx-4 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Book an Appointment</h2>
                            <button onClick={() => setShowBooking(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleBook} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
                                <select
                                    required
                                    value={selectedDoctor}
                                    onChange={e => setSelectedDoctor(e.target.value)}
                                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">-- Choose a doctor --</option>
                                    {doctors.map(d => (
                                        <option key={d._id} value={d._id}>
                                            Dr. {d.user.firstName} {d.user.lastName} — {d.specialization}
                                        </option>
                                    ))}
                                </select>
                                {doctors.length === 0 && <p className="text-xs text-amber-600 mt-1">No verified doctors available yet.</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={appointmentDate}
                                    onChange={e => setAppointmentDate(e.target.value)}
                                    min={formatLocalDateTimeInput(new Date(Date.now() + 5 * 60 * 1000))}
                                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
                                <textarea
                                    required
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={3}
                                    placeholder="Describe your symptoms or reason..."
                                    className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                />
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowBooking(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={booking} className="flex-1 bg-teal-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60">
                                    {booking ? 'Booking...' : 'Confirm Booking'}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalShell>
            )}

            {/* Upcoming */}
            <section>
                <h2 className="text-base font-semibold text-gray-700 mb-3">Upcoming ({upcoming.length})</h2>
                {upcoming.length === 0 ? (
                    <div className="bg-white rounded-md border border-gray-100 p-10 text-center">
                        <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No upcoming appointments. Book one now!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {upcoming.map(a => (
                            <div key={a._id} className="bg-white rounded-md border border-gray-100 p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-teal-50 rounded p-3"><Stethoscope className="h-5 w-5 text-teal-600" /></div>
                                    <div>
                                        <p className="font-semibold text-gray-800">Dr. {a.doctor.firstName} {a.doctor.lastName}</p>
                                        <p className="text-sm text-gray-500">{a.reasonForVisit}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1 justify-end"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(a.appointmentDate), 'MMM d, yyyy')}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-0.5"><Clock className="h-3 w-3" />{format(new Date(a.appointmentDate), 'h:mm a')}</p>
                                    <AppointmentStatusBadge status={a.status} />
                                    {a.status === 'confirmed' && (
                                        <button
                                            onClick={() => joinVideoCall(a._id)}
                                            disabled={joiningVideo}
                                            className={`mt-2 flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors disabled:opacity-50 ${
                                                a.videoRoomId
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                            }`}
                                        >
                                            <Video className="h-3.5 w-3.5" />
                                            {a.videoRoomId ? 'Video Ready - Join' : (joiningVideo ? 'Joining...' : 'Join Video Call')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Past */}
            {past.length > 0 && (
                <section>
                    <h2 className="text-base font-semibold text-gray-700 mb-3">Past Appointments ({past.length})</h2>
                    <div className="space-y-3">
                        {past.map(a => (
                            <div key={a._id} className="bg-white rounded-md border border-gray-100 p-4 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                                <div>
                                    <p className="font-medium text-gray-700 text-sm">Dr. {a.doctor.firstName} {a.doctor.lastName}</p>
                                    <p className="text-xs text-gray-400">{a.reasonForVisit}</p>
                                    {a.notes && <p className="text-xs text-blue-600 mt-1 italic">📝 {a.notes}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">{format(new Date(a.appointmentDate), 'MMM d, yyyy')}</p>
                                    <AppointmentStatusBadge status={a.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Video Call Modal */}
            {videoCall && (
                <VideoCall
                    appointmentId={videoCall.appointmentId}
                    roomId={videoCall.roomId}
                    isDoctor={false}
                    onEnd={() => {
                        setVideoCall(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}
