import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPermission extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  label: string;
  module: string;
  description: string;
}

const PermissionSchema = new Schema<IPermission>(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    module: { type: String, required: true, index: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Permission: Model<IPermission> =
  mongoose.models.Permission || mongoose.model<IPermission>('Permission', PermissionSchema);
