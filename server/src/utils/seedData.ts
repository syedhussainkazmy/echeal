import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { seedAdminUser } from './seedAdmin.js';
import { User, UserRole } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { PatientProfile } from '../models/PatientProfile.js';
import { Appointment, AppointmentStatus } from '../models/Appointment.js';
import { Vital } from '../models/Vital.js';
import { InventoryItem } from '../models/InventoryItem.js';

dotenv.config();

type SeedUser = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
};

const doctorSeeds: SeedUser[] = [
    {
        firstName: 'Ayesha',
        lastName: 'Khan',
        email: 'doctor.ayesha@echeal.com',
        password: 'Doctor@123',
        role: UserRole.DOCTOR,
    },
    {
        firstName: 'Umar',
        lastName: 'Farooq',
        email: 'doctor.umar@echeal.com',
        password: 'Doctor@123',
        role: UserRole.DOCTOR,
    },
    {
        firstName: 'Sara',
        lastName: 'Ahmed',
        email: 'doctor.sara@echeal.com',
        password: 'Doctor@123',
        role: UserRole.DOCTOR,
    },
];

const patientSeeds: SeedUser[] = [
    {
        firstName: 'Ali',
        lastName: 'Raza',
        email: 'patient.ali@echeal.com',
        password: 'Patient@123',
        role: UserRole.PATIENT,
    },
    {
        firstName: 'Hina',
        lastName: 'Waqar',
        email: 'patient.hina@echeal.com',
        password: 'Patient@123',
        role: UserRole.PATIENT,
    },
    {
        firstName: 'Zain',
        lastName: 'Iqbal',
        email: 'patient.zain@echeal.com',
        password: 'Patient@123',
        role: UserRole.PATIENT,
    },
    {
        firstName: 'Mariam',
        lastName: 'Noor',
        email: 'patient.mariam@echeal.com',
        password: 'Patient@123',
        role: UserRole.PATIENT,
    },
];

const upsertUser = async (seed: SeedUser) => {
    const email = seed.email.toLowerCase();
    const existing = await User.findOne({ email });

    if (existing) {
        existing.firstName = seed.firstName;
        existing.lastName = seed.lastName;
        existing.role = seed.role;
        existing.isActive = true;
        await existing.save();
        return existing;
    }

    const passwordHash = await bcrypt.hash(seed.password, 10);
    const created = await User.create({
        firstName: seed.firstName,
        lastName: seed.lastName,
        email,
        passwordHash,
        role: seed.role,
        isActive: true,
    });
    return created;
};

