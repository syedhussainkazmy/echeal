import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Package, ShoppingCart, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { PageLoading } from '../../components/ui/PageLoading';
import { InventoryCategoryBadge } from '../../components/inventory/InventoryCategoryBadge';

interface StoreItem {
    _id: string;
    name: string;
    category: 'medicine' | 'equipment' | 'supplies';
    quantity: number;
    unit: string;
    lowStockThreshold: number;
    supplierName?: string;
}

interface PurchaseItem {
    inventoryItem: string;
    itemName: string;
    itemCategory: 'medicine' | 'equipment' | 'supplies';
    quantity: number;
    unit: string;
}

interface StorePurchase {
    _id: string;
    purchasedAt: string;
    notes?: string;
    items: PurchaseItem[];
}

export default function PatientStore() {
    const [items, setItems] = useState<StoreItem[]>([]);
    const [purchases, setPurchases] = useState<StorePurchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const getErrorMessage = (value: unknown) => {
        if (typeof value === 'object' && value !== null) {
            const maybeResponse = value as {
                response?: { data?: { message?: string } };
            };
            return maybeResponse.response?.data?.message;
        }
        return undefined;
    };

    const fetchStore = useCallback(async () => {
        try {
            const [storeRes, purchasesRes] = await Promise.all([
                api.get('/patient/store/items', { params: { page: 1, limit: 50, sortOrder: 'asc', search, category } }),
                api.get('/patient/store/purchases', { params: { page: 1, limit: 8, sortOrder: 'desc' } }),
            ]);

            setItems(storeRes.data.data);
            setPurchases(purchasesRes.data.data);
            setQuantities((prev) => {
                const next = { ...prev };
                for (const item of storeRes.data.data as StoreItem[]) {
                    if (!next[item._id]) next[item._id] = 1;
                }
                return next;
            });
        } catch (e) {
            console.error(e);
            setError('Failed to load store data');
        } finally {
            setLoading(false);
        }
    }, [search, category]);

    useEffect(() => {
        setLoading(true);
        fetchStore();
    }, [fetchStore]);

    const handleBuyNow = async (item: StoreItem) => {
        const quantity = Number(quantities[item._id] || 1);
        if (quantity < 1) return;

        setError('');
        setSuccess('');
        setBuyingId(item._id);

        try {
            await api.post('/patient/store/purchases', {
                items: [{ inventoryItemId: item._id, quantity }],
            });
            setSuccess(`Purchased ${quantity} ${item.unit} of ${item.name}`);
            await fetchStore();
        } catch (e: unknown) {
            console.error(e);
            setError(getErrorMessage(e) || 'Purchase failed');
        } finally {
            setBuyingId(null);
        }
    };

    if (loading) {
        return <PageLoading role="patient" />;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Medical Store</h1>
                <p className="text-gray-500 mt-1">Buy medicines, equipment, and supplies directly from stock</p>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

            <div className="bg-white rounded-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3 flex-wrap">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search medicines or supplies..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-48"
                    />
                    <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="all">All Categories</option>
                        <option value="medicine">Medicine</option>
                        <option value="equipment">Equipment</option>
                        <option value="supplies">Supplies</option>
                    </select>
                    <button
                        onClick={() => fetchStore()}
                        className="text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-14">
                        <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No items available right now.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {items.map((item) => {
                            const isLow = item.quantity <= item.lowStockThreshold;
                            const quantityValue = Number(quantities[item._id] || 1);
                            return (
                                <div key={item._id} className="px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <InventoryCategoryBadge category={item.category} />
                                            <p className={`text-xs ${isLow ? 'text-red-600' : 'text-gray-500'}`}>
                                                Stock: {item.quantity} {item.unit}
                                            </p>
                                        </div>
                                        {item.supplierName && <p className="text-xs text-gray-400 mt-1">Supplier: {item.supplierName}</p>}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={item.quantity}
                                            value={quantityValue}
                                            onChange={(event) => {
                                                const nextValue = Math.max(1, Math.min(item.quantity, Number(event.target.value || 1)));
                                                setQuantities((prev) => ({ ...prev, [item._id]: nextValue }));
                                            }}
                                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                                        />
                                        <button
                                            onClick={() => handleBuyNow(item)}
                                            disabled={buyingId === item._id || item.quantity <= 0}
                                            className="inline-flex items-center gap-1.5 bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
                                        >
                                            <ShoppingCart className="h-4 w-4" />
                                            {buyingId === item._id ? 'Buying...' : 'Buy'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-md border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Purchases</h2>
                {purchases.length === 0 ? (
                    <p className="text-sm text-gray-400">You have not purchased any items yet.</p>
                ) : (
                    <div className="space-y-3">
                        {purchases.map((purchase) => (
                            <div key={purchase._id} className="border border-gray-100 rounded-lg p-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <p className="text-sm font-medium text-gray-800">Purchase #{purchase._id.slice(-6).toUpperCase()}</p>
                                    <p className="text-xs text-gray-500">{format(new Date(purchase.purchasedAt), 'MMM d, yyyy h:mm a')}</p>
                                </div>
                                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                                    {purchase.items.map((item, index) => (
                                        <li key={`${purchase._id}-${index}`}>
                                            {item.itemName} - {item.quantity} {item.unit}
                                        </li>
                                    ))}
                                </ul>
                                {purchase.notes && <p className="mt-2 text-xs italic text-gray-500">{purchase.notes}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
