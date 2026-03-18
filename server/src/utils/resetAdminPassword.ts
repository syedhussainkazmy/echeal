import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, UserRole } from '../models/User.js';

dotenv.config();

const run = async () => {
    const email = process.env.ADMIN_EMAIL?.toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const mongoUri = process.env.MONGO_URI;

    if (!email || !password || !mongoUri) {
        throw new Error('Missing ADMIN_EMAIL, ADMIN_PASSWORD, or MONGO_URI');
    }

    await mongoose.connect(mongoUri);

    const admin = await User.findOne({ email, role: UserRole.ADMIN });
    if (!admin) {
        throw new Error(`Admin not found for ${email}`);
    }

    admin.passwordHash = await bcrypt.hash(password, 10);
    admin.isActive = true;
    await admin.save();

    await mongoose.disconnect();
    console.log(`Admin password reset for ${email}`);
};

run().catch(async (error) => {
    console.error('Admin password reset failed:', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
