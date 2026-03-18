import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { ArrowLeft, UserCircle, Activity, FileText } from 'lucide-react';

interface EHRData {
    profile: {
        user: { firstName: string; lastName: string; email: string };
        dateOfBirth?: string;
        gender?: string;
        bloodGroup?: string;
        contactNumber?: string;
        address?: string;
        emergencyContact?: { name: string; relation: string; contactNumber: string };
    };
    vitals: {
        _id: string;
        bloodPressure: { systolic: number; diastolic: number };
        heartRate: number;
        bloodSugar?: number;
        weight?: number;
        temperature?: number;
        notes?: string;
        recordedAt: string;
    }[];
    pastAppointments: {
        _id: string;
        appointmentDate: string;
        reasonForVisit: string;
        notes?: string;
        status: string;
    }[];
}

export default function PatientEHR() {
    const { patientId } = useParams<{ patientId: string }>();
    const [ehr, setEhr] = useState<EHRData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (patientId) {
            api.get(`/doctor/patients/${patientId}/ehr`).then(r => setEhr(r.data)).catch(console.error).finally(() => setLoading(false));
        }
    }, [patientId]);

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;
    if (!ehr) return <div className="text-center py-16 text-gray-400">Patient not found.</div>;

    const { profile, vitals, pastAppointments } = ehr;

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-3">
                <Link to="/doctor/patients" className="text-gray-400 hover:text-gray-700 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">EHR — {profile.user.firstName} {profile.user.lastName}</h1>
                    <p className="text-gray-500 text-sm">Electronic Health Record</p>
                </div>
            </div>

            {/* Patient Info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-4 mb-5">
                    <div className="bg-blue-100 rounded-full p-4"><UserCircle className="h-8 w-8 text-blue-600" /></div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">{profile.user.firstName} {profile.user.lastName}</h2>
                        <p className="text-sm text-gray-500">{profile.user.email}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Blood Group', value: profile.bloodGroup || '—' },
                        { label: 'Gender', value: profile.gender || '—' },
                        { label: 'Date of Birth', value: profile.dateOfBirth ? format(new Date(profile.dateOfBirth), 'MMM d, yyyy') : '—' },
                        { label: 'Contact', value: profile.contactNumber || '—' },
                    ].map(item => (
                        <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</p>
                            <p className="text-sm font-semibold text-gray-800 capitalize mt-1">{item.value}</p>
                        </div>
                    ))}
                </div>
                {profile.emergencyContact?.name && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Emergency Contact</p>
                        <p className="text-sm text-gray-700">{profile.emergencyContact.name} ({profile.emergencyContact.relation}) — {profile.emergencyContact.contactNumber}</p>
                    </div>
                )}
            </div>

            {/* Vitals */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-teal-600" />
                    <h2 className="text-base font-semibold text-gray-800">Vitals History ({vitals.length})</h2>
                </div>
                {vitals.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No vitals recorded.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Blood Pressure</th>
                                    <th className="px-4 py-3 text-left">Heart Rate</th>
                                    <th className="px-4 py-3 text-left">Sugar</th>
                                    <th className="px-4 py-3 text-left">Temp</th>
                                    <th className="px-4 py-3 text-left">Weight</th>
                                    <th className="px-4 py-3 text-left">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {vitals.map(v => (
                                    <tr key={v._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-700">{format(new Date(v.recordedAt), 'MMM d, yyyy')}</td>
                                        <td className="px-4 py-3 text-gray-600">{v.bloodPressure.systolic}/{v.bloodPressure.diastolic}</td>
                                        <td className="px-4 py-3 text-gray-600">{v.heartRate} bpm</td>
                                        <td className="px-4 py-3 text-gray-600">{v.bloodSugar ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{v.temperature ? `${v.temperature}°C` : '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{v.weight ? `${v.weight} kg` : '—'}</td>
                                        <td className="px-4 py-3 text-gray-400 text-xs italic">{v.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Past Appointments */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <h2 className="text-base font-semibold text-gray-800">Appointment History ({pastAppointments.length})</h2>
                </div>
                {pastAppointments.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No completed appointments with this patient.</div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {pastAppointments.map(a => (
                            <div key={a._id} className="px-6 py-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-gray-700 text-sm">{a.reasonForVisit}</p>
                                        {a.notes && <p className="text-sm text-blue-700 mt-1 italic">📝 {a.notes}</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">{format(new Date(a.appointmentDate), 'MMM d, yyyy')}</p>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">completed</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
