import mongoose, { Schema, Document, Model } from 'mongoose';
import { RoleName } from '@/lib/auth/permissions';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: RoleName;
  storeId?: mongoose.Types.ObjectId | null;
  customPermissions?: string[];
  isActive: boolean;
  phone?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ['Admin', 'Store Manager', 'Staff', 'Counter'],
      index: true,
    },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null, index: true },
    customPermissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    phone: { type: String, trim: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Prevent re-compilation in development
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
