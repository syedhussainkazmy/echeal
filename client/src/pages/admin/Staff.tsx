import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Users, CheckCircle, XCircle, ShieldCheck, UserCircle } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

interface StaffMember {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'doctor' | 'admin';
    isActive: boolean;
}

export default function AdminStaff() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const debouncedSearch = useDebouncedValue(search);

    const fetchData = async () => {
        try {
            const res = await api.get('/admin/staff', { params: { page, limit, search: debouncedSearch, sortOrder: 'desc' } });
            setStaff(res.data.data);
            setTotal(res.data.pagination.total);
            setTotalPages(res.data.pagination.totalPages);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [page, limit, debouncedSearch]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, limit]);

    useEffect(() => {
        const nextParams = new URLSearchParams();
        if (search) nextParams.set('search', search);
        if (page !== 1) nextParams.set('page', String(page));
        if (limit !== 10) nextParams.set('limit', String(limit));

        const currentQuery = location.search.startsWith('?') ? location.search.slice(1) : location.search;
        const nextQuery = nextParams.toString();
        if (nextQuery !== currentQuery) {
            setSearchParams(nextParams, { replace: true });
        }
    }, [search, page, limit, location.search, setSearchParams]);

    const toggleStatus = async (userId: string) => {
        setSavingId(userId);
        try {
            await api.patch(`/admin/users/${userId}/status`);
            await fetchData();
        } catch (e) { console.error(e); }
        finally { setSavingId(null); }
    };

    const toggleVerify = async (userId: string) => {
        setSavingId(userId);
        try {
            await api.patch(`/admin/doctors/${userId}/verify`);
            await fetchData();
        } catch (e) { console.error(e); }
        finally { setSavingId(null); }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                <p className="text-gray-500 mt-1">Manage doctors and administrators</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-4">
                    <input
                        type="text"
                        placeholder="Search staff..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <span className="text-sm text-gray-500">{total} members</span>
                </div>

                {staff.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No staff members found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 text-left">Name</th>
                                    <th className="px-6 py-3 text-left">Role</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                    <th className="px-6 py-3 text-left">Verification</th>
                                    <th className="px-6 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {staff.map(s => (
                                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-gray-100 rounded-full p-2">
                                                    <UserCircle className="h-4 w-4 text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{s.firstName} {s.lastName}</p>
                                                    <p className="text-gray-400 text-xs">{s.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${s.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                {s.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {s.isActive
                                                ? <span className="flex items-center gap-1.5 text-green-700 text-xs font-medium"><CheckCircle className="h-3.5 w-3.5" /> Active</span>
                                                : <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium"><XCircle className="h-3.5 w-3.5" /> Inactive</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            {s.role === 'doctor' ? (
                                                <span className="text-xs text-gray-500">—</span>
                                            ) : <span className="text-xs text-gray-400">N/A</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    disabled={savingId === s._id}
                                                    onClick={() => toggleStatus(s._id)}
                                                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${s.isActive ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'border border-green-200 text-green-600 hover:bg-green-50'}`}
                                                >
                                                    {s.isActive ? <><XCircle className="h-3.5 w-3.5" /> Deactivate</> : <><CheckCircle className="h-3.5 w-3.5" /> Activate</>}
                                                </button>
                                                {s.role === 'doctor' && (
                                                    <button
                                                        disabled={savingId === s._id}
                                                        onClick={() => toggleVerify(s._id)}
                                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50"
                                                    >
                                                        <ShieldCheck className="h-3.5 w-3.5" /> Toggle Verify
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                    <div className="flex items-center gap-2">
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </select>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
