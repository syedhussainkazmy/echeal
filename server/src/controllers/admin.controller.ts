import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { User, UserRole } from '../models/User.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Appointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js';

export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const totalPatients = await User.countDocuments({ role: UserRole.PATIENT });
        const totalDoctors = await User.countDocuments({ role: UserRole.DOCTOR });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaysAppointments = await Appointment.countDocuments({
            appointmentDate: { $gte: today, $lt: tomorrow },
        });

        const lowStockItems = await InventoryItem.find({
            $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
        });

        res.status(200).json({
            totalPatients,
            totalDoctors,
            todaysAppointments,
            lowStockItemsCount: lowStockItems.length,
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getStaffList = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();
        const role = String(req.query.role || 'all').toLowerCase();
        const isActive = String(req.query.isActive || 'all').toLowerCase();

        const filters: any = { role: { $in: [UserRole.DOCTOR, UserRole.ADMIN] } };

        if (role === UserRole.ADMIN || role === UserRole.DOCTOR) {
            filters.role = role;
        }

        if (isActive === 'true') {
            filters.isActive = true;
        } else if (isActive === 'false') {
            filters.isActive = false;
        }

        if (search) {
            filters.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const [staff, total] = await Promise.all([
            User.find(filters)
                .select('-passwordHash')
                .sort({ createdAt: sortOrder })
                .skip(skip)
                .limit(limit),
            User.countDocuments(filters),
        ]);

        res.status(200).json(buildPaginatedResponse(staff, total, page, limit));
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('-passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isActive = !user.isActive;
        await user.save();
        res.status(200).json({ message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, user });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const verifyDoctor = async (req: AuthRequest, res: Response) => {
    try {
        const { doctorId } = req.params;
        const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
        if (!doctorProfile) return res.status(404).json({ message: 'Doctor profile not found' });

        doctorProfile.isVerified = !doctorProfile.isVerified;
        await doctorProfile.save();
        res.status(200).json({
            message: `Doctor ${doctorProfile.isVerified ? 'verified' : 'unverified'} successfully`,
            doctorProfile,
        });
    } catch (error) {
        console.error('Error verifying doctor:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllAppointments = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'all').toLowerCase();

        const filters: any = {};

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
                { reasonForVisit: { $regex: search, $options: 'i' } },
            ];
        }

        const [appointments, total] = await Promise.all([
            Appointment.find(filters)
                .populate('patient', 'firstName lastName email')
                .populate('doctor', 'firstName lastName email')
                .sort({ appointmentDate: sortOrder })
                .skip(skip)
                .limit(limit),
            Appointment.countDocuments(filters),
        ]);

        res.status(200).json(buildPaginatedResponse(appointments, total, page, limit));
    } catch (error) {
        console.error('Error fetching all appointments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getInventory = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string }, 12);
        const search = String(req.query.search || '').trim();
        const category = String(req.query.category || 'all').toLowerCase();

        const filters: any = {};

        if (category !== 'all') {
            filters.category = category;
        }

        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { supplierName: { $regex: search, $options: 'i' } },
            ];
        }

        const [inventory, total] = await Promise.all([
            InventoryItem.find(filters)
                .sort({ category: 1, name: sortOrder })
                .skip(skip)
                .limit(limit),
            InventoryItem.countDocuments(filters),
        ]);

        res.status(200).json(buildPaginatedResponse(inventory, total, page, limit));
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addInventoryItem = async (req: AuthRequest, res: Response) => {
    try {
        const { name, category, quantity, unit, lowStockThreshold, supplierName } = req.body;
        const newItem = new InventoryItem({ name, category, quantity, unit, lowStockThreshold, supplierName });
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateInventoryItem = async (req: AuthRequest, res: Response) => {
    try {
        const { itemId } = req.params;
        const updated = await InventoryItem.findByIdAndUpdate(itemId, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const deleteInventoryItem = async (req: AuthRequest, res: Response) => {
    try {
        const { itemId } = req.params;
        const deleted = await InventoryItem.findByIdAndDelete(itemId);
        if (!deleted) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            const next = line[i + 1];
            if (inQuotes && next === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
};

export const importInventoryFromCsv = async (req: AuthRequest, res: Response) => {
    try {
        const csvData = String(req.body.csvData || '');
        const lines = csvData
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length < 2) {
            return res.status(400).json({
                message: 'CSV must include a header row and at least one data row',
            });
        }

        const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
        const headerIndex = {
            name: headers.indexOf('name'),
            category: headers.indexOf('category'),
            quantity: headers.indexOf('quantity'),
            unit: headers.indexOf('unit'),
            lowStockThreshold: headers.indexOf('lowstockthreshold'),
            supplierName: headers.indexOf('suppliername'),
        };

        if (headerIndex.name < 0 || headerIndex.category < 0 || headerIndex.quantity < 0 || headerIndex.unit < 0) {
            return res.status(400).json({
                message: 'CSV header must include: name, category, quantity, unit',
            });
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: Array<{ line: number; message: string }> = [];

        for (let i = 1; i < lines.length; i++) {
            const lineNumber = i + 1;
            const columns = parseCsvLine(lines[i]);

            const name = String(columns[headerIndex.name] || '').trim();
            const category = String(columns[headerIndex.category] || '').trim().toLowerCase();
            const quantityRaw = String(columns[headerIndex.quantity] || '').trim();
            const unit = String(columns[headerIndex.unit] || '').trim();
            const lowStockRaw = headerIndex.lowStockThreshold >= 0 ? String(columns[headerIndex.lowStockThreshold] || '').trim() : '';
            const supplierName = headerIndex.supplierName >= 0 ? String(columns[headerIndex.supplierName] || '').trim() : '';

            if (!name || !category || !quantityRaw || !unit) {
                skipped++;
                errors.push({ line: lineNumber, message: 'Missing required fields (name, category, quantity, unit)' });
                continue;
            }

            if (!['medicine', 'equipment', 'supplies'].includes(category)) {
                skipped++;
                errors.push({ line: lineNumber, message: `Invalid category: ${category}` });
                continue;
            }

            const quantity = Number(quantityRaw);
            if (!Number.isInteger(quantity) || quantity < 0) {
                skipped++;
                errors.push({ line: lineNumber, message: `Invalid quantity: ${quantityRaw}` });
                continue;
            }

            let lowStockThreshold: number | undefined;
            if (lowStockRaw) {
                const parsedLow = Number(lowStockRaw);
                if (!Number.isInteger(parsedLow) || parsedLow < 0) {
                    skipped++;
                    errors.push({ line: lineNumber, message: `Invalid lowStockThreshold: ${lowStockRaw}` });
                    continue;
                }
                lowStockThreshold = parsedLow;
            }

            const existing = await InventoryItem.findOne({ name, category });

            if (existing) {
                existing.quantity += quantity;
                existing.unit = unit;
                if (typeof lowStockThreshold === 'number') {
                    existing.lowStockThreshold = lowStockThreshold;
                }
                if (supplierName) {
                    existing.supplierName = supplierName;
                }
                existing.lastRestocked = new Date();
                await existing.save();
                updated++;
            } else {
                await InventoryItem.create({
                    name,
                    category,
                    quantity,
                    unit,
                    lowStockThreshold: typeof lowStockThreshold === 'number' ? lowStockThreshold : 10,
                    supplierName,
                    lastRestocked: new Date(),
                });
                created++;
            }
        }

        return res.status(200).json({
            message: 'CSV import completed',
            summary: {
                processedRows: lines.length - 1,
                created,
                updated,
                skipped,
                errorCount: errors.length,
            },
            errors,
        });
    } catch (error) {
        console.error('Error importing inventory CSV:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