const seedDoctors = async () => {
    const doctors = [];

    for (const [index, seed] of doctorSeeds.entries()) {
        const user = await upsertUser(seed);

        const profile = await DoctorProfile.findOneAndUpdate(
            { user: user._id },
            {
                specialization: index === 0 ? 'Cardiology' : index === 1 ? 'General' : 'Pediatrics',
                qualifications: ['MBBS', 'FCPS'],
                experienceYears: 4 + index * 2,
                consultationFee: 30 + index * 10,
                availability: [
                    { dayOfWeek: 'Monday', startTime: '09:00', endTime: '13:00' },
                    { dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '14:00' },
                    { dayOfWeek: 'Friday', startTime: '11:00', endTime: '15:00' },
                ],
                bio: `${seed.firstName} ${seed.lastName} is an experienced clinician at eCheal.`,
                clinicAddress: 'Main Block, eCheal Medical Center',
                isVerified: true,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        doctors.push({ user, profile });
    }

    console.log(`Seeded ${doctors.length} doctors with profiles`);
    return doctors;
};

const seedPatients = async () => {
    const genders: Array<'male' | 'female' | 'other'> = ['male', 'female', 'male', 'female'];
    const bloodGroups = ['O+', 'A+', 'B+', 'AB+'];
    const patients = [];

    for (const [index, seed] of patientSeeds.entries()) {
        const user = await upsertUser(seed);

        const profile = await PatientProfile.findOneAndUpdate(
            { user: user._id },
            {
                dateOfBirth: new Date(1990 + index, index, 10 + index),
                gender: genders[index],
                bloodGroup: bloodGroups[index],
                contactNumber: `+9230012345${index}`,
                address: `Street ${index + 1}, Karachi`,
                emergencyContact: {
                    name: `Emergency Contact ${index + 1}`,
                    relation: 'Sibling',
                    contactNumber: `+9230098765${index}`,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        patients.push({ user, profile });
    }

    console.log(`Seeded ${patients.length} patients with profiles`);
    return patients;
};

const ensureAppointment = async (
    patientId: mongoose.Types.ObjectId,
    doctorId: mongoose.Types.ObjectId,
    appointmentDate: Date,
    reasonForVisit: string,
    status: AppointmentStatus,
    notes?: string
) => {
    const existing = await Appointment.findOne({
        patient: patientId,
        doctor: doctorId,
        appointmentDate,
    });

    if (existing) {
        existing.reasonForVisit = reasonForVisit;
        existing.status = status;
        existing.notes = notes;
        await existing.save();
        return existing;
    }

    return Appointment.create({
        patient: patientId,
        doctor: doctorId,
        appointmentDate,
        reasonForVisit,
        status,
        notes,
    });
};

const seedAppointments = async (
    doctors: Array<{ user: { _id: mongoose.Types.ObjectId } }>,
    patients: Array<{ user: { _id: mongoose.Types.ObjectId } }>
) => {
    const now = new Date();

    const planned = [
        {
            patient: patients[0].user._id,
            doctor: doctors[0].user._id,
            appointmentDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            reason: 'Routine heart checkup',
            status: AppointmentStatus.CONFIRMED,
            notes: 'Bring previous ECG report.',
        },
        {
            patient: patients[1].user._id,
            doctor: doctors[1].user._id,
            appointmentDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
            reason: 'Fever and sore throat',
            status: AppointmentStatus.PENDING,
            notes: undefined,
        },
        {
            patient: patients[2].user._id,
            doctor: doctors[2].user._id,
            appointmentDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
            reason: 'Child follow-up visit',
            status: AppointmentStatus.COMPLETED,
            notes: 'Prescribed 5-day medication course.',
        },
        {
            patient: patients[3].user._id,
            doctor: doctors[1].user._id,
            appointmentDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            reason: 'General weakness and fatigue',
            status: AppointmentStatus.CANCELLED,
            notes: 'Patient requested cancellation.',
        },
    ];

    for (const appt of planned) {
        await ensureAppointment(
            appt.patient,
            appt.doctor,
            appt.appointmentDate,
            appt.reason,
            appt.status,
            appt.notes
        );
    }

    console.log(`Seeded ${planned.length} appointments`);
};

const ensureVital = async (
    patientId: mongoose.Types.ObjectId,
    recordedAt: Date,
    systolic: number,
    diastolic: number,
    heartRate: number,
    bloodSugar: number,
    weight: number,
    temperature: number,
    notes: string
) => {
    const existing = await Vital.findOne({ patient: patientId, recordedAt });
    if (existing) {
        return existing;
    }

    return Vital.create({
        patient: patientId,
        bloodPressure: { systolic, diastolic },
        heartRate,
        bloodSugar,
        weight,
        temperature,
        notes,
        recordedAt,
    });
};

const seedVitals = async (patients: Array<{ user: { _id: mongoose.Types.ObjectId } }>) => {
    const now = new Date();

    for (const [index, patient] of patients.entries()) {
        await ensureVital(
            patient.user._id,
            new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000),
            118 + index,
            78 + index,
            70 + index,
            95 + index * 3,
            62 + index * 2,
            36.7 + index * 0.1,
            'Routine daily vitals'
        );

        await ensureVital(
            patient.user._id,
            new Date(now.getTime() - (index + 5) * 24 * 60 * 60 * 1000),
            122 + index,
            80 + index,
            72 + index,
            100 + index * 3,
            63 + index * 2,
            36.8 + index * 0.1,
            'Post meal reading'
        );
    }

    console.log(`Seeded vitals for ${patients.length} patients`);
};

const seedInventory = async () => {
    const inventorySeeds = [
        { name: 'Paracetamol 500mg', category: 'medicine', quantity: 150, unit: 'tablets', lowStockThreshold: 40, supplierName: 'MediSupply Co.' },
        { name: 'Syringe 5ml', category: 'supplies', quantity: 300, unit: 'pcs', lowStockThreshold: 80, supplierName: 'Health Equip Traders' },
        { name: 'Blood Pressure Monitor', category: 'equipment', quantity: 12, unit: 'pcs', lowStockThreshold: 4, supplierName: 'Care Devices Ltd.' },
        { name: 'Glucose Strips', category: 'supplies', quantity: 220, unit: 'strips', lowStockThreshold: 60, supplierName: 'GlucoTech' },
        { name: 'Amoxicillin 250mg', category: 'medicine', quantity: 90, unit: 'capsules', lowStockThreshold: 30, supplierName: 'Pharma Direct' },
    ] as const;

    for (const item of inventorySeeds) {
        await InventoryItem.findOneAndUpdate(
            { name: item.name, category: item.category },
            {
                quantity: item.quantity,
                unit: item.unit,
                lowStockThreshold: item.lowStockThreshold,
                supplierName: item.supplierName,
                lastRestocked: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    console.log(`Seeded ${inventorySeeds.length} inventory items`);
};

const run = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is required to run the seed script');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    await seedAdminUser();
    const doctors = await seedDoctors();
    const patients = await seedPatients();
    await seedAppointments(doctors, patients);
    await seedVitals(patients);
    await seedInventory();

    await mongoose.disconnect();
    console.log('Seed data completed successfully');
};

run().catch(async (error) => {
    console.error('Seed data failed:', error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
