import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { UserCircle, Save, CheckCircle } from 'lucide-react';
import { PageLoading } from '../../components/ui/PageLoading';

interface Profile {
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    contactNumber?: string;
    address?: string;
    emergencyContact?: { name: string; relation: string; contactNumber: string };
    user?: { firstName: string; lastName: string; email: string };
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientProfile() {
    const [profile, setProfile] = useState<Profile>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        dateOfBirth: '', gender: '', bloodGroup: '', contactNumber: '', address: '',
        emergencyName: '', emergencyRelation: '', emergencyContact: '',
    });

    useEffect(() => {
        api.get('/patient/dashboard').then(r => {
            const p = r.data.profile;
            setProfile(p || {});
            setForm({
                dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
                gender: p?.gender || '',
                bloodGroup: p?.bloodGroup || '',
                contactNumber: p?.contactNumber || '',
                address: p?.address || '',
                emergencyName: p?.emergencyContact?.name || '',
                emergencyRelation: p?.emergencyContact?.relation || '',
                emergencyContact: p?.emergencyContact?.contactNumber || '',
            });
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await api.put('/patient/profile', {
                dateOfBirth: form.dateOfBirth || undefined,
                gender: form.gender || undefined,
                bloodGroup: form.bloodGroup || undefined,
                contactNumber: form.contactNumber || undefined,
                address: form.address || undefined,
                emergencyContact: form.emergencyName ? {
                    name: form.emergencyName,
                    relation: form.emergencyRelation,
                    contactNumber: form.emergencyContact,
                } : undefined,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoading role="patient" />;

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-500 mt-1">Manage your personal health information</p>
            </div>

            {/* Account Info (read-only) */}
            <div className="bg-white rounded-md border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-teal-100 rounded-full p-4">
                        <UserCircle className="h-8 w-8 text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">{profile.user?.firstName} {profile.user?.lastName}</h2>
                        <p className="text-sm text-gray-500">{profile.user?.email}</p>
                        <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">Patient</span>
                    </div>
                </div>
            </div>

            {/* Editable Profile */}
            <form onSubmit={handleSave} className="bg-white rounded-md border border-gray-100 p-6 space-y-6">
                <h2 className="text-base font-semibold text-gray-800">Health Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                            <option value="">Not specified</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                        <select value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                            <option value="">Select blood group</option>
                            {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                        <input type="tel" value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} placeholder="+1 234 567 8900" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} placeholder="Your home address" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>

                <div className="border-t border-gray-100 pt-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Emergency Contact</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Full Name</label>
                            <input type="text" value={form.emergencyName} onChange={e => setForm(f => ({ ...f, emergencyName: e.target.value }))} placeholder="Jane Doe" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Relation</label>
                            <input type="text" value={form.emergencyRelation} onChange={e => setForm(f => ({ ...f, emergencyRelation: e.target.value }))} placeholder="Spouse" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Phone Number</label>
                            <input type="tel" value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} placeholder="+1 234 567 8900" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                        </div>
                    </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex items-center gap-4 pt-2">
                    <button type="submit" disabled={saving} className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60">
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                    {saved && <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium"><CheckCircle className="h-4 w-4" /> Saved!</span>}
                </div>
            </form>
        </div>
    );
}
