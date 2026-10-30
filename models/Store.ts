import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStore extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  isActive: boolean;
  settings: {
    maxDiscountPercent: number;
    refundRequiresApproval: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'India' },
    },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true, index: true },
    settings: {
      maxDiscountPercent: { type: Number, default: 20 },
      refundRequiresApproval: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const Store: Model<IStore> = mongoose.models.Store || mongoose.model<IStore>('Store', StoreSchema);
