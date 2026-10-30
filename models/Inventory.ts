import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInventory extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  reorderThreshold: number;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    reorderThreshold: { type: Number, default: 10, min: 0 },
  },
  { timestamps: true }
);

// Unique compound index so each product has exactly one inventory record per store
InventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });

export const Inventory: Model<IInventory> =
  mongoose.models.Inventory || mongoose.model<IInventory>('Inventory', InventorySchema);
