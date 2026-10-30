import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  discount: number; // in percentage or fixed value, let's store amount
  taxAmount: number;
  total: number;
}

export type PaymentMethod = 'Cash' | 'Online' | 'UPI' | 'Card' | 'Other';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partially Refunded' | 'Refunded' | 'Cancelled';

export interface ISale extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  storeId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId | null;
  customerName?: string;
  customerPhone?: string;
  cashierId: mongoose.Types.ObjectId;
  items: ISaleItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  idempotencyKey?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    taxRate: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null, index: true },
    customerName: { type: String, default: 'Walk-in Customer' },
    customerPhone: { type: String, default: '' },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [SaleItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Online', 'UPI', 'Card', 'Other'],
      default: 'Cash',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Partially Refunded', 'Refunded', 'Cancelled'],
      default: 'Paid',
      index: true,
    },
    idempotencyKey: { type: String, index: true, sparse: true },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySignature: { type: String },
    stripeSessionId: { type: String, index: true, sparse: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

SaleSchema.index({ storeId: 1, createdAt: -1 });

export const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);
