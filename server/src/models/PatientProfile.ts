import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User.js';

export interface IPatientProfile extends Document {
    user: IUser['_id'];
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
    bloodGroup?: string;
    contactNumber?: string;
    address?: string;
    emergencyContact?: {
        name: string;
        relation: string;
        contactNumber: string;
    };
}

const PatientProfileSchema: Schema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        dateOfBirth: { type: Date },
        gender: { type: String, enum: ['male', 'female', 'other'] },
        bloodGroup: { type: String },
        contactNumber: { type: String },
        address: { type: String },
        emergencyContact: {
            name: { type: String },
            relation: { type: String },
            contactNumber: { type: String },
        },
    },
    {
        timestamps: true,
    }
);

export const PatientProfile = mongoose.model<IPatientProfile>('PatientProfile', PatientProfileSchema);
