import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReturnItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  reason: string;
  productPhoto?: string;
}

export type ReturnStatus = 'Pending' | 'Approved' | 'Rejected';

export interface IReturnRequest extends Document {
  _id: mongoose.Types.ObjectId;
  saleId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  storeId: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  items: IReturnItem[];
  productPhoto?: string;
  totalRefundAmount: number;
  status: ReturnStatus;
  restockItems: boolean;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date;
  reviewerComments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    refundAmount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    productPhoto: { type: String, default: '' },
  },
  { _id: false }
);

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
    invoiceNumber: { type: String, required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [ReturnItemSchema], required: true },
    productPhoto: { type: String, default: '' },
    totalRefundAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    restockItems: { type: Boolean, default: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date },
    reviewerComments: { type: String, default: '' },
  },
  { timestamps: true }
);

ReturnRequestSchema.index({ storeId: 1, status: 1 });

export const ReturnRequest: Model<IReturnRequest> =
  mongoose.models.ReturnRequest ||
  mongoose.model<IReturnRequest>('ReturnRequest', ReturnRequestSchema);
