import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { ClipboardList, Plus, X, Trash2 } from 'lucide-react';
import { Timeline } from '../../components/ui/Timeline';
import { PageLoading } from '../../components/ui/PageLoading';
import { ModalShell } from '../../components/ui/ModalShell';
import { PrescriptionStatusBadge } from '../../components/prescriptions/PrescriptionStatusBadge';

interface Patient {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

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
    patient: { firstName: string; lastName: string; email: string };
    doctor?: { firstName: string; lastName: string; email: string };
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

const emptyMedication = (): PrescriptionMedication => ({
    medicationName: '',
    dosage: '',
    frequency: '',
    durationDays: 1,
    quantity: 1,
    instructions: '',
});

export default function DoctorPrescriptions() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    const [patientId, setPatientId] = useState('');
    const [status, setStatus] = useState<'draft' | 'issued'>('issued');
    const [notes, setNotes] = useState('');
    const [medications, setMedications] = useState<PrescriptionMedication[]>([emptyMedication()]);

    const getErrorMessage = (value: unknown) => {
        if (typeof value === 'object' && value !== null) {
            const maybeResponse = value as {
                response?: { data?: { message?: string } };
            };
            return maybeResponse.response?.data?.message;
        }
        return undefined;
    };

    const validForm = useMemo(() => {
        if (!patientId || medications.length === 0) return false;
        return medications.every((med) =>
            med.medicationName.trim() &&
            med.dosage.trim() &&
            med.frequency.trim() &&
            Number(med.durationDays) >= 1 &&
            Number(med.quantity) >= 1
        );
    }, [patientId, medications]);

