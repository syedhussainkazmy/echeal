import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User.js';

export const seedAdminUser = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.warn('Admin seed skipped: ADMIN_EMAIL or ADMIN_PASSWORD is not configured');
        return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
        console.log(`Admin seed skipped: ${adminEmail} already exists`);
        return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await User.create({
        firstName: 'System',
        lastName: 'Admin',
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
    });

    console.log(`Seeded admin user: ${adminEmail}`);
};
