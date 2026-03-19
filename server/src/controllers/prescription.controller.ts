import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { Appointment } from '../models/Appointment.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Prescription, PrescriptionStatus } from '../models/Prescription.js';
import { User, UserRole } from '../models/User.js';
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js';

const canDoctorEdit = (status: PrescriptionStatus) => {
    return status === PrescriptionStatus.DRAFT || status === PrescriptionStatus.ISSUED;
};

const canTransitionTo = (from: PrescriptionStatus, to: PrescriptionStatus) => {
    if (from === to) return true;

    const allowed: Record<PrescriptionStatus, PrescriptionStatus[]> = {
        [PrescriptionStatus.DRAFT]: [PrescriptionStatus.ISSUED, PrescriptionStatus.CANCELLED],
        [PrescriptionStatus.ISSUED]: [PrescriptionStatus.CANCELLED],
        [PrescriptionStatus.DISPENSED]: [],
        [PrescriptionStatus.CANCELLED]: [],
    };

    return allowed[from].includes(to);
};

interface RecordStatusChangeParams {
    prescription: typeof Prescription.prototype;
    fromStatus: PrescriptionStatus | null;
    toStatus: PrescriptionStatus;
    actor: Types.ObjectId | string | undefined;
    actorRole: 'doctor' | 'admin';
}

const recordStatusChange = ({
    prescription,
    fromStatus,
    toStatus,
    actor,
    actorRole,
}: RecordStatusChangeParams) => {
    const historyEntry = {
        timestamp: new Date(),
        fromStatus: fromStatus || null,
        toStatus,
        actor: actor as Types.ObjectId,
        actorRole,
    };
    prescription.statusHistory.push(historyEntry);
};

