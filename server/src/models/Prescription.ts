import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User.js';
import { IAppointment } from './Appointment.js';
import { IInventoryItem } from './InventoryItem.js';

export enum PrescriptionStatus {
    DRAFT = 'draft',
    ISSUED = 'issued',
    DISPENSED = 'dispensed',
    CANCELLED = 'cancelled',
}

export interface IPrescriptionMedication {
    medicationName: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    quantity: number;
    instructions?: string;
    inventoryItem?: IInventoryItem['_id'];
}

export interface IStatusHistory {
    timestamp: Date;
    fromStatus: PrescriptionStatus | null;
    toStatus: PrescriptionStatus;
    actor: IUser['_id'];
    actorRole: 'doctor' | 'admin';
}

export interface IPrescription extends Document {
    patient: IUser['_id'];
    doctor: IUser['_id'];
    appointment?: IAppointment['_id'];
    medications: IPrescriptionMedication[];
    notes?: string;
    status: PrescriptionStatus;
    dispensedAt?: Date;
    dispensedBy?: IUser['_id'];
    issuedAt?: Date;
    issuedBy?: IUser['_id'];
    cancelledAt?: Date;
    cancelledBy?: IUser['_id'];
    statusHistory: IStatusHistory[];
    createdAt: Date;
    updatedAt: Date;
}

const PrescriptionMedicationSchema = new Schema<IPrescriptionMedication>(
    {
        medicationName: { type: String, required: true, trim: true },
        dosage: { type: String, required: true, trim: true },
        frequency: { type: String, required: true, trim: true },
        durationDays: { type: Number, required: true, min: 1 },
        quantity: { type: Number, required: true, min: 1 },
        instructions: { type: String, trim: true },
        inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    },
    { _id: false }
);

const StatusHistorySchema = new Schema<IStatusHistory>(
    {
        timestamp: { type: Date, required: true, default: () => new Date() },
        fromStatus: { type: String, enum: [null, ...Object.values(PrescriptionStatus)], default: null },
        toStatus: { type: String, enum: Object.values(PrescriptionStatus), required: true },
        actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        actorRole: { type: String, enum: ['doctor', 'admin'], required: true },
    },
    { _id: false }
);

const PrescriptionSchema = new Schema<IPrescription>(
    {
        patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
        medications: {
            type: [PrescriptionMedicationSchema],
            required: true,
            validate: {
                validator: (value: IPrescriptionMedication[]) => Array.isArray(value) && value.length > 0,
                message: 'At least one medication is required',
            },
        },
        notes: { type: String, trim: true },
        status: {
            type: String,
            enum: Object.values(PrescriptionStatus),
            default: PrescriptionStatus.ISSUED,
        },
        dispensedAt: { type: Date },
        dispensedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        issuedAt: { type: Date },
        issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        cancelledAt: { type: Date },
        cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
        statusHistory: {
            type: [StatusHistorySchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

PrescriptionSchema.index({ doctor: 1, createdAt: -1, status: 1 });
PrescriptionSchema.index({ patient: 1, createdAt: -1, status: 1 });
PrescriptionSchema.index({ appointment: 1 });

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
