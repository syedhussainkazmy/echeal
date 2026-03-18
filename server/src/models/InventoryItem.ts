import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryItem extends Document {
    name: string;
    category: 'medicine' | 'equipment' | 'supplies';
    quantity: number;
    unit: string;
    lowStockThreshold: number;
    supplierName: string;
    lastRestocked: Date;
}

const InventoryItemSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        category: {
            type: String,
            enum: ['medicine', 'equipment', 'supplies'],
            required: true,
        },
        quantity: { type: Number, required: true, min: 0 },
        unit: { type: String, required: true },
        lowStockThreshold: { type: Number, default: 10 },
        supplierName: { type: String },
        lastRestocked: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

InventoryItemSchema.index({ category: 1, name: 1 });
InventoryItemSchema.index({ supplierName: 1 });

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