export const createPrescription = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { patientId, appointmentId, medications, notes, status } = req.body;

        const patient = await User.findOne({ _id: patientId, role: UserRole.PATIENT }).select('_id');
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        if (status && ![PrescriptionStatus.DRAFT, PrescriptionStatus.ISSUED].includes(status)) {
            return res.status(400).json({ message: 'Doctors can only create draft or issued prescriptions' });
        }

        let relatedAppointment = null;
        if (appointmentId) {
            relatedAppointment = await Appointment.findOne({
                _id: appointmentId,
                doctor: doctorId,
                patient: patientId,
            }).select('_id');

            if (!relatedAppointment) {
                return res.status(400).json({ message: 'appointmentId is invalid for this doctor and patient' });
            }
        } else {
            const hasRelationship = await Appointment.exists({ doctor: doctorId, patient: patientId });
            if (!hasRelationship) {
                return res.status(400).json({
                    message: 'Doctor can prescribe only for linked patients with at least one appointment',
                });
            }
        }

        const finalStatus = status || PrescriptionStatus.ISSUED;
        const newPrescription = new Prescription({
            doctor: doctorId,
            patient: patientId,
            appointment: relatedAppointment?._id,
            medications,
            notes,
            status: finalStatus,
        });

        // Record initial status transition
        recordStatusChange({
            prescription: newPrescription,
            fromStatus: null,
            toStatus: finalStatus,
            actor: doctorId,
            actorRole: 'doctor',
        });

        if (finalStatus === PrescriptionStatus.ISSUED) {
            newPrescription.issuedAt = new Date();
            newPrescription.issuedBy = doctorId;
        }

        const saved = await newPrescription.save();
        const populated = await Prescription.findById(saved._id)
            .populate('patient', 'firstName lastName email')
            .populate('doctor', 'firstName lastName email')
            .populate('appointment', 'appointmentDate status reasonForVisit')
            .populate('medications.inventoryItem', 'name category unit quantity')
            .populate('statusHistory.actor', 'firstName lastName email');

        return res.status(201).json(populated);
    } catch (error) {
        console.error('Error creating prescription:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getDoctorPrescriptions = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'all').toLowerCase();

        const filters: {
            doctor: Types.ObjectId | string | undefined;
            status?: string;
            $or?: Array<Record<string, unknown>>;
        } = { doctor: doctorId };

        if (status !== 'all') {
            filters.status = status;
        }

        if (search) {
            const matchingPatients = await User.find(
                {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ],
                },
                { _id: 1 }
            );

            const patientIds = matchingPatients.map((patient) => patient._id);
            filters.$or = [
                { patient: { $in: patientIds } },
                { notes: { $regex: search, $options: 'i' } },
                { 'medications.medicationName': { $regex: search, $options: 'i' } },
            ];
        }

        const [prescriptions, total] = await Promise.all([
            Prescription.find(filters)
                .populate('patient', 'firstName lastName email')
                .populate('appointment', 'appointmentDate status')
                .sort({ createdAt: sortOrder })
                .skip(skip)
                .limit(limit),
            Prescription.countDocuments(filters),
        ]);

        return res.status(200).json(buildPaginatedResponse(prescriptions, total, page, limit));
    } catch (error) {
        console.error('Error fetching doctor prescriptions:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getDoctorPrescriptionById = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { prescriptionId } = req.params;

        const prescription = await Prescription.findOne({ _id: prescriptionId, doctor: doctorId })
            .populate('patient', 'firstName lastName email')
            .populate('doctor', 'firstName lastName email')
            .populate('appointment', 'appointmentDate status reasonForVisit')
            .populate('medications.inventoryItem', 'name category unit quantity')
            .populate('dispensedBy', 'firstName lastName email')
            .populate('statusHistory.actor', 'firstName lastName email');

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        return res.status(200).json(prescription);
    } catch (error) {
        console.error('Error fetching doctor prescription:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const updateDoctorPrescription = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { prescriptionId } = req.params;
        const { medications, notes, status } = req.body as {
            medications?: unknown;
            notes?: string;
            status?: PrescriptionStatus;
        };

        const prescription = await Prescription.findOne({ _id: prescriptionId, doctor: doctorId });
        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        if (!canDoctorEdit(prescription.status)) {
            return res.status(400).json({ message: 'Prescription can no longer be modified by doctor' });
        }

        if (status) {
            if (status === PrescriptionStatus.DISPENSED) {
                return res.status(400).json({ message: 'Doctors cannot mark prescriptions as dispensed' });
            }

            if (!canTransitionTo(prescription.status, status)) {
                return res.status(400).json({ message: 'Invalid prescription status transition' });
            }

            const oldStatus = prescription.status;
            recordStatusChange({
                prescription,
                fromStatus: oldStatus,
                toStatus: status,
                actor: doctorId,
                actorRole: 'doctor',
            });

            prescription.status = status;

            if (status === PrescriptionStatus.ISSUED && !prescription.issuedAt) {
                prescription.issuedAt = new Date();
                prescription.issuedBy = doctorId;
            }
        }

        if (medications !== undefined) {
            prescription.medications = medications as typeof prescription.medications;
        }

        if (notes !== undefined) {
            prescription.notes = notes;
        }

        prescription.dispensedAt = undefined;
        prescription.dispensedBy = undefined;

        await prescription.save();

        const populated = await Prescription.findById(prescription._id)
            .populate('patient', 'firstName lastName email')
            .populate('doctor', 'firstName lastName email')
            .populate('appointment', 'appointmentDate status reasonForVisit')
            .populate('medications.inventoryItem', 'name category unit quantity')
            .populate('statusHistory.actor', 'firstName lastName email');

        return res.status(200).json(populated);
    } catch (error) {
        console.error('Error updating doctor prescription:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const cancelDoctorPrescription = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { prescriptionId } = req.params;

        const prescription = await Prescription.findOne({ _id: prescriptionId, doctor: doctorId });
        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        if (!canDoctorEdit(prescription.status)) {
            return res.status(400).json({ message: 'Prescription cannot be cancelled' });
        }

        const oldStatus = prescription.status;
        recordStatusChange({
            prescription,
            fromStatus: oldStatus,
            toStatus: PrescriptionStatus.CANCELLED,
            actor: doctorId,
            actorRole: 'doctor',
        });

        prescription.status = PrescriptionStatus.CANCELLED;
        prescription.cancelledAt = new Date();
        prescription.cancelledBy = doctorId;
        prescription.dispensedAt = undefined;
        prescription.dispensedBy = undefined;
        await prescription.save();

        return res.status(200).json({ message: 'Prescription cancelled successfully', prescription });
    } catch (error) {
        console.error('Error cancelling doctor prescription:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getPatientPrescriptions = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'all').toLowerCase();

        const filters: {
            patient: Types.ObjectId | string | undefined;
            status?: string;
            $or?: Array<Record<string, unknown>>;
        } = { patient: patientId };

        if (status !== 'all') {
            filters.status = status;
        }

        if (search) {
            filters.$or = [
                { notes: { $regex: search, $options: 'i' } },
                { 'medications.medicationName': { $regex: search, $options: 'i' } },
            ];
        }

        const [prescriptions, total] = await Promise.all([
            Prescription.find(filters)
                .populate('doctor', 'firstName lastName email')
                .populate('appointment', 'appointmentDate status')
                .sort({ createdAt: sortOrder })
                .skip(skip)
                .limit(limit),
            Prescription.countDocuments(filters),
        ]);

        return res.status(200).json(buildPaginatedResponse(prescriptions, total, page, limit));
    } catch (error) {
        console.error('Error fetching patient prescriptions:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getPatientPrescriptionById = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { prescriptionId } = req.params;

        const prescription = await Prescription.findOne({ _id: prescriptionId, patient: patientId })
            .populate('patient', 'firstName lastName email')
            .populate('doctor', 'firstName lastName email')
            .populate('appointment', 'appointmentDate status reasonForVisit')
            .populate('medications.inventoryItem', 'name category unit quantity')
            .populate('dispensedBy', 'firstName lastName email')
            .populate('statusHistory.actor', 'firstName lastName email');

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        return res.status(200).json(prescription);
    } catch (error) {
        console.error('Error fetching patient prescription:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminPrescriptions = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'all').toLowerCase();

        const filters: {
            status?: string;
            $or?: Array<Record<string, unknown>>;
        } = {};

        if (status !== 'all') {
            filters.status = status;
        }

        if (search) {
            const matchingUsers = await User.find(
                {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ],
                },
                { _id: 1 }
            );

            const userIds = matchingUsers.map((user) => user._id);
            filters.$or = [
                { patient: { $in: userIds } },
                { doctor: { $in: userIds } },
                { notes: { $regex: search, $options: 'i' } },
                { 'medications.medicationName': { $regex: search, $options: 'i' } },
            ];
        }

        const [prescriptions, total] = await Promise.all([
            Prescription.find(filters)
                .populate('patient', 'firstName lastName email')
                .populate('doctor', 'firstName lastName email')
                .populate('appointment', 'appointmentDate status')
                .populate('dispensedBy', 'firstName lastName email')
                .sort({ createdAt: sortOrder })
                .skip(skip)
                .limit(limit),
            Prescription.countDocuments(filters),
        ]);

        return res.status(200).json(buildPaginatedResponse(prescriptions, total, page, limit));
    } catch (error) {
        console.error('Error fetching admin prescriptions:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminPrescriptionById = async (req: AuthRequest, res: Response) => {
    try {
        const { prescriptionId } = req.params;

        const prescription = await Prescription.findById(prescriptionId)
            .populate('patient', 'firstName lastName email')
            .populate('doctor', 'firstName lastName email')
            .populate('appointment', 'appointmentDate status reasonForVisit')
            .populate('dispensedBy', 'firstName lastName email')
            .populate('medications.inventoryItem', 'name category unit quantity')
            .populate('statusHistory.actor', 'firstName lastName email');

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        return res.status(200).json(prescription);
    } catch (error) {
        console.error('Error fetching admin prescription detail:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const markPrescriptionDispensed = async (req: AuthRequest, res: Response) => {
    try {
        const adminId = req.user?._id;
        const { prescriptionId } = req.params;

        const prescription = await Prescription.findById(prescriptionId);
        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        if (prescription.status !== PrescriptionStatus.ISSUED) {
            return res.status(400).json({ message: 'Only issued prescriptions can be dispensed' });
        }

        const inventoryRequests = prescription.medications
            .filter((medication) => medication.inventoryItem)
            .map((medication) => ({
                inventoryItemId: String(medication.inventoryItem),
                quantity: medication.quantity,
                medicationName: medication.medicationName,
            }));

        if (inventoryRequests.length > 0) {
            const successfulDeductions: Array<{ inventoryItemId: string; quantity: number }> = [];

            for (const request of inventoryRequests) {
                const updated = await InventoryItem.findOneAndUpdate(
                    {
                        _id: request.inventoryItemId,
                        quantity: { $gte: request.quantity },
                    },
                    { $inc: { quantity: -request.quantity } },
                    { new: true }
                );

                if (!updated) {
                    for (const applied of successfulDeductions) {
                        await InventoryItem.findByIdAndUpdate(applied.inventoryItemId, { $inc: { quantity: applied.quantity } });
                    }

                    return res.status(400).json({
                        message: `Insufficient stock or missing inventory item for ${request.medicationName}`,
                    });
                }

                successfulDeductions.push({
                    inventoryItemId: request.inventoryItemId,
                    quantity: request.quantity,
                });
            }
        }

        prescription.status = PrescriptionStatus.DISPENSED;
        prescription.dispensedAt = new Date();
        prescription.dispensedBy = adminId;

        recordStatusChange({
            prescription,
            fromStatus: PrescriptionStatus.ISSUED,
            toStatus: PrescriptionStatus.DISPENSED,
            actor: adminId,
            actorRole: 'admin',
        });

        await prescription.save();

        const populated = await Prescription.findById(prescription._id)
            .populate('patient', 'firstName lastName email')
            .populate('doctor', 'firstName lastName email')
            .populate('appointment', 'appointmentDate status reasonForVisit')
            .populate('dispensedBy', 'firstName lastName email')
            .populate('medications.inventoryItem', 'name category unit quantity')
            .populate('statusHistory.actor', 'firstName lastName email');

        return res.status(200).json({ message: 'Prescription dispensed successfully', prescription: populated });
    } catch (error) {
        console.error('Error marking prescription as dispensed:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
