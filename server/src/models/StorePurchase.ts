import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User.js';
import { IInventoryItem } from './InventoryItem.js';

export interface IStorePurchaseItem {
    inventoryItem: IInventoryItem['_id'];
    itemName: string;
    itemCategory: 'medicine' | 'equipment' | 'supplies';
    quantity: number;
    unit: string;
}

export interface IStorePurchase extends Document {
    patient: IUser['_id'];
    items: IStorePurchaseItem[];
    notes?: string;
    purchasedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StorePurchaseItemSchema = new Schema<IStorePurchaseItem>(
    {
        inventoryItem: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        itemName: { type: String, required: true, trim: true },
        itemCategory: {
            type: String,
            enum: ['medicine', 'equipment', 'supplies'],
            required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        unit: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const StorePurchaseSchema = new Schema<IStorePurchase>(
    {
        patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        items: {
            type: [StorePurchaseItemSchema],
            required: true,
            validate: {
                validator: (value: IStorePurchaseItem[]) => Array.isArray(value) && value.length > 0,
                message: 'At least one store item is required',
            },
        },
        notes: { type: String, trim: true },
        purchasedAt: { type: Date, default: () => new Date() },
    },
    {
        timestamps: true,
    }
);

StorePurchaseSchema.index({ patient: 1, purchasedAt: -1 });
StorePurchaseSchema.index({ purchasedAt: -1 });

export const StorePurchase = mongoose.model<IStorePurchase>('StorePurchase', StorePurchaseSchema);
