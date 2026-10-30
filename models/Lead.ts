import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILeadNote {
  text: string;
  staffId: mongoose.Types.ObjectId;
  date: Date;
}

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Converted' | 'Lost';
export type LeadSource = 'Walk-in' | 'Website' | 'Referral' | 'Social Media' | 'Cold Call' | 'Other';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  storeId: mongoose.Types.ObjectId;
  assignedStaffId?: mongoose.Types.ObjectId | null;
  source: LeadSource;
  interest?: string;
  status: LeadStatus;
  estimatedValue?: number;
  followUpDate?: Date;
  notes: ILeadNote[];
  convertedCustomerId?: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    source: {
      type: String,
      enum: ['Walk-in', 'Website', 'Referral', 'Social Media', 'Cold Call', 'Other'],
      default: 'Walk-in',
    },
    interest: { type: String, default: '' },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Converted', 'Lost'],
      default: 'New',
      index: true,
    },
    estimatedValue: { type: Number, default: 0 },
    followUpDate: { type: Date, index: true },
    notes: [
      {
        text: { type: String, required: true },
        staffId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        date: { type: Date, default: Date.now },
      },
    ],
    convertedCustomerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

LeadSchema.index({ storeId: 1, status: 1 });
LeadSchema.index({ assignedStaffId: 1, followUpDate: 1 });

export const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
