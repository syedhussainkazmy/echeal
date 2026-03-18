import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User.js';

export interface IVital extends Document {
    patient: IUser['_id'];
    bloodPressure: {
        systolic: number;
        diastolic: number;
    };
    heartRate: number;
    bloodSugar?: number;
    weight?: number;
    height?: number; // in cm
    temperature?: number; // in Celsius
    notes?: string;
    recordedAt: Date;
}

const VitalSchema: Schema = new Schema(
    {
        patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        bloodPressure: {
            systolic: { type: Number, required: true },
            diastolic: { type: Number, required: true },
        },
        heartRate: { type: Number, required: true },
        bloodSugar: { type: Number },
        weight: { type: Number },
        height: { type: Number },
        temperature: { type: Number },
        notes: { type: String },
        recordedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

VitalSchema.index({ patient: 1, recordedAt: -1 });

export const Vital = mongoose.model<IVital>('Vital', VitalSchema);
