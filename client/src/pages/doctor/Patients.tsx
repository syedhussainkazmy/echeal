import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Users, ChevronRight, UserCircle } from 'lucide-react';
import { PageLoading } from '../../components/ui/PageLoading';

interface Patient {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile?: {
        bloodGroup?: string;
        gender?: string;
        contactNumber?: string;
    };
}

export default function DoctorPatients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        setLoading(true);
        api.get('/doctor/patients', { params: { page, limit: 12, search } })
            .then((r) => {
                setPatients(r.data.data);
                setTotal(r.data.pagination.total);
                setTotalPages(r.data.pagination.totalPages);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page, search]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    if (loading) return <PageLoading role="doctor" />;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
                <p className="text-gray-500 mt-1">Patients who have had appointments with you</p>
            </div>

                <div className="bg-white rounded-md border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search patients..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">{total} patients</span>
                </div>

                {patients.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No patients found for this query.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {patients.map(p => (
                            <div key={p._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 rounded-full p-2.5">
                                        <UserCircle className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{p.firstName} {p.lastName}</p>
                                        <p className="text-sm text-gray-500">{p.email}</p>
                                        <div className="flex gap-3 mt-0.5">
                                            {p.profile?.bloodGroup && <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">{p.profile.bloodGroup}</span>}
                                            {p.profile?.gender && <span className="text-xs text-gray-400 capitalize">{p.profile.gender}</span>}
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    to={`/doctor/patients/${p._id}/ehr`}
                                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    View EHR <ChevronRight className="h-4 w-4" />
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                                className="px-3 py-1.5 text-sm border border-gray-200 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
