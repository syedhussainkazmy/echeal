import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { Appointment } from '../models/Appointment.js';
import { InventoryItem } from '../models/InventoryItem.js';
import { Prescription, PrescriptionStatus } from '../models/Prescription.js';
import { StorePurchase } from '../models/StorePurchase.js';
import { User } from '../models/User.js';
import { buildPaginatedResponse, parsePagination } from '../utils/pagination.js';

export const getStoreInventory = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string }, 12);
        const search = String(req.query.search || '').trim();
        const category = String(req.query.category || 'all').toLowerCase();

        const filters: {
            quantity: { $gt: number };
            category?: string;
            $or?: Array<Record<string, unknown>>;
        } = {
            quantity: { $gt: 0 },
        };

        if (category !== 'all') {
            filters.category = category;
        }

        if (search) {
            filters.$or = [
                { name: { $regex: search, $options: 'i' } },
                { supplierName: { $regex: search, $options: 'i' } },
            ];
        }

        const [items, total] = await Promise.all([
            InventoryItem.find(filters)
                .sort({ category: 1, name: sortOrder })
                .skip(skip)
                .limit(limit),
            InventoryItem.countDocuments(filters),
        ]);

        return res.status(200).json(buildPaginatedResponse(items, total, page, limit));
    } catch (error) {
        console.error('Error fetching store inventory:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const createStorePurchase = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { items, notes } = req.body as {
            items: Array<{ inventoryItemId: string; quantity: number }>;
            notes?: string;
        };

        if (!patientId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const aggregated = new Map<string, number>();
        for (const item of items) {
            const current = aggregated.get(item.inventoryItemId) || 0;
            aggregated.set(item.inventoryItemId, current + Number(item.quantity));
        }

        const requestedIds = Array.from(aggregated.keys()).filter((id) => Types.ObjectId.isValid(id));
        const inventory = await InventoryItem.find({ _id: { $in: requestedIds } });
        const inventoryById = new Map(inventory.map((item) => [String(item._id), item]));

        for (const [inventoryItemId, quantity] of aggregated.entries()) {
            const item = inventoryById.get(inventoryItemId);
            if (!item) {
                return res.status(404).json({ message: `Inventory item not found: ${inventoryItemId}` });
            }

            if (item.quantity < quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${item.name}. Available: ${item.quantity} ${item.unit}`,
                });
            }
        }

        const successfulDeductions: Array<{ inventoryItemId: string; quantity: number }> = [];

        for (const [inventoryItemId, quantity] of aggregated.entries()) {
            const updated = await InventoryItem.findOneAndUpdate(
                {
                    _id: inventoryItemId,
                    quantity: { $gte: quantity },
                },
                { $inc: { quantity: -quantity } },
                { new: true }
            );

            if (!updated) {
                for (const applied of successfulDeductions) {
                    await InventoryItem.findByIdAndUpdate(applied.inventoryItemId, { $inc: { quantity: applied.quantity } });
                }

                return res.status(400).json({ message: 'Stock changed during checkout. Please try again.' });
            }

            successfulDeductions.push({ inventoryItemId, quantity });
        }

        const purchase = await StorePurchase.create({
            patient: patientId,
            items: Array.from(aggregated.entries()).map(([inventoryItemId, quantity]) => {
                const source = inventoryById.get(inventoryItemId);
                return {
                    inventoryItem: inventoryItemId,
                    itemName: source?.name || 'Unknown item',
                    itemCategory: source?.category || 'supplies',
                    quantity,
                    unit: source?.unit || 'unit',
                };
            }),
            notes: notes?.trim() || undefined,
            purchasedAt: new Date(),
        });

        const populated = await StorePurchase.findById(purchase._id)
            .populate('patient', 'firstName lastName email')
            .populate('items.inventoryItem', 'name category unit quantity');

        return res.status(201).json({ message: 'Purchase completed successfully', purchase: populated });
    } catch (error) {
        console.error('Error creating store purchase:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getPatientStorePurchases = async (req: AuthRequest, res: Response) => {
    try {
        const patientId = req.user?._id;
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });

        const filters: { patient: Types.ObjectId | string | undefined } = { patient: patientId };

        const [purchases, total] = await Promise.all([
            StorePurchase.find(filters)
                .populate('items.inventoryItem', 'name category unit quantity')
                .sort({ purchasedAt: sortOrder })
                .skip(skip)
                .limit(limit),
            StorePurchase.countDocuments(filters),
        ]);

        return res.status(200).json(buildPaginatedResponse(purchases, total, page, limit));
    } catch (error) {
        console.error('Error fetching patient purchases:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminStorePurchases = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();

        const filters: { patient?: { $in: Array<Types.ObjectId> } } = {};

        if (search) {
            const matchingPatients = await User.find(
                {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ],
                },
                { _id: 1 }
            );

            filters.patient = { $in: matchingPatients.map((patient) => patient._id as Types.ObjectId) };
        }

        const [purchases, total] = await Promise.all([
            StorePurchase.find(filters)
                .populate('patient', 'firstName lastName email')
                .populate('items.inventoryItem', 'name category unit quantity')
                .sort({ purchasedAt: sortOrder })
                .skip(skip)
                .limit(limit),
            StorePurchase.countDocuments(filters),
        ]);

        return res.status(200).json(buildPaginatedResponse(purchases, total, page, limit));
    } catch (error) {
        console.error('Error fetching admin purchases:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getDoctorPatientPurchases = async (req: AuthRequest, res: Response) => {
    try {
        const doctorId = req.user?._id;
        const { page, limit, skip, sortOrder } = parsePagination(req.query as { page?: string; limit?: string; sortOrder?: string });
        const search = String(req.query.search || '').trim();

        const patientIds = await Appointment.distinct('patient', { doctor: doctorId });
        if (!patientIds || patientIds.length === 0) {
            return res.status(200).json(buildPaginatedResponse([], 0, page, limit));
        }

        const filters: {
            patient: { $in: Array<Types.ObjectId> };
            $or?: Array<Record<string, unknown>>;
        } = {
            patient: { $in: patientIds as Types.ObjectId[] },
        };

        if (search) {
            const matchingPatients = await User.find(
                {
                    _id: { $in: patientIds },
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                    ],
                },
                { _id: 1 }
            );

            const matchingPatientIds = matchingPatients.map((patient) => patient._id as Types.ObjectId);
            filters.$or = [
                { patient: { $in: matchingPatientIds } },
                { notes: { $regex: search, $options: 'i' } },
                { 'items.itemName': { $regex: search, $options: 'i' } },
            ];
        }

        const [purchases, total] = await Promise.all([
            StorePurchase.find(filters)
                .populate('patient', 'firstName lastName email')
                .populate('items.inventoryItem', 'name category unit quantity')
                .sort({ purchasedAt: sortOrder })
                .skip(skip)
                .limit(limit),
            StorePurchase.countDocuments(filters),
        ]);

        return res.status(200).json(buildPaginatedResponse(purchases, total, page, limit));
    } catch (error) {
        console.error('Error fetching doctor patient purchases:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminInventoryMovements = async (req: AuthRequest, res: Response) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
        const search = String(req.query.search || '').trim().toLowerCase();

        const [dispensedPrescriptions, storePurchases] = await Promise.all([
            Prescription.find({ status: PrescriptionStatus.DISPENSED })
                .select('patient doctor medications dispensedAt')
                .populate('patient', 'firstName lastName email')
                .populate('doctor', 'firstName lastName email')
                .populate('medications.inventoryItem', 'name category unit')
                .sort({ dispensedAt: -1 })
                .limit(300),
            StorePurchase.find({})
                .select('patient items purchasedAt')
                .populate('patient', 'firstName lastName email')
                .sort({ purchasedAt: -1 })
                .limit(300),
        ]);

        const prescriptionMovements = dispensedPrescriptions.flatMap((prescription) => {
            const patient = prescription.patient as unknown as { firstName?: string; lastName?: string; email?: string };
            const doctor = prescription.doctor as unknown as { firstName?: string; lastName?: string; email?: string };

            return prescription.medications
                .filter((medication) => medication.inventoryItem)
                .map((medication) => {
                    const inventory = medication.inventoryItem as unknown as {
                        name?: string;
                        category?: 'medicine' | 'equipment' | 'supplies';
                        unit?: string;
                    };

                    return {
                        type: 'prescription_dispense',
                        occurredAt: prescription.dispensedAt || prescription.updatedAt,
                        referenceId: String(prescription._id),
                        patient,
                        doctor,
                        itemName: medication.medicationName || inventory?.name || 'Unknown item',
                        category: inventory?.category || 'medicine',
                        quantity: medication.quantity,
                        unit: inventory?.unit || 'unit',
                    };
                });
        });

        const purchaseMovements = storePurchases.flatMap((purchase) => {
            const patient = purchase.patient as unknown as { firstName?: string; lastName?: string; email?: string };

            return purchase.items.map((item) => ({
                type: 'store_purchase',
                occurredAt: purchase.purchasedAt,
                referenceId: String(purchase._id),
                patient,
                doctor: null,
                itemName: item.itemName,
                category: item.itemCategory,
                quantity: item.quantity,
                unit: item.unit,
            }));
        });

        const merged = [...prescriptionMovements, ...purchaseMovements]
            .filter((movement) => {
                if (!search) return true;

                const searchable = [
                    movement.itemName,
                    movement.type,
                    movement.patient?.firstName,
                    movement.patient?.lastName,
                    movement.patient?.email,
                    movement.doctor?.firstName,
                    movement.doctor?.lastName,
                    movement.doctor?.email,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return searchable.includes(search);
            })
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .slice(0, limit);

        return res.status(200).json({ data: merged, total: merged.length, limit });
    } catch (error) {
        console.error('Error fetching inventory movements:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
