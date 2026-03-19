import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { Package, Plus, Pencil, Trash2, X, Save, AlertTriangle } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { PageLoading } from '../../components/ui/PageLoading';
import { ModalShell } from '../../components/ui/ModalShell';
import { InventoryCategoryBadge } from '../../components/inventory/InventoryCategoryBadge';

interface InventoryItem {
    _id: string;
    name: string;
    category: 'medicine' | 'equipment' | 'supplies';
    quantity: number;
    unit: string;
    lowStockThreshold: number;
    supplierName: string;
    lastRestocked: string;
}

interface InventoryMovement {
    type: 'store_purchase' | 'prescription_dispense';
    occurredAt: string;
    referenceId: string;
    patient?: { firstName?: string; lastName?: string; email?: string } | null;
    doctor?: { firstName?: string; lastName?: string; email?: string } | null;
    itemName: string;
    category: 'medicine' | 'equipment' | 'supplies';
    quantity: number;
    unit: string;
}

const emptyForm = { name: '', category: 'medicine' as 'medicine' | 'equipment' | 'supplies', quantity: 0, unit: '', lowStockThreshold: 10, supplierName: '' };

export default function AdminInventory() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [filterCategory, setFilterCategory] = useState(searchParams.get('category') || 'all');
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 12);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [csvModalOpen, setCsvModalOpen] = useState(false);
    const [csvData, setCsvData] = useState('name,category,quantity,unit,lowStockThreshold,supplierName\nParacetamol 500mg,medicine,25,tablets,40,MediSupply Co.');
    const [csvImporting, setCsvImporting] = useState(false);
    const [csvError, setCsvError] = useState('');
    const [csvResult, setCsvResult] = useState<null | {
        summary: {
            processedRows: number;
            created: number;
            updated: number;
            skipped: number;
            errorCount: number;
        };
        errors: Array<{ line: number; message: string }>;
    }>(null);
    const debouncedSearch = useDebouncedValue(search);

    const fetchItems = async () => {
        try {
            const res = await api.get('/admin/inventory', { params: { page, limit, search: debouncedSearch, category: filterCategory, sortOrder: 'asc' } });
            setItems(res.data.data);
            setTotal(res.data.pagination.total);
            setTotalPages(res.data.pagination.totalPages);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchMovements = async () => {
        try {
            const res = await api.get('/admin/inventory/movements', {
                params: { limit: 30 },
            });
            setMovements(res.data.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchItems();
    }, [page, limit, debouncedSearch, filterCategory]);

    useEffect(() => {
        fetchMovements();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filterCategory, limit]);

    useEffect(() => {
        const nextParams = new URLSearchParams();
        if (search) nextParams.set('search', search);
        if (filterCategory !== 'all') nextParams.set('category', filterCategory);
        if (page !== 1) nextParams.set('page', String(page));
        if (limit !== 12) nextParams.set('limit', String(limit));

        const currentQuery = location.search.startsWith('?') ? location.search.slice(1) : location.search;
        const nextQuery = nextParams.toString();
        if (nextQuery !== currentQuery) {
            setSearchParams(nextParams, { replace: true });
        }
    }, [search, filterCategory, page, limit, location.search, setSearchParams]);

    const openAdd = () => { setForm(emptyForm); setModalMode('add'); setError(''); };
    const openEdit = (item: InventoryItem) => {
        setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, lowStockThreshold: item.lowStockThreshold, supplierName: item.supplierName });
        setEditingItem(item);
        setModalMode('edit');
        setError('');
    };
    const closeModal = () => { setModalMode(null); setEditingItem(null); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            if (modalMode === 'add') {
                await api.post('/admin/inventory', { ...form, quantity: Number(form.quantity), lowStockThreshold: Number(form.lowStockThreshold) });
            } else if (editingItem) {
                await api.patch(`/admin/inventory/${editingItem._id}`, { ...form, quantity: Number(form.quantity), lowStockThreshold: Number(form.lowStockThreshold) });
            }
            closeModal();
            await fetchItems();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to save item');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        setDeletingId(id);
        try {
            await api.delete(`/admin/inventory/${id}`);
            await fetchItems();
        } catch (e) { console.error(e); }
        finally { setDeletingId(null); }
    };

    const handleImportCsv = async (event: React.FormEvent) => {
        event.preventDefault();
        setCsvError('');
        setCsvResult(null);
        setCsvImporting(true);

        try {
            const response = await api.post('/admin/inventory/import-csv', { csvData });
            setCsvResult(response.data);
            await fetchItems();
            await fetchMovements();
        } catch (e: unknown) {
            if (typeof e === 'object' && e !== null) {
                const maybeResponse = e as { response?: { data?: { message?: string } } };
                setCsvError(maybeResponse.response?.data?.message || 'CSV import failed');
            } else {
                setCsvError('CSV import failed');
            }
        } finally {
            setCsvImporting(false);
        }
    };

    const lowStockCount = items.filter(i => i.quantity <= i.lowStockThreshold).length;

    if (loading) return <PageLoading role="admin" />;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
                    <p className="text-gray-500 mt-1">Manage medicines, equipment, and supplies</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setCsvModalOpen(true);
                            setCsvError('');
                            setCsvResult(null);
                        }}
                        className="flex items-center gap-2 border border-teal-200 text-teal-700 px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-teal-50 transition-colors"
                    >
                        Import CSV
                    </button>
                    <button onClick={openAdd} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-teal-700 transition-colors">
                        <Plus className="h-4 w-4" /> Add Item
                    </button>
                </div>
            </div>

            {csvModalOpen && (
                <ModalShell>
                    <div className="bg-white rounded-md border border-gray-200 w-full max-w-3xl mx-4 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Import Stock From CSV</h2>
                            <button onClick={() => setCsvModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">
                            Required columns: name, category, quantity, unit. Optional: lowStockThreshold, supplierName.
                        </p>

                        <form onSubmit={handleImportCsv} className="space-y-4">
                            <textarea
                                value={csvData}
                                onChange={(event) => setCsvData(event.target.value)}
                                rows={12}
                                  className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm font-mono"
                            />

                            {csvError && <p className="text-sm text-red-600">{csvError}</p>}

                            {csvResult && (
                                <div className="rounded border border-gray-200 p-3 text-sm text-gray-700 bg-gray-50">
                                    <p>
                                        Processed: {csvResult.summary.processedRows}, Created: {csvResult.summary.created}, Updated: {csvResult.summary.updated}, Skipped: {csvResult.summary.skipped}
                                    </p>
                                    {csvResult.summary.errorCount > 0 && (
                                        <div className="mt-2 max-h-32 overflow-y-auto">
                                            {csvResult.errors.slice(0, 10).map((item, idx) => (
                                                <p key={`${item.line}-${idx}`} className="text-xs text-red-600">Line {item.line}: {item.message}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setCsvModalOpen(false)}
                                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={csvImporting || !csvData.trim()}
                                    className="flex-1 bg-teal-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-teal-700 disabled:opacity-60"
                                >
                                    {csvImporting ? 'Importing...' : 'Import CSV'}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalShell>
            )}

            {lowStockCount > 0 && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-md px-5 py-4">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{lowStockCount} item{lowStockCount > 1 ? 's are' : ' is'} running low on stock and need restocking.</p>
                </div>
            )}

            <div className="bg-white rounded-md border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Inventory Movement</h2>
                        <p className="text-sm text-gray-500">Track where stock is going (prescriptions and direct purchases)</p>
                    </div>
                </div>

                {movements.length === 0 ? (
                    <p className="text-sm text-gray-400">No stock movement recorded yet.</p>
                ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {movements.map((movement, index) => {
                            const patientName = `${movement.patient?.firstName || ''} ${movement.patient?.lastName || ''}`.trim() || 'Unknown patient';
                            const doctorName = `${movement.doctor?.firstName || ''} ${movement.doctor?.lastName || ''}`.trim();
                            return (
                                <div key={`${movement.referenceId}-${index}`} className="py-4 border-b border-gray-100 last:border-0">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{movement.itemName}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {movement.type === 'store_purchase' ? 'Direct Store Purchase' : 'Prescription Dispense'}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500">{new Date(movement.occurredAt).toLocaleString()}</p>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-2">
                                        Outflow: <span className="font-medium">{movement.quantity} {movement.unit}</span> | Patient: <span className="font-medium">{patientName}</span>
                                    </p>
                                    {doctorName && (
                                        <p className="text-xs text-gray-500 mt-1">Doctor: Dr. {doctorName}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {modalMode && (
                <ModalShell>
                    <div className="bg-white rounded-md border border-gray-200 w-full max-w-md mx-4 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">{modalMode === 'add' ? 'Add Inventory Item' : 'Edit Item'}</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Paracetamol 500mg" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                                        <option value="medicine">Medicine</option>
                                        <option value="equipment">Equipment</option>
                                        <option value="supplies">Supplies</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                    <input required type="text" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="tablets, pcs, boxes" className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input required type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                                    <input required type="number" min={0} value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: +e.target.value }))} className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                                <input type="text" value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="MedSupply Co." className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                            </div>
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving} className="flex-1 bg-teal-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
                                    {saving ? 'Saving...' : <><Save className="h-4 w-4 inline mr-1" />Save</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalShell>
            )}

            <div className="bg-white rounded-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                    <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-48" />
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="all">All Categories</option>
                        <option value="medicine">Medicine</option>
                        <option value="equipment">Equipment</option>
                        <option value="supplies">Supplies</option>
                    </select>
                    <span className="text-sm text-gray-500">{total} items</span>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No inventory items found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-gray-100 text-xs text-gray-400">
                                <tr>
                                    <th className="px-6 py-3 text-left">Item</th>
                                    <th className="px-6 py-3 text-left">Category</th>
                                    <th className="px-6 py-3 text-left">Quantity</th>
                                    <th className="px-6 py-3 text-left">Supplier</th>
                                    <th className="px-6 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.map(item => {
                                    const isLow = item.quantity <= item.lowStockThreshold;
                                    return (
                                        <tr key={item._id} className={`hover:bg-gray-50 transition-colors ${isLow ? 'bg-red-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {isLow && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                                    <div>
                                                        <p className="font-medium text-gray-800">{item.name}</p>
                                                        <p className="text-xs text-gray-400">Threshold: {item.lowStockThreshold} {item.unit}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <InventoryCategoryBadge category={item.category} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>{item.quantity}</span>
                                                <span className="text-gray-400 ml-1 text-xs">{item.unit}</span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{item.supplierName || '—'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => openEdit(item)} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
                                                        <Pencil className="h-3.5 w-3.5" /> Edit
                                                    </button>
                                                    <button disabled={deletingId === item._id} onClick={() => handleDelete(item._id)} className="flex items-center gap-1.5 text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50">
                                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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
                            className="border border-gray-200 rounded px-2 py-1.5 text-sm"
                        >
                            <option value={12}>12 / page</option>
                            <option value={24}>24 / page</option>
                            <option value={50}>50 / page</option>
                        </select>
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
