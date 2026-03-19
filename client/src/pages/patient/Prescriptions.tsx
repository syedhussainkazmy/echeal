import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { ClipboardList, X } from 'lucide-react';
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
    instructions?: string;
}

interface Prescription {
    _id: string;
    patient?: { firstName: string; lastName: string; email: string };
    doctor: { firstName: string; lastName: string; email: string };
    status: 'draft' | 'issued' | 'dispensed' | 'cancelled';
    medications: PrescriptionMedication[];
    notes?: string;
    createdAt: string;
    appointment?: { appointmentDate?: string; reasonForVisit?: string };
    dispensedAt?: string;
    dispensedBy?: { firstName: string; lastName: string; email: string };
    statusHistory?: Array<{
        timestamp: string;
        fromStatus: string | null;
        toStatus: string;
        actor: { firstName: string; lastName: string; email: string };
        actorRole: 'doctor' | 'admin';
    }>;
}

export default function PatientPrescriptions() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        api.get('/patient/prescriptions', { params: { page: 1, limit: 100, sortOrder: 'desc' } })
            .then((response) => setPrescriptions(response.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const openPrescriptionDetail = async (id: string) => {
        setDetailError('');
        setDetailLoading(true);
        setSelectedPrescription(null);
        try {
            const response = await api.get(`/patient/prescriptions/${id}`);
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
                        <td>${medication.instructions || ''}</td>
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
                    <p><strong>Doctor:</strong> Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName} (${prescription.doctor.email})</p>
                    <p><strong>Created:</strong> ${format(new Date(prescription.createdAt), 'MMM d, yyyy h:mm a')}</p>
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
                                <th>Instructions</th>
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
        return <PageLoading role="patient" />;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Prescriptions</h1>
                <p className="text-gray-500 mt-1">Track medicine instructions and dispensing status</p>
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
                                            Dr. {selectedPrescription.doctor.firstName} {selectedPrescription.doctor.lastName}
                                        </p>
                                        <p className="text-sm text-gray-500">{selectedPrescription.doctor.email}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Prescribed on {format(new Date(selectedPrescription.createdAt), 'MMM d, yyyy h:mm a')}
                                        </p>
                                        {selectedPrescription.dispensedAt && (
                                            <p className="text-xs text-green-700 mt-1">
                                                Dispensed on {format(new Date(selectedPrescription.dispensedAt), 'MMM d, yyyy h:mm a')}
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

            {prescriptions.length === 0 ? (
                <div className="bg-white rounded-md border border-gray-100 p-16 text-center">
                    <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No prescriptions available yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {prescriptions.map((prescription) => (
                        <div key={prescription._id} className="bg-white rounded-md border border-gray-100 p-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        Dr. {prescription.doctor.firstName} {prescription.doctor.lastName}
                                    </p>
                                    <p className="text-sm text-gray-500">{prescription.doctor.email}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Prescribed on {format(new Date(prescription.createdAt), 'MMM d, yyyy h:mm a')}
                                    </p>
                                    {prescription.dispensedAt && (
                                        <p className="text-xs text-green-700 mt-1">
                                            Dispensed on {format(new Date(prescription.dispensedAt), 'MMM d, yyyy h:mm a')}
                                        </p>
                                    )}
                                </div>
                                <PrescriptionStatusBadge status={prescription.status} />
                            </div>

                            <div className="mt-3 text-sm text-gray-700">
                                <p className="font-medium text-gray-800 mb-1">Medications ({prescription.medications.length})</p>
                                <ul className="space-y-1">
                                    {prescription.medications.map((medication, index) => (
                                        <li key={`${prescription._id}-${index}`}>
                                            {medication.medicationName} - {medication.dosage}, {medication.frequency}, {medication.durationDays} day(s), qty {medication.quantity}
                                            {medication.instructions && (
                                                <span className="text-gray-500"> ({medication.instructions})</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                {prescription.notes && <p className="mt-2 text-gray-500 italic">{prescription.notes}</p>}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50">
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
        </div>
    );
}
