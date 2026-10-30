import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'low_stock'
  | 'task_assigned'
  | 'task_overdue'
  | 'lead_followup'
  | 'approval_pending'
  | 'system';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId | null;
  storeId?: mongoose.Types.ObjectId | null;
  roleTarget?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null, index: true },
    roleTarget: { type: String, default: null, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['low_stock', 'task_assigned', 'task_overdue', 'lead_followup', 'approval_pending', 'system'],
      default: 'system',
      index: true,
    },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
