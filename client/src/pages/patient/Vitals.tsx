import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { Activity, Plus, X, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Vital {
    _id: string;
    bloodPressure: { systolic: number; diastolic: number };
    heartRate: number;
    bloodSugar?: number;
    weight?: number;
    temperature?: number;
    notes?: string;
    recordedAt: string;
}

export default function PatientVitals() {
    const [vitals, setVitals] = useState<Vital[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        systolic: '', diastolic: '', heartRate: '',
        bloodSugar: '', weight: '', temperature: '', notes: '',
    });

    const fetchVitals = async () => {
        try {
            const res = await api.get('/patient/vitals', { params: { page: 1, limit: 100, sortOrder: 'desc' } });
            setVitals(res.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchVitals(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await api.post('/patient/vitals', {
                bloodPressure: { systolic: Number(form.systolic), diastolic: Number(form.diastolic) },
                heartRate: Number(form.heartRate),
                bloodSugar: form.bloodSugar ? Number(form.bloodSugar) : undefined,
                weight: form.weight ? Number(form.weight) : undefined,
                temperature: form.temperature ? Number(form.temperature) : undefined,
                notes: form.notes || undefined,
            });
            setShowForm(false);
            setForm({ systolic: '', diastolic: '', heartRate: '', bloodSugar: '', weight: '', temperature: '', notes: '' });
            await fetchVitals();
        } catch (e: unknown) {
            const message =
                typeof e === 'object' &&
                e !== null &&
                'response' in e &&
                typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
                    ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
                    : 'Failed to save vitals';
            setError(message || 'Failed to save vitals');
        } finally {
            setSubmitting(false);
        }
    };

    const chartData = [...vitals].reverse().map(v => ({
        date: format(new Date(v.recordedAt), 'MMM d'),
        systolic: v.bloodPressure.systolic,
        diastolic: v.bloodPressure.diastolic,
        heartRate: v.heartRate,
    }));

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Vitals</h1>
                    <p className="text-gray-500 mt-1">Track your health metrics over time</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" /> Log Vitals
                </button>
            </div>

            {/* Log Vitals Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Log New Vitals</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">BP Systolic (mmHg)*</label>
                                    <input type="number" required value={form.systolic} onChange={e => setForm(f => ({ ...f, systolic: e.target.value }))} placeholder="120" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">BP Diastolic (mmHg)*</label>
                                    <input type="number" required value={form.diastolic} onChange={e => setForm(f => ({ ...f, diastolic: e.target.value }))} placeholder="80" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate (bpm)*</label>
                                    <input type="number" required value={form.heartRate} onChange={e => setForm(f => ({ ...f, heartRate: e.target.value }))} placeholder="72" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Sugar (mg/dL)</label>
                                    <input type="number" value={form.bloodSugar} onChange={e => setForm(f => ({ ...f, bloodSugar: e.target.value }))} placeholder="100" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                    <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="70" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                                    <input type="number" step="0.1" value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))} placeholder="37.0" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any symptoms or observations..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60">
                                    {submitting ? 'Saving...' : 'Save Vitals'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Charts */}
            {chartData.length > 1 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-teal-600" />
                        <h2 className="text-base font-semibold text-gray-800">Blood Pressure Trend</h2>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="systolic" stroke="#14b8a6" strokeWidth={2} dot={false} name="Systolic" />
                            <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={false} name="Diastolic" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Vitals History Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50">
                    <h2 className="text-base font-semibold text-gray-800">Vitals History</h2>
                </div>
                {vitals.length === 0 ? (
                    <div className="text-center py-16">
                        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No vitals recorded yet. Log your first reading!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 text-left">Date</th>
                                    <th className="px-6 py-3 text-left">Blood Pressure</th>
                                    <th className="px-6 py-3 text-left">Heart Rate</th>
                                    <th className="px-6 py-3 text-left">Blood Sugar</th>
                                    <th className="px-6 py-3 text-left">Temp</th>
                                    <th className="px-6 py-3 text-left">Weight</th>
                                    <th className="px-6 py-3 text-left">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {vitals.map(v => (
                                    <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-700">{format(new Date(v.recordedAt), 'MMM d, yyyy')}</td>
                                        <td className="px-6 py-4 text-gray-600">{v.bloodPressure.systolic}/{v.bloodPressure.diastolic}</td>
                                        <td className="px-6 py-4 text-gray-600">{v.heartRate} bpm</td>
                                        <td className="px-6 py-4 text-gray-600">{v.bloodSugar ?? '—'}</td>
                                        <td className="px-6 py-4 text-gray-600">{v.temperature ? `${v.temperature}°C` : '—'}</td>
                                        <td className="px-6 py-4 text-gray-600">{v.weight ? `${v.weight} kg` : '—'}</td>
                                        <td className="px-6 py-4 text-gray-400 text-xs italic">{v.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
