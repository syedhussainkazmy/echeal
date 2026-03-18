import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
    PATIENT = 'patient',
    DOCTOR = 'doctor',
    ADMIN = 'admin',
}

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        role: {
            type: String,
            enum: Object.values(UserRole),
            required: true,
            default: UserRole.PATIENT,
        },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
    }
);

UserSchema.index({ role: 1, isActive: 1, createdAt: -1 });
UserSchema.index({ firstName: 1, lastName: 1, email: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
