import mongoose, { Schema, Document, Model } from 'mongoose';
import { RoleName } from '@/lib/auth/permissions';

export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  name: RoleName;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ['Admin', 'Store Manager', 'Staff', 'Counter'],
      index: true,
    },
    description: { type: String, default: '' },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Role: Model<IRole> = mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);
