import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User.js';

export enum AppointmentStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export interface IAppointment extends Document {
    patient: IUser['_id'];
    doctor: IUser['_id'];
    appointmentDate: Date;
    reasonForVisit: string;
    status: AppointmentStatus;
    notes?: string;
}

const AppointmentSchema: Schema = new Schema(
    {
        patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        appointmentDate: { type: Date, required: true },
        reasonForVisit: { type: String, required: true },
        status: {
            type: String,
            enum: Object.values(AppointmentStatus),
            default: AppointmentStatus.PENDING,
        },
        notes: { type: String },
    },
    {
        timestamps: true,
    }
);

AppointmentSchema.index({ doctor: 1, appointmentDate: -1, status: 1 });
AppointmentSchema.index({ patient: 1, appointmentDate: -1, status: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
