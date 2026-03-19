import { useCallback, useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ClipboardList, Search, X } from 'lucide-react';
import api from '../../lib/api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Timeline } from '../../components/ui/Timeline';
import { PageLoading } from '../../components/ui/PageLoading';
import { ModalShell } from '../../components/ui/ModalShell';
import { PrescriptionStatusBadge } from '../../components/prescriptions/PrescriptionStatusBadge';

interface PrescriptionMedication {
    medicationName: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    quantity: number;
}

interface Prescription {
    _id: string;
    patient: { firstName: string; lastName: string; email: string };
    doctor: { firstName: string; lastName: string; email: string };
    status: 'draft' | 'issued' | 'dispensed' | 'cancelled';
    medications: PrescriptionMedication[];
    notes?: string;
    createdAt: string;
    dispensedAt?: string;
    appointment?: { appointmentDate?: string; reasonForVisit?: string };
    dispensedBy?: { firstName: string; lastName: string; email: string };
    statusHistory?: Array<{
        timestamp: string;
        fromStatus: string | null;
        toStatus: string;
        actor: { firstName: string; lastName: string; email: string };
        actorRole: 'doctor' | 'admin';
    }>;
}

export default function AdminPrescriptions() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [dispensingId, setDispensingId] = useState<string | null>(null);
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || 'all');
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [limit, setLimit] = useState(Number(searchParams.get('limit')) || 10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const debouncedSearch = useDebouncedValue(search);

    const fetchPrescriptions = useCallback(async () => {
        try {
            const response = await api.get('/admin/prescriptions', {
                params: {
                    page,
                    limit,
                    search: debouncedSearch,
                    status,
                    sortOrder: 'desc',
                },
            });
            setPrescriptions(response.data.data);
            setTotal(response.data.pagination.total);
            setTotalPages(response.data.pagination.totalPages);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, status]);

    useEffect(() => {
        setLoading(true);
        fetchPrescriptions();
    }, [fetchPrescriptions]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, status, limit]);

    useEffect(() => {
        const nextParams = new URLSearchParams();
        if (search) nextParams.set('search', search);
        if (status !== 'all') nextParams.set('status', status);
        if (page !== 1) nextParams.set('page', String(page));
        if (limit !== 10) nextParams.set('limit', String(limit));

        const currentQuery = location.search.startsWith('?') ? location.search.slice(1) : location.search;
        const nextQuery = nextParams.toString();
        if (nextQuery !== currentQuery) {
            setSearchParams(nextParams, { replace: true });
        }
    }, [search, status, page, limit, location.search, setSearchParams]);

    const markDispensed = async (prescriptionId: string) => {
        setDispensingId(prescriptionId);
        try {
            await api.patch(`/admin/prescriptions/${prescriptionId}/dispense`);
            setLoading(true);
            await fetchPrescriptions();
        } catch (e) {
            console.error(e);
        } finally {
            setDispensingId(null);
        }
    };

    const openPrescriptionDetail = async (id: string) => {
        setDetailError('');
        setDetailLoading(true);
        setSelectedPrescription(null);

        try {
            const response = await api.get(`/admin/prescriptions/${id}`);
            setSelectedPrescription(response.data);
        } catch (e) {
            console.error(e);
            setDetailError('Failed to load prescription details');
        } finally {
            setDetailLoading(false);
        }
    };

    const closePrescriptionDetail = () => {
        setSelectedPrescription(null);
        setDetailError('');
        setDetailLoading(false);
    };

    const printPrescription = (prescription: Prescription) => {
        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (!printWindow) return;

        const medicationsRows = prescription.medications
            .map(
                (medication, index) =>
                    `<tr>
                        <td>${index + 1}</td>
                        <td>${medication.medicationName}</td>
                        <td>${medication.dosage}</td>
                        <td>${medication.frequency}</td>
                        <td>${medication.durationDays}</td>
                        <td>${medication.quantity}</td>
                    </tr>`
            )
            .join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Prescription ${prescription._id}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
                        h1 { margin-bottom: 4px; }
                        p { margin: 4px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
                        th { background: #f3f4f6; }
                    </style>
                </head>
                <body>
                    <h1>Prescription Summary</h1>
                    <p><strong>ID:</strong> ${prescription._id}</p>
                    <p><strong>Status:</strong> ${prescription.status}</p>
                    <p><strong>Patient:</strong> ${prescription.patient.firstName} ${prescription.patient.lastName} (${prescription.patient.email})</p>
                    <p><strong>Doctor:</strong> Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName} (${prescription.doctor.email})</p>
                    <p><strong>Created:</strong> ${format(new Date(prescription.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    ${prescription.dispensedAt ? `<p><strong>Dispensed:</strong> ${format(new Date(prescription.dispensedAt), 'MMM d, yyyy h:mm a')}</p>` : ''}
                    ${prescription.notes ? `<p><strong>Notes:</strong> ${prescription.notes}</p>` : ''}
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Medication</th>
                                <th>Dosage</th>
                                <th>Frequency</th>
                                <th>Duration (days)</th>
                                <th>Quantity</th>
                            </tr>
                        </thead>
                        <tbody>${medicationsRows}</tbody>
                    </table>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    if (loading) {
        return <PageLoading role="admin" />;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
                <p className="text-gray-500 mt-1">Monitor and dispense issued prescriptions</p>
            </div>

            {(detailLoading || selectedPrescription || detailError) && (
                <ModalShell>
                    <div className="bg-white rounded-md border border-gray-200 w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Prescription Details</h2>
                            <button onClick={closePrescriptionDetail} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {detailLoading && <p className="text-sm text-gray-500">Loading details...</p>}
                        {detailError && <p className="text-sm text-red-600">{detailError}</p>}

                        {selectedPrescription && (
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <p className="font-semibold text-gray-800">
                                            {selectedPrescription.patient.firstName} {selectedPrescription.patient.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">{selectedPrescription.patient.email}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Doctor: Dr. {selectedPrescription.doctor.firstName} {selectedPrescription.doctor.lastName}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Created {format(new Date(selectedPrescription.createdAt), 'MMM d, yyyy h:mm a')}
                                        </p>
                                        {selectedPrescription.dispensedAt && (
                                            <p className="text-xs text-green-700 mt-0.5">
                                                Dispensed {format(new Date(selectedPrescription.dispensedAt), 'MMM d, yyyy h:mm a')}
                                            </p>
                                        )}
                                    </div>
                                    <PrescriptionStatusBadge status={selectedPrescription.status} />
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                                        <thead className="bg-gray-50 text-gray-500">
                                            <tr>
                                                <th className="text-left px-3 py-2">Medication</th>
                                                <th className="text-left px-3 py-2">Dosage</th>
                                                <th className="text-left px-3 py-2">Frequency</th>
                                                <th className="text-left px-3 py-2">Duration</th>
                                                <th className="text-left px-3 py-2">Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedPrescription.medications.map((medication, index) => (
                                                <tr key={`${selectedPrescription._id}-${index}`}>
                                                    <td className="px-3 py-2">{medication.medicationName}</td>
                                                    <td className="px-3 py-2">{medication.dosage}</td>
                                                    <td className="px-3 py-2">{medication.frequency}</td>
                                                    <td className="px-3 py-2">{medication.durationDays} day(s)</td>
                                                    <td className="px-3 py-2">{medication.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {selectedPrescription.appointment?.appointmentDate && (
                                    <p className="text-sm text-gray-600">
                                        Appointment: {format(new Date(selectedPrescription.appointment.appointmentDate), 'MMM d, yyyy h:mm a')}
                                    </p>
                                )}

                                {selectedPrescription.notes && <p className="text-sm text-gray-700 italic">{selectedPrescription.notes}</p>}

                                {selectedPrescription.statusHistory && selectedPrescription.statusHistory.length > 0 && (
                                    <div className="pt-4 border-t border-gray-200">
                                        <Timeline entries={selectedPrescription.statusHistory} />
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={closePrescriptionDetail}
                                        className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => printPrescription(selectedPrescription)}
                                        className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                                    >
                                        Print
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </ModalShell>
            )}

            <div className="bg-white rounded-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-48">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by patient, doctor, or medicine..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="flex-1 text-sm border-0 outline-none"
                        />
                    </div>
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="all">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="issued">Issued</option>
                        <option value="dispensed">Dispensed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <span className="text-sm text-gray-500 ml-auto">{total} prescriptions</span>
                </div>

                {prescriptions.length === 0 ? (
                    <div className="text-center py-16">
                        <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">No prescriptions found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {prescriptions.map((prescription) => (
                            <div key={prescription._id} className="px-6 py-4">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <p className="font-semibold text-gray-800">
                                            {prescription.patient?.firstName} {prescription.patient?.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">{prescription.patient?.email}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Doctor: Dr. {prescription.doctor?.firstName} {prescription.doctor?.lastName}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Created {format(new Date(prescription.createdAt), 'MMM d, yyyy h:mm a')}
                                        </p>
                                        {prescription.dispensedAt && (
                                            <p className="text-xs text-green-700 mt-0.5">
                                                Dispensed {format(new Date(prescription.dispensedAt), 'MMM d, yyyy h:mm a')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <PrescriptionStatusBadge status={prescription.status} />
                                        {prescription.status === 'issued' && (
                                            <button
                                                disabled={dispensingId === prescription._id}
                                                onClick={() => markDispensed(prescription._id)}
                                                className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 disabled:opacity-60"
                                            >
                                                {dispensingId === prescription._id ? 'Dispensing...' : 'Mark Dispensed'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 text-sm text-gray-700">
                                    <p className="font-medium text-gray-800 mb-1">Medications ({prescription.medications.length})</p>
                                    <ul className="space-y-1">
                                        {prescription.medications.map((medication, index) => (
                                            <li key={`${prescription._id}-${index}`}>
                                                {medication.medicationName} - {medication.dosage}, {medication.frequency}, {medication.durationDays} day(s), qty {medication.quantity}
                                            </li>
                                        ))}
                                    </ul>
                                    {prescription.notes && <p className="mt-2 text-gray-500 italic">{prescription.notes}</p>}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => openPrescriptionDetail(prescription._id)}
                                        className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-gray-500">Page {page} of {totalPages}</div>
                    <div className="flex items-center gap-2">
                        <select
                            value={limit}
                            onChange={(event) => setLimit(Number(event.target.value))}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </select>
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
