import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Save, CheckCircle, Stethoscope, Plus, Trash2 } from 'lucide-react';

const SPECIALIZATIONS = ['Cardiology', 'Dermatology', 'General', 'Gynecology', 'Neurology', 'Oncology', 'Ophthalmology', 'Orthopedics', 'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery', 'Urology'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface AvailabilitySlot { dayOfWeek: string; startTime: string; endTime: string; }

export default function DoctorProfile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [profileUser, setProfileUser] = useState<any>(null);

    const [form, setForm] = useState({
        specialization: 'General',
        qualifications: [] as string[],
        newQualification: '',
        experienceYears: 0,
        consultationFee: 0,
        bio: '',
        clinicAddress: '',
        availability: [] as AvailabilitySlot[],
    });

    useEffect(() => {
        api.get('/doctor/dashboard').then(r => {
            const p = r.data.profile;
            if (p) {
                setProfileUser(p.user);
                setForm(f => ({
                    ...f,
                    specialization: p.specialization || 'General',
                    qualifications: p.qualifications || [],
                    experienceYears: p.experienceYears || 0,
                    consultationFee: p.consultationFee || 0,
                    bio: p.bio || '',
                    clinicAddress: p.clinicAddress || '',
                    availability: p.availability || [],
                }));
            }
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const addQualification = () => {
        if (form.newQualification.trim()) {
            setForm(f => ({ ...f, qualifications: [...f.qualifications, f.newQualification.trim()], newQualification: '' }));
        }
    };
    const removeQualification = (i: number) => setForm(f => ({ ...f, qualifications: f.qualifications.filter((_, idx) => idx !== i) }));

    const addAvailability = () => setForm(f => ({ ...f, availability: [...f.availability, { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' }] }));
    const removeAvailability = (i: number) => setForm(f => ({ ...f, availability: f.availability.filter((_, idx) => idx !== i) }));
    const updateAvailability = (i: number, field: keyof AvailabilitySlot, value: string) => {
        setForm(f => {
            const updated = [...f.availability];
            updated[i] = { ...updated[i], [field]: value };
            return { ...f, availability: updated };
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await api.put('/doctor/profile', {
                specialization: form.specialization,
                qualifications: form.qualifications,
                experienceYears: Number(form.experienceYears),
                consultationFee: Number(form.consultationFee),
                bio: form.bio,
                clinicAddress: form.clinicAddress,
                availability: form.availability,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-500 mt-1">Update your professional information visible to patients</p>
            </div>

            {/* Account Info */}
            {profileUser && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-4">
                    <div className="bg-blue-100 rounded-full p-4"><Stethoscope className="h-8 w-8 text-blue-600" /></div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Dr. {profileUser.firstName} {profileUser.lastName}</h2>
                        <p className="text-sm text-gray-500">{profileUser.email}</p>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">Doctor</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                {/* Professional Info */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-800">Professional Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                            <select value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                                {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                            <input type="number" min={0} value={form.experienceYears} onChange={e => setForm(f => ({ ...f, experienceYears: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee ($)</label>
                            <input type="number" min={0} value={form.consultationFee} onChange={e => setForm(f => ({ ...f, consultationFee: +e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Address</label>
                            <input type="text" value={form.clinicAddress} onChange={e => setForm(f => ({ ...f, clinicAddress: e.target.value }))} placeholder="123 Medical St" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} placeholder="Tell patients about yourself..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                    </div>
                </div>

                {/* Qualifications */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
                    <h2 className="text-base font-semibold text-gray-800">Qualifications</h2>
                    <div className="flex gap-2">
                        <input type="text" value={form.newQualification} onChange={e => setForm(f => ({ ...f, newQualification: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addQualification())} placeholder="e.g. MBBS, MD, FRCS..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <button type="button" onClick={addQualification} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"><Plus className="h-4 w-4" /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {form.qualifications.map((q, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 text-sm px-3 py-1 rounded-full">
                                {q}
                                <button type="button" onClick={() => removeQualification(i)} className="text-blue-400 hover:text-blue-700"><Trash2 className="h-3.5 w-3.5" /></button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Availability */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-base font-semibold text-gray-800">Availability</h2>
                        <button type="button" onClick={addAvailability} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"><Plus className="h-4 w-4" /> Add Slot</button>
                    </div>
                    {form.availability.length === 0 && <p className="text-sm text-gray-400">No availability slots set. Add your working hours.</p>}
                    {form.availability.map((slot, i) => (
                        <div key={i} className="flex items-center gap-3 flex-wrap">
                            <select value={slot.dayOfWeek} onChange={e => updateAvailability(i, 'dayOfWeek', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                                {DAYS.map(d => <option key={d}>{d}</option>)}
                            </select>
                            <input type="time" value={slot.startTime} onChange={e => updateAvailability(i, 'startTime', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            <span className="text-gray-400 text-sm">to</span>
                            <input type="time" value={slot.endTime} onChange={e => updateAvailability(i, 'endTime', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            <button type="button" onClick={() => removeAvailability(i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    ))}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex items-center gap-4">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                    {saved && <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Saved!</span>}
                </div>
            </form>
        </div>
    );
}
