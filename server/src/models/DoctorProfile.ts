import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User.js';

export interface IDoctorProfile extends Document {
    user: IUser['_id'];
    specialization: string;
    qualifications: string[];
    experienceYears: number;
    consultationFee: number;
    availability: {
        dayOfWeek: string;
        startTime: string;
        endTime: string;
    }[];
    bio?: string;
    clinicAddress?: string;
    isVerified: boolean;
}

const DoctorProfileSchema: Schema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        specialization: { type: String, required: true },
        qualifications: [{ type: String }],
        experienceYears: { type: Number, default: 0 },
        consultationFee: { type: Number, default: 0 },
        availability: [
            {
                dayOfWeek: { type: String },
                startTime: { type: String },
                endTime: { type: String },
            },
        ],
        bio: { type: String },
        clinicAddress: { type: String },
        isVerified: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

DoctorProfileSchema.index({ isVerified: 1, specialization: 1 });

export const DoctorProfile = mongoose.model<IDoctorProfile>('DoctorProfile', DoctorProfileSchema);
