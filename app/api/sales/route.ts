import { NextRequest } from 'next/server';
import { requirePermission, AuthError } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { Sale, ISaleItem } from '@/models/Sale';
import { Product } from '@/models/Product';
import { Inventory } from '@/models/Inventory';
import { StockMovement } from '@/models/StockMovement';
import { Store } from '@/models/Store';
import { Customer } from '@/models/Customer';
import { logAuditEvent } from '@/lib/audit/audit';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  storeId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive('Quantity must be at least 1'),
        discountPercent: z.number().min(0).max(100).default(0),
      })
    )
    .min(1, 'At least one item is required in the sale'),
  paymentMethod: z.enum(['Cash', 'Online', 'UPI', 'Card', 'Other']).default('Cash'),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  stripeSessionId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission('sales.read_store', req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const invoiceNumber = searchParams.get('invoice');
    const paymentMethod = searchParams.get('paymentMethod');
    const paymentStatus = searchParams.get('paymentStatus');
    const storeIdParam = searchParams.get('storeId');
    const search = searchParams.get('search');

    const filter: Record<string, any> = {};

    if (session.role === 'Counter') {
      filter.storeId = session.storeId;
    } else if (session.role === 'Store Manager') {
      filter.storeId = session.storeId;
    } else if (session.role === 'Admin') {
      if (storeIdParam) filter.storeId = storeIdParam;
    } else {
      filter.storeId = session.storeId;
    }

    if (invoiceNumber) {
      filter.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };
    }

    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const sales = await Sale.find(filter)
      .populate('storeId', 'name code')
      .populate('cashierId', 'name email')
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return successResponse({ sales });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission('sales.create', req);
    const body = await req.json();
    const data = CreateSaleSchema.parse(body);

    await connectDB();

    let targetStoreId = data.storeId;
    if (session.role !== 'Admin') {
      targetStoreId = session.storeId || undefined;
    }

    if (!targetStoreId) {
      return errorResponse(new Error('Store assignment is required for sales.'));
    }

    // Idempotency check: prevent duplicate transactions
    if (data.idempotencyKey) {
      const existingSale = await Sale.findOne({ idempotencyKey: data.idempotencyKey });
      if (existingSale) {
        return successResponse({ sale: existingSale, duplicatePrevented: true });
      }
    }

    const store = await Store.findById(targetStoreId);
    if (!store || !store.isActive) {
      return errorResponse(new Error('Store is not active or does not exist.'));
    }

    // Resolve Customer info if provided
    let customerName = data.customerName || 'Walk-in Customer';
    let customerPhone = data.customerPhone || '';
    if (data.customerId) {
      const customerDoc = await Customer.findById(data.customerId);
      if (customerDoc) {
        customerName = customerDoc.name;
        customerPhone = customerDoc.phone;
      }
    }

    // Server-side validation of stock and authoritative pricing calculation
    const processedItems: ISaleItem[] = [];
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const maxAllowedDiscount = store.settings?.maxDiscountPercent ?? 20;

    for (const item of data.items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive) {
        return errorResponse(new Error(`Product '${product?.name || item.productId}' is inactive or not found.`));
      }

      // Concurrency-safe stock verification & deduction
      const invRecord = await Inventory.findOneAndUpdate(
        {
          storeId: targetStoreId,
          productId: product._id,
          quantity: { $gte: item.quantity },
        },
        { $inc: { quantity: -item.quantity } },
        { returnDocument: 'after' }
      );

      if (!invRecord) {
        const available = await Inventory.findOne({ storeId: targetStoreId, productId: product._id });
        return errorResponse(
          new Error(
            `Insufficient stock for '${product.name}'. Available: ${available?.quantity ?? 0}, Requested: ${item.quantity}`
          )
        );
      }

      // Record stock movement for the sale
      await StockMovement.create({
        storeId: targetStoreId,
        productId: product._id,
        change: -item.quantity,
        movementType: 'Sale',
        reason: 'Counter Point of Sale purchase',
        performedBy: session.userId,
      });

      // Price calculation
      const unitPrice = product.price;
      const rawItemSubtotal = unitPrice * item.quantity;

      // Cap discount
      const effectiveDiscountPercent = Math.min(item.discountPercent, maxAllowedDiscount);
      const itemDiscount = Math.round((rawItemSubtotal * effectiveDiscountPercent) / 100);
      const discountedSubtotal = rawItemSubtotal - itemDiscount;

      // Tax calculation
      const itemTax = Math.round((discountedSubtotal * product.taxRate) / 100);
      const itemFinalTotal = discountedSubtotal + itemTax;

      subtotal += rawItemSubtotal;
      discountTotal += itemDiscount;
      taxTotal += itemTax;

      processedItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        unitPrice,
        quantity: item.quantity,
        taxRate: product.taxRate,
        discount: itemDiscount,
        taxAmount: itemTax,
        total: itemFinalTotal,
      });
    }

    const grandTotal = subtotal - discountTotal + taxTotal;

    // Generate unique invoice number
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const invoiceNumber = `INV-${store.code}-${timestamp}-${randomSuffix}`;

    const sale = await Sale.create({
      invoiceNumber,
      storeId: targetStoreId,
      customerId: data.customerId || null,
      customerName,
      customerPhone,
      cashierId: session.userId,
      items: processedItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paymentMethod: data.paymentMethod,
      paymentStatus: 'Paid',
      idempotencyKey: data.idempotencyKey,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature,
      stripeSessionId: data.stripeSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      notes: data.notes || '',
    });

    // Update referenceId on movements
    await StockMovement.updateMany(
      { storeId: targetStoreId, performedBy: session.userId, movementType: 'Sale', referenceId: { $exists: false } },
      { $set: { referenceId: invoiceNumber } }
    );

    await logAuditEvent({
      action: 'SALE_COMPLETED',
      module: 'Sales',
      performedBy: session.userId,
      performedByName: session.name,
      performedByEmail: session.email,
      storeId: targetStoreId,
      details: {
        invoiceNumber,
        grandTotal,
        paymentMethod: data.paymentMethod,
        itemsCount: processedItems.length,
      },
    });

    return successResponse({ sale }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
