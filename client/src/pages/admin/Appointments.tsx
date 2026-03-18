import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { format } from 'date-fns';
import { CalendarDays, Clock, Search } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

interface Appointment {
    _id: string;
    patient: { firstName: string; lastName: string; email: string };
    doctor: { firstName: string; lastName: string; email: string };
    appointmentDate: string;
    reasonForVisit: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};

export default function AdminAppointments() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all');
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const debouncedSearch = useDebouncedValue(search);

    useEffect(() => {
        setLoading(true);
        api.get('/admin/appointments', { params: { page, limit, search: debouncedSearch, status: filterStatus, sortOrder: 'desc' } })
            .then((r) => {
                setAppointments(r.data.data);
                setTotal(r.data.pagination.total);
                setTotalPages(r.data.pagination.totalPages);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [page, limit, debouncedSearch, filterStatus]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filterStatus, limit]);

    useEffect(() => {
        const nextParams = new URLSearchParams();
        if (search) nextParams.set('search', search);
        if (filterStatus !== 'all') nextParams.set('status', filterStatus);
        if (page !== 1) nextParams.set('page', String(page));
        if (limit !== 10) nextParams.set('limit', String(limit));

        const currentQuery = location.search.startsWith('?') ? location.search.slice(1) : location.search;
        const nextQuery = nextParams.toString();
        if (nextQuery !== currentQuery) {
            setSearchParams(nextParams, { replace: true });
        }
    }, [search, filterStatus, page, limit, location.search, setSearchParams]);

    if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">All Appointments</h1>
                <p className="text-gray-500 mt-1">Monitor all appointments across the system</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-48">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by patient or doctor..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="flex-1 text-sm border-0 outline-none"
                        />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <span className="text-sm text-gray-500 ml-auto">{total} appointments</span>
                </div>

                {appointments.length === 0 ? (
                    <div className="text-center py-16">
                        <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No appointments found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 text-left">Patient</th>
                                    <th className="px-6 py-3 text-left">Doctor</th>
                                    <th className="px-6 py-3 text-left">Date & Time</th>
                                    <th className="px-6 py-3 text-left">Reason</th>
                                    <th className="px-6 py-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {appointments.map(a => (
                                    <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-800">{a.patient?.firstName} {a.patient?.lastName}</p>
                                            <p className="text-xs text-gray-400">{a.patient?.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-800">Dr. {a.doctor?.firstName} {a.doctor?.lastName}</p>
                                            <p className="text-xs text-gray-400">{a.doctor?.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-700"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(a.appointmentDate), 'MMM d, yyyy')}</div>
                                            <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-0.5"><Clock className="h-3 w-3" />{format(new Date(a.appointmentDate), 'h:mm a')}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-48 truncate">{a.reasonForVisit}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[a.status]}`}>{a.status}</span>
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
