import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomerInteraction {
  note: string;
  staffId: mongoose.Types.ObjectId;
  date: Date;
  type: 'Call' | 'Meeting' | 'Email' | 'Store Visit' | 'Note';
}

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  storeId: mongoose.Types.ObjectId;
  assignedStaffId?: mongoose.Types.ObjectId | null;
  status: 'Active' | 'Inactive' | 'Lead';
  notes?: string;
  interactions: ICustomerInteraction[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, default: '' },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Lead'],
      default: 'Active',
      index: true,
    },
    notes: { type: String, default: '' },
    interactions: [
      {
        note: { type: String, required: true },
        staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: ['Call', 'Meeting', 'Email', 'Store Visit', 'Note'],
          default: 'Note',
        },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound index to search customers by store and phone quickly
CustomerSchema.index({ storeId: 1, phone: 1 });

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);
