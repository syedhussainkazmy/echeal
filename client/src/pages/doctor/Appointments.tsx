import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { CalendarDays, Clock, CheckCircle, XCircle, X, Video } from 'lucide-react';
import { PageLoading } from '../../components/ui/PageLoading';
import { AppointmentStatusBadge } from '../../components/appointments/AppointmentStatusBadge';
import { VideoCall } from '../../components/video/VideoCall';

interface Appointment {
    _id: string;
    patient: { firstName: string; lastName: string; email: string };
    appointmentDate: string;
    reasonForVisit: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
    videoRoomId?: string;
    videoStartedAt?: string;
}

export default function DoctorAppointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [notesModal, setNotesModal] = useState<{ id: string; notes: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const [videoCall, setVideoCall] = useState<{ roomId: string; appointmentId: string } | null>(null);
    const [startingVideo, setStartingVideo] = useState(false);

    const fetchAppointments = async () => {
        try {
            const res = await api.get('/doctor/appointments', { params: { page: 1, limit: 100, sortOrder: 'desc' } });
            setAppointments(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAppointments(); }, []);

    const startVideoCall = async (appointmentId: string) => {
        setStartingVideo(true);
        try {
            const res = await api.post(`/video/room/${appointmentId}`);
            setVideoCall({
                roomId: res.data.roomId,
                appointmentId: appointmentId
            });
        } catch (e) {
            console.error('Failed to start video call:', e);
            alert('Failed to start video call. Please try again.');
        } finally {
            setStartingVideo(false);
        }
    };

    const updateStatus = async (id: string, status: string, notes?: string) => {
        setSaving(true);
        try {
            await api.patch(`/doctor/appointments/${id}/status`, { status, notes });
            await fetchAppointments();
            setNotesModal(null);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const pending = appointments.filter(a => a.status === 'pending');
    const confirmed = appointments.filter(a => a.status === 'confirmed');
    const history = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');

    if (loading) return <PageLoading role="doctor" />;

    const AppointmentCard = ({ a }: { a: Appointment }) => (
        <div className="bg-white rounded-md border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="font-semibold text-gray-800">{a.patient.firstName} {a.patient.lastName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{a.patient.email}</p>
                    <p className="text-sm text-gray-600 mt-2 italic">"{a.reasonForVisit}"</p>
                    {a.notes && <p className="text-xs text-blue-600 mt-1">📝 {a.notes}</p>}
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 justify-end">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(a.appointmentDate), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 justify-end mt-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(a.appointmentDate), 'h:mm a')}
                    </div>
                    <AppointmentStatusBadge status={a.status} />
                </div>
            </div>

            {/* Action Buttons */}
            {a.status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                    <button onClick={() => updateStatus(a._id, 'confirmed')} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> Confirm
                    </button>
                    <button onClick={() => updateStatus(a._id, 'cancelled')} className="flex items-center gap-1.5 text-sm border border-red-200 text-red-600 px-4 py-2 rounded hover:bg-red-50 transition-colors font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                </div>
            )}
            {a.status === 'confirmed' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                    <button
                        onClick={() => startVideoCall(a._id)}
                        disabled={startingVideo}
                        className="flex items-center gap-1.5 text-sm bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                    >
                        <Video className="h-3.5 w-3.5" />
                        {startingVideo ? 'Starting...' : 'Start Video Consultation'}
                    </button>
                    <button onClick={() => setNotesModal({ id: a._id, notes: a.notes || '' })} className="flex items-center gap-1.5 text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> Mark Complete
                    </button>
                    <button onClick={() => updateStatus(a._id, 'cancelled')} className="flex items-center gap-1.5 text-sm border border-red-200 text-red-600 px-4 py-2 rounded hover:bg-red-50 transition-colors font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
                <p className="text-gray-500 mt-1">Manage patient appointments and update their status</p>
            </div>

            {/* Notes/Complete Modal */}
            {notesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-md border border-gray-200 w-full max-w-md mx-4 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Complete Appointment</h2>
                            <button onClick={() => setNotesModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Add consultation notes before marking as complete (optional).</p>
                        <textarea
                            rows={4}
                            value={notesModal.notes}
                            onChange={e => setNotesModal(m => m ? { ...m, notes: e.target.value } : null)}
                            placeholder="Diagnosis, prescription, follow-up instructions..."
                            className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setNotesModal(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                            <button disabled={saving} onClick={() => updateStatus(notesModal.id, 'completed', notesModal.notes)} className="flex-1 bg-green-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
                                {saving ? 'Saving...' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pending.length > 0 && (
                <section>
                    <h2 className="text-base font-semibold text-yellow-700 mb-3">⏳ Pending Approval ({pending.length})</h2>
                    <div className="space-y-3">{pending.map(a => <AppointmentCard key={a._id} a={a} />)}</div>
                </section>
            )}
            {confirmed.length > 0 && (
                <section>
                    <h2 className="text-base font-semibold text-blue-700 mb-3">✅ Confirmed ({confirmed.length})</h2>
                    <div className="space-y-3">{confirmed.map(a => <AppointmentCard key={a._id} a={a} />)}</div>
                </section>
            )}
            {history.length > 0 && (
                <section>
                    <h2 className="text-base font-semibold text-gray-500 mb-3">History ({history.length})</h2>
                    <div className="space-y-3">{history.map(a => <AppointmentCard key={a._id} a={a} />)}</div>
                </section>
            )}
            {appointments.length === 0 && (
                <div className="bg-white rounded-md border border-gray-100 p-16 text-center">
                    <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No appointments yet. Patients will book once you're verified.</p>
                </div>
            )}

            {/* Video Call Modal */}
            {videoCall && (
                <VideoCall
                    appointmentId={videoCall.appointmentId}
                    roomId={videoCall.roomId}
                    isDoctor={true}
                    onEnd={() => {
                        setVideoCall(null);
                        fetchAppointments();
                    }}
                />
            )}
        </div>
    );
}
