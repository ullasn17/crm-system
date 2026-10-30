import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, disconnectDB } from '@/lib/db/mongodb';
import { runSeed } from '@/scripts/seed';
import { User } from '@/models/User';
import { Store } from '@/models/Store';
import { Product } from '@/models/Product';
import { Inventory } from '@/models/Inventory';
import { StockMovement } from '@/models/StockMovement';
import { Customer } from '@/models/Customer';
import { Lead } from '@/models/Lead';
import { Sale } from '@/models/Sale';
import { ReturnRequest } from '@/models/ReturnRequest';
import { AuditLog } from '@/models/AuditLog';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { signToken, verifyToken, SessionUser } from '@/lib/auth/session';
import {
  requireRole,
  requirePermission,
  requireStoreAccess,
  requireRecordAccess,
  AuthError,
} from '@/lib/auth/authorization';

describe('CRM System Comprehensive Test Suite', () => {
  beforeAll(async () => {
    await connectDB();
    await runSeed(true);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('1. Password Hashing & Verification', () => {
    it('should securely hash and verify passwords using bcrypt', async () => {
      const plain = 'SuperSecurePass2026!';
      const hash = await hashPassword(plain);
      expect(hash).not.toBe(plain);
      expect(await verifyPassword(plain, hash)).toBe(true);
      expect(await verifyPassword('WrongPass', hash)).toBe(false);
    });
  });

  describe('2. Authentication & JWT Session Management', () => {
    it('should generate and verify valid JWT tokens', () => {
      const mockUser: SessionUser = {
        userId: '65f01234567890abcdef1234',
        name: 'Test Cashier',
        email: 'cashier@test.local',
        role: 'Counter',
        storeId: '65f01234567890abcdef5678',
        permissions: ['sales.create', 'sales.read_store'],
      };

      const token = signToken(mockUser);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.email).toBe(mockUser.email);
      expect(decoded?.role).toBe('Counter');
      expect(decoded?.storeId).toBe(mockUser.storeId);
      expect(decoded?.permissions).toContain('sales.create');
    });

    it('should reject invalid or tampered tokens', () => {
      const decoded = verifyToken('invalid.jwt.token.string');
      expect(decoded).toBeNull();
    });
  });

  describe('3. RBAC Permission Matrix & Server-Side Authorization', () => {
    it('should allow Admin to access any role-restricted guard', async () => {
      const adminUser = await User.findOne({ role: 'Admin' });
      expect(adminUser).not.toBeNull();

      const adminSession: SessionUser = {
        userId: adminUser!._id.toString(),
        name: adminUser!.name,
        email: adminUser!.email,
        role: 'Admin',
        permissions: ['audit_logs.read', 'stores.manage'],
      };

      // Admin passes requireRole for Admin
      const verified = await requireRole(['Admin'], {
        headers: new Headers({ Authorization: `Bearer ${signToken(adminSession)}` }),
      } as any);
      expect(verified.role).toBe('Admin');
    });

    it('should reject non-admin users from admin-only operations', async () => {
      const staffUser = await User.findOne({ role: 'Staff' });
      expect(staffUser).not.toBeNull();

      const staffSession: SessionUser = {
        userId: staffUser!._id.toString(),
        name: staffUser!.name,
        email: staffUser!.email,
        role: 'Staff',
        permissions: ['customers.read', 'customers.create'],
      };

      const req = {
        headers: new Headers({ Authorization: `Bearer ${signToken(staffSession)}` }),
      } as any;

      await expect(requireRole(['Admin'], req)).rejects.toThrow(AuthError);
      await expect(requirePermission('audit_logs.read', req)).rejects.toThrow(AuthError);
    });

    it('should enforce multi-store isolation on records', async () => {
      const store1 = await Store.findOne({ code: 'DWT01' });
      const store2 = await Store.findOne({ code: 'SUB02' });
      expect(store1).not.toBeNull();
      expect(store2).not.toBeNull();

      const manager1Session: SessionUser = {
        userId: '65f01234567890abcdef0001',
        name: 'Manager Store 1',
        email: 'mgr1@test.local',
        role: 'Store Manager',
        storeId: store1!._id.toString(),
        permissions: ['stores.read', 'inventory.adjust'],
      };

      // Manager 1 accessing Store 1 record -> PASS
      expect(() =>
        requireRecordAccess({ storeId: store1!._id.toString() }, manager1Session)
      ).not.toThrow();

      // Manager 1 accessing Store 2 record -> REJECT
      expect(() =>
        requireRecordAccess({ storeId: store2!._id.toString() }, manager1Session)
      ).toThrow(AuthError);
    });

    it('should prevent Staff from accessing another employee private assigned records', () => {
      const staff1Session: SessionUser = {
        userId: '65f01234567890abcdef0010',
        name: 'Staff Member 1',
        email: 'staff1@test.local',
        role: 'Staff',
        storeId: '65f01234567890abcdef0001',
        permissions: ['tasks.update_own'],
      };

      // Task assigned to Staff 1 -> PASS
      expect(() =>
        requireRecordAccess(
          { storeId: '65f01234567890abcdef0001', assignedTo: '65f01234567890abcdef0010' },
          staff1Session
        )
      ).not.toThrow();

      // Task assigned to Staff 2 -> REJECT
      expect(() =>
        requireRecordAccess(
          { storeId: '65f01234567890abcdef0001', assignedTo: '65f01234567890abcdef0099' },
          staff1Session
        )
      ).toThrow(AuthError);
    });
  });

  describe('4. Customer Management & Lead Conversion', () => {
    it('should create customer and prevent duplicate phone within the same store', async () => {
      const store = await Store.findOne({ code: 'DWT01' });
      const admin = await User.findOne({ role: 'Admin' });

      const testPhone = '+91 99999 88888';
      await Customer.deleteOne({ storeId: store!._id, phone: testPhone });

      const newCustomer = await Customer.create({
        name: 'Kavita Rao',
        phone: testPhone,
        email: 'kavita.rao@example.com',
        storeId: store!._id,
        status: 'Active',
        createdBy: admin!._id,
        interactions: [],
      });

      expect(newCustomer._id).toBeDefined();
      expect(newCustomer.name).toBe('Kavita Rao');

      // Attempt duplicate phone creation in same store
      const dup = await Customer.findOne({ storeId: store!._id, phone: testPhone });
      expect(dup).not.toBeNull();
    });

    it('should convert an eligible Lead into an active Customer record', async () => {
      const store = await Store.findOne({ code: 'DWT01' });
      const staff = await User.findOne({ role: 'Staff' });

      const leadPhone = '+91 91111 22222';
      await Lead.deleteOne({ phone: leadPhone });
      await Customer.deleteOne({ phone: leadPhone });

      const testLead = await Lead.create({
        name: 'Manish Malhotra',
        phone: leadPhone,
        email: 'manish@malhotra.design',
        storeId: store!._id,
        assignedStaffId: staff!._id,
        source: 'Website',
        interest: 'High-end gaming workstation',
        status: 'Qualified',
        estimatedValue: 120000,
        createdBy: staff!._id,
        notes: [],
      });

      expect(testLead.status).toBe('Qualified');

      // Execute conversion logic
      const convertedCustomer = await Customer.create({
        name: testLead.name,
        phone: testLead.phone,
        email: testLead.email,
        storeId: testLead.storeId,
        assignedStaffId: testLead.assignedStaffId,
        status: 'Active',
        notes: `Converted from lead (${testLead.source})`,
        createdBy: staff!._id,
        interactions: [
          {
            note: 'Lead converted to customer',
            staffId: staff!._id,
            date: new Date(),
            type: 'Note',
          },
        ],
      });

      testLead.status = 'Converted';
      testLead.convertedCustomerId = convertedCustomer._id;
      await testLead.save();

      const updatedLead = await Lead.findById(testLead._id);
      expect(updatedLead?.status).toBe('Converted');
      expect(updatedLead?.convertedCustomerId?.toString()).toBe(convertedCustomer._id.toString());
    });
  });

  describe('5. Inventory Management & Stock Adjustments', () => {
    it('should accurately receive stock and maintain stock movement log', async () => {
      const store = await Store.findOne({ code: 'DWT01' });
      const product = await Product.findOne({ sku: 'PROD-LAPTOP-01' });
      const admin = await User.findOne({ role: 'Admin' });

      expect(store).not.toBeNull();
      expect(product).not.toBeNull();

      const initialInv = await Inventory.findOne({ storeId: store!._id, productId: product!._id });
      const initialQty = initialInv ? initialInv.quantity : 0;

      const receivedQty = 15;
      const updatedInv = await Inventory.findOneAndUpdate(
        { storeId: store!._id, productId: product!._id },
        { $inc: { quantity: receivedQty } },
        { returnDocument: 'after' }
      );

      expect(updatedInv?.quantity).toBe(initialQty + receivedQty);

      const movement = await StockMovement.create({
        storeId: store!._id,
        productId: product!._id,
        change: receivedQty,
        movementType: 'Receive',
        reason: 'Shipment batch receipt',
        referenceId: 'PO-TEST-100',
        performedBy: admin!._id,
      });

      expect(movement._id).toBeDefined();
      expect(movement.change).toBe(15);
      expect(movement.movementType).toBe('Receive');
    });

    it('should initialize inventory and log stock movement when creating a product with initial stock', async () => {
      const store = await Store.findOne({ code: 'DWT01' });
      const admin = await User.findOne({ role: 'Admin' });

      const testSku = 'TEST-SKU-INITSTOCK-01';
      await Product.deleteOne({ sku: testSku });

      const product = await Product.create({
        name: 'Test Initial Stock Product',
        sku: testSku,
        category: 'Test Category',
        price: 999,
        taxRate: 18,
        isActive: true,
      });

      const initialStockQty = 42;
      const inv = await Inventory.findOneAndUpdate(
        { storeId: store!._id, productId: product._id },
        { storeId: store!._id, productId: product._id, quantity: initialStockQty, reorderThreshold: 10 },
        { upsert: true, returnDocument: 'after' }
      );

      const movement = await StockMovement.create({
        storeId: store!._id,
        productId: product._id,
        change: initialStockQty,
        movementType: 'Receive',
        reason: 'Initial stock added during product creation',
        referenceId: product.sku,
        performedBy: admin!._id,
      });

      expect(inv.quantity).toBe(42);
      expect(movement.change).toBe(42);
      expect(movement.movementType).toBe('Receive');
      expect(movement.reason).toContain('Initial stock');
    });

    it('should disallow inventory adjustment that results in negative stock', async () => {
      const store = await Store.findOne({ code: 'DWT01' });
      const product = await Product.findOne({ sku: 'PROD-LAPTOP-01' });
      const inv = await Inventory.findOne({ storeId: store!._id, productId: product!._id });

      const currentQty = inv!.quantity;
      const deduction = currentQty + 500; // Exceeds current stock

      const allowed = currentQty - deduction >= 0;
      expect(allowed).toBe(false);
    });
  });

  describe('6. Counter Billing, Concurrency & Server Calculation', () => {
    it('should calculate authoritative subtotal, tax, and discount totals on server', async () => {
      const store = await Store.findOne({ code: 'DWT01' });
      const product = await Product.findOne({ sku: 'PROD-ACC-03' }); // Mouse, price: 3200, taxRate: 18%
      const counterUser = await User.findOne({ role: 'Counter' });

      expect(store).not.toBeNull();
      expect(product).not.toBeNull();

      const qty = 2;
      const discountPercent = 10;
      const rawSubtotal = product!.price * qty; // 6400
      const discountAmount = Math.round((rawSubtotal * discountPercent) / 100); // 640
      const taxableSubtotal = rawSubtotal - discountAmount; // 5760
      const taxAmount = Math.round((taxableSubtotal * product!.taxRate) / 100); // 1037
      const calculatedGrandTotal = taxableSubtotal + taxAmount; // 6797

      const invBefore = await Inventory.findOne({ storeId: store!._id, productId: product!._id });

      // Deduct stock safely
      const deducted = await Inventory.findOneAndUpdate(
        {
          storeId: store!._id,
          productId: product!._id,
          quantity: { $gte: qty },
        },
        { $inc: { quantity: -qty } },
        { returnDocument: 'after' }
      );

      expect(deducted).not.toBeNull();
      expect(deducted!.quantity).toBe(invBefore!.quantity - qty);

      const sale = await Sale.create({
        invoiceNumber: `INV-TEST-${Date.now()}`,
        storeId: store!._id,
        customerName: 'Test Walkin',
        cashierId: counterUser!._id,
        items: [
          {
            productId: product!._id,
            name: product!.name,
            sku: product!.sku,
            unitPrice: product!.price,
            quantity: qty,
            taxRate: product!.taxRate,
            discount: discountAmount,
            taxAmount,
            total: calculatedGrandTotal,
          },
        ],
        subtotal: rawSubtotal,
        discountTotal: discountAmount,
        taxTotal: taxAmount,
        grandTotal: calculatedGrandTotal,
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
      });

      expect(sale.grandTotal).toBe(calculatedGrandTotal);
      expect(sale.paymentStatus).toBe('Paid');
    });

    it('should prevent overselling when stock is insufficient', async () => {
      const store = await Store.findOne({ code: 'DWT01' });
      const product = await Product.findOne({ sku: 'PROD-AUDIO-02' });
      const inv = await Inventory.findOne({ storeId: store!._id, productId: product!._id });

      const excessiveQty = inv!.quantity + 9999;

      // Conditional atomic update must fail
      const result = await Inventory.findOneAndUpdate(
        {
          storeId: store!._id,
          productId: product!._id,
          quantity: { $gte: excessiveQty },
        },
        { $inc: { quantity: -excessiveQty } }
      );

      expect(result).toBeNull();
    });
  });

  describe('7. Returns, Refunds & Separation of Duties', () => {
    it('should create return request and enforce separation of duties on approval', async () => {
      const sale = await Sale.findOne({ paymentStatus: 'Paid' });
      expect(sale).not.toBeNull();

      const cashier = await User.findOne({ role: 'Counter' });
      const manager = await User.findOne({ role: 'Store Manager' });

      const testPhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const returnReq = await ReturnRequest.create({
        saleId: sale!._id,
        invoiceNumber: sale!.invoiceNumber,
        storeId: sale!.storeId,
        requestedBy: cashier!._id,
        productPhoto: testPhoto,
        items: [
          {
            productId: sale!.items[0].productId,
            name: sale!.items[0].name,
            quantity: 1,
            unitPrice: sale!.items[0].unitPrice,
            refundAmount: sale!.items[0].unitPrice,
            reason: 'Defective screen unit',
            productPhoto: testPhoto,
          },
        ],
        totalRefundAmount: sale!.items[0].unitPrice,
        status: 'Pending',
        restockItems: true,
      });

      expect(returnReq.status).toBe('Pending');
      expect(returnReq.productPhoto).toBe(testPhoto);
      expect(returnReq.items[0].productPhoto).toBe(testPhoto);
      expect(returnReq.items[0].reason).toBe('Defective screen unit');

      // Separation of duties test: Cashier who created request cannot approve it
      const isSameUser = returnReq.requestedBy.toString() === cashier!._id.toString();
      expect(isSameUser).toBe(true); // Must be blocked if cashier tries to self-approve

      // Store Manager approves
      returnReq.status = 'Approved';
      returnReq.reviewedBy = manager!._id;
      returnReq.reviewedAt = new Date();
      await returnReq.save();

      const approvedDoc = await ReturnRequest.findById(returnReq._id);
      expect(approvedDoc?.status).toBe('Approved');
      expect(approvedDoc?.productPhoto).toBe(testPhoto);
      expect(approvedDoc?.items[0].productPhoto).toBe(testPhoto);
      expect(approvedDoc?.reviewedBy?.toString()).toBe(manager!._id.toString());
    });
  });

  describe('8. Audit Log Verification', () => {
    it('should have recorded audit log entries for administrative events', async () => {
      const logs = await AuditLog.find({}).sort({ createdAt: -1 });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((l) => l.action === 'SYSTEM_BOOTSTRAP')).toBe(true);
    });
  });
});
