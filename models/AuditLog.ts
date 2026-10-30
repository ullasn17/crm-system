import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: string;
  module: string;
  performedBy?: mongoose.Types.ObjectId | null;
  performedByName?: string;
  performedByEmail?: string;
  storeId?: mongoose.Types.ObjectId | null;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    performedByName: { type: String, default: 'System' },
    performedByEmail: { type: String, default: '' },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ module: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