    const fetchData = async () => {
        try {
            const [patientsRes, prescriptionsRes] = await Promise.all([
                api.get('/doctor/patients', { params: { page: 1, limit: 100 } }),
                api.get('/doctor/prescriptions', { params: { page: 1, limit: 100, sortOrder: 'desc' } }),
            ]);
            setPatients(patientsRes.data.data);
            setPrescriptions(prescriptionsRes.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const closeModal = () => {
        setOpenModal(false);
        setError('');
        setPatientId('');
        setStatus('issued');
        setNotes('');
        setMedications([emptyMedication()]);
    };

    const updateMedication = (index: number, key: keyof PrescriptionMedication, value: string | number) => {
        setMedications((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    };

    const addMedicationRow = () => {
        setMedications((prev) => [...prev, emptyMedication()]);
    };

    const removeMedicationRow = (index: number) => {
        setMedications((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
    };

    const createPrescription = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!validForm) {
            setError('Please complete all medication fields before saving.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/doctor/prescriptions', {
                patientId,
                status,
                notes: notes.trim() || undefined,
                medications: medications.map((med) => ({
                    ...med,
                    medicationName: med.medicationName.trim(),
                    dosage: med.dosage.trim(),
                    frequency: med.frequency.trim(),
                    instructions: med.instructions?.trim() || undefined,
                    durationDays: Number(med.durationDays),
                    quantity: Number(med.quantity),
                })),
            });
            closeModal();
            setLoading(true);
            await fetchData();
        } catch (e: unknown) {
            setError(getErrorMessage(e) || 'Failed to create prescription');
        } finally {
            setSaving(false);
        }
    };

    const cancelPrescription = async (id: string) => {
        try {
            await api.patch(`/doctor/prescriptions/${id}/cancel`);
            setLoading(true);
            await fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const issueDraft = async (id: string) => {
        try {
            await api.patch(`/doctor/prescriptions/${id}`, { status: 'issued' });
            setLoading(true);
            await fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const openPrescriptionDetail = async (id: string) => {
        setDetailError('');
        setDetailLoading(true);
        setSelectedPrescription(null);

        try {
            const response = await api.get(`/doctor/prescriptions/${id}`);
            setSelectedPrescription(response.data);
        } catch (e: unknown) {
            setDetailError(getErrorMessage(e) || 'Failed to load prescription details');
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
                    <p><strong>Patient:</strong> ${prescription.patient.firstName} ${prescription.patient.lastName} (${prescription.patient.email})</p>
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
        return <PageLoading role="doctor" />;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
                    <p className="text-gray-500 mt-1">Create and manage prescriptions for your patients</p>
                </div>
                <button
                    onClick={() => setOpenModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4" /> New Prescription
                </button>
            </div>

            {openModal && (
                <ModalShell>
                    <div className="bg-white rounded-md border border-gray-200 w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Create Prescription</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={createPrescription} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                                    <select
                                        required
                                        value={patientId}
                                        onChange={(event) => setPatientId(event.target.value)}
                                        className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select patient</option>
                                        {patients.map((patient) => (
                                            <option key={patient._id} value={patient._id}>
                                                {patient.firstName} {patient.lastName} ({patient.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                                    <select
                                        value={status}
                                        onChange={(event) => setStatus(event.target.value as 'draft' | 'issued')}
                                        className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="issued">Issued</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-800">Medications</h3>
                                    <button
                                        type="button"
                                        onClick={addMedicationRow}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        + Add medication
                                    </button>
                                </div>

                                {medications.map((medication, index) => (
                                    <div key={index} className="border border-gray-100 rounded p-4 bg-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input
                                                placeholder="Medication name"
                                                value={medication.medicationName}
                                                onChange={(event) => updateMedication(index, 'medicationName', event.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            />
                                            <input
                                                placeholder="Dosage (e.g. 1 tablet)"
                                                value={medication.dosage}
                                                onChange={(event) => updateMedication(index, 'dosage', event.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            />
                                            <input
                                                placeholder="Frequency (e.g. Twice daily)"
                                                value={medication.frequency}
                                                onChange={(event) => updateMedication(index, 'frequency', event.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            />
                                            <input
                                                placeholder="Instructions (optional)"
                                                value={medication.instructions || ''}
                                                onChange={(event) => updateMedication(index, 'instructions', event.target.value)}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder="Duration days"
                                                value={medication.durationDays}
                                                onChange={(event) => updateMedication(index, 'durationDays', Number(event.target.value))}
                                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    placeholder="Quantity"
                                                    value={medication.quantity}
                                                    onChange={(event) => updateMedication(index, 'quantity', Number(event.target.value))}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeMedicationRow(index)}
                                                    className="px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    rows={3}
                                    placeholder="Optional doctor notes"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                                />
                            </div>

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !validForm}
                                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {saving ? 'Saving...' : 'Create Prescription'}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalShell>
            )}

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
                                        <p className="text-sm text-gray-500">{selectedPrescription.patient.email}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Created {format(new Date(selectedPrescription.createdAt), 'MMM d, yyyy h:mm a')}
                                        </p>
                                    </div>
                                    <PrescriptionStatusBadge status={selectedPrescription.status} />
                                </div>

                                {selectedPrescription.appointment?.appointmentDate && (
                                    <div className="text-sm text-gray-600">
                                        Appointment: {format(new Date(selectedPrescription.appointment.appointmentDate), 'MMM d, yyyy h:mm a')}
                                    </div>
                                )}

                                <div>
                                    <p className="font-medium text-gray-800 mb-2">Medications</p>
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
                                </div>

                                {selectedPrescription.notes && (
                                    <p className="text-sm text-gray-700 italic">{selectedPrescription.notes}</p>
                                )}

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
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                    <p className="text-gray-400">No prescriptions yet. Create your first one.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {prescriptions.map((prescription) => (
                        <div key={prescription._id} className="bg-white rounded-md border border-gray-100 p-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {prescription.patient.firstName} {prescription.patient.lastName}
                                    </p>
                                    <p className="text-sm text-gray-500">{prescription.patient.email}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Created {format(new Date(prescription.createdAt), 'MMM d, yyyy h:mm a')}
                                    </p>
                                </div>
                                <PrescriptionStatusBadge status={prescription.status} />
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

                            {(prescription.status === 'draft' || prescription.status === 'issued') && (
                                <div className="flex gap-2">
                                    {prescription.status === 'draft' && (
                                        <button
                                            onClick={() => issueDraft(prescription._id)}
                                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                        >
                                            Mark Issued
                                        </button>
                                    )}
                                    <button
                                        onClick={() => cancelPrescription(prescription._id)}
                                        className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
