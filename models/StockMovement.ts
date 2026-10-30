import mongoose, { Schema, Document, Model } from 'mongoose';

export type MovementType = 'Receive' | 'Sale' | 'Adjustment' | 'Return' | 'Transfer';

export interface IStockMovement extends Document {
  _id: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  change: number; // positive or negative
  movementType: MovementType;
  reason: string;
  referenceId?: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    change: { type: Number, required: true },
    movementType: {
      type: String,
      enum: ['Receive', 'Sale', 'Adjustment', 'Return', 'Transfer'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    referenceId: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockMovementSchema.index({ storeId: 1, createdAt: -1 });

export const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
