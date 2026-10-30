import { connectDB } from '@/lib/db/mongodb';
import { AuditLog } from '@/models/AuditLog';
import { Notification, NotificationType } from '@/models/Notification';
import mongoose from 'mongoose';

export interface AuditLogOptions {
  action: string;
  module: string;
  performedBy?: string | mongoose.Types.ObjectId | null;
  performedByName?: string;
  performedByEmail?: string;
  storeId?: string | mongoose.Types.ObjectId | null;
  details?: Record<string, any>;
  ipAddress?: string;
}

export async function logAuditEvent(options: AuditLogOptions): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      action: options.action,
      module: options.module,
      performedBy: options.performedBy ? new mongoose.Types.ObjectId(options.performedBy.toString()) : null,
      performedByName: options.performedByName || 'System',
      performedByEmail: options.performedByEmail || '',
      storeId: options.storeId ? new mongoose.Types.ObjectId(options.storeId.toString()) : null,
      details: options.details || {},
      ipAddress: options.ipAddress || '',
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error);
  }
}

export interface NotificationOptions {
  recipientId?: string | mongoose.Types.ObjectId | null;
  storeId?: string | mongoose.Types.ObjectId | null;
  roleTarget?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}

export async function createNotification(options: NotificationOptions): Promise<void> {
  try {
    await connectDB();
    await Notification.create({
      recipientId: options.recipientId ? new mongoose.Types.ObjectId(options.recipientId.toString()) : null,
      storeId: options.storeId ? new mongoose.Types.ObjectId(options.storeId.toString()) : null,
      roleTarget: options.roleTarget || null,
      title: options.title,
      message: options.message,
      type: options.type,
      link: options.link || '',
      isRead: false,
    });
  } catch (error) {
    console.error('[Notification] Failed to create notification:', error);
  }
}
