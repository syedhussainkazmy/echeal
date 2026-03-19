import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ShoppingCart } from 'lucide-react';
import api from '../../lib/api';
import { PageLoading } from '../../components/ui/PageLoading';

interface PurchaseItem {
    itemName: string;
    itemCategory: 'medicine' | 'equipment' | 'supplies';
    quantity: number;
    unit: string;
}

interface Purchase {
    _id: string;
    patient: { firstName: string; lastName: string; email: string };
    purchasedAt: string;
    notes?: string;
    items: PurchaseItem[];
}

export default function DoctorPatientPurchases() {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    const fetchPurchases = useCallback(async () => {
        try {
            const response = await api.get('/doctor/patient-purchases', {
                params: { page, limit, search, sortOrder: 'desc' },
            });
            setPurchases(response.data.data);
            setTotalPages(response.data.pagination.totalPages);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page, limit, search]);

    useEffect(() => {
        setLoading(true);
        fetchPurchases();
    }, [fetchPurchases]);

    if (loading) {
        return <PageLoading role="doctor" />;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Patient Purchases</h1>
                <p className="text-gray-500 mt-1">See what your patients bought from the medical store</p>
            </div>

            <div className="bg-white rounded-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3 flex-wrap">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by patient, item, or notes..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-48"
                    />
                    <select
                        value={limit}
                        onChange={(event) => {
                            setLimit(Number(event.target.value));
                            setPage(1);
                        }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                    </select>
                </div>

                {purchases.length === 0 ? (
                    <div className="text-center py-16">
                        <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No patient purchases found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {purchases.map((purchase) => (
                            <div key={purchase._id} className="px-6 py-4">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <p className="font-semibold text-gray-800">
                                            {purchase.patient.firstName} {purchase.patient.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">{purchase.patient.email}</p>
                                    </div>
                                    <p className="text-xs text-gray-500">{format(new Date(purchase.purchasedAt), 'MMM d, yyyy h:mm a')}</p>
                                </div>

                                <ul className="mt-3 text-sm text-gray-700 space-y-1">
                                    {purchase.items.map((item, index) => (
                                        <li key={`${purchase._id}-${index}`}>
                                            {item.itemName} ({item.itemCategory}) - {item.quantity} {item.unit}
                                        </li>
                                    ))}
                                </ul>

                                {purchase.notes && <p className="mt-2 text-xs italic text-gray-500">{purchase.notes}</p>}
                            </div>
                        ))}
                    </div>
                )}

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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
