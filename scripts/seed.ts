import { connectDB, disconnectDB } from '../lib/db/mongodb';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { Store } from '../models/Store';
import { ProductCategory } from '../models/ProductCategory';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { StockMovement } from '../models/StockMovement';
import { Customer } from '../models/Customer';
import { Lead } from '../models/Lead';
import { Task } from '../models/Task';
import { Sale } from '../models/Sale';
import { AuditLog } from '../models/AuditLog';
import { hashPassword } from '../lib/auth/password';
import { ALL_PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, RoleName } from '../lib/auth/permissions';

export async function runSeed(isTest = false) {
  console.log('--- Starting CRM Seed & Bootstrap Process ---');
  await connectDB();

  // 1. Seed Permissions
  console.log('Seeding Permissions...');
  for (const p of ALL_PERMISSIONS) {
    await Permission.findOneAndUpdate(
      { key: p.key },
      { key: p.key, label: p.label, module: p.module, description: p.description },
      { upsert: true, returnDocument: 'after' }
    );
  }

  // 2. Seed Roles
  console.log('Seeding Roles...');
  const roleNames: RoleName[] = ['Admin', 'Store Manager', 'Staff', 'Counter'];
  for (const name of roleNames) {
    await Role.findOneAndUpdate(
      { name },
      {
        name,
        description: `Standard system role for ${name}`,
        permissions: ROLE_DEFAULT_PERMISSIONS[name],
        isSystem: true,
      },
      { upsert: true, returnDocument: 'after' }
    );
  }

  // 3. Seed Demo Stores
  console.log('Seeding Stores...');
  const store1 = await Store.findOneAndUpdate(
    { code: 'DWT01' },
    {
      name: 'Downtown Flagship Store',
      code: 'DWT01',
      address: {
        street: '100 Metro Avenue, Suite 4B',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      phone: '+91 22 2490 1100',
      email: 'downtown@crmsystem.local',
      isActive: true,
      settings: { maxDiscountPercent: 25, refundRequiresApproval: true },
    },
    { upsert: true, returnDocument: 'after' }
  );

  const store2 = await Store.findOneAndUpdate(
    { code: 'SUB02' },
    {
      name: 'Tech City Branch',
      code: 'SUB02',
      address: {
        street: '42 Cyber Road, Sector 5',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560100',
        country: 'India',
      },
      phone: '+91 80 4122 8899',
      email: 'techcity@crmsystem.local',
      isActive: true,
      settings: { maxDiscountPercent: 20, refundRequiresApproval: true },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 4. Seed Admin & Role Users
  console.log('Seeding Users...');
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@crmsystem.local';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'AdminSecurePass123!';
  const defaultUserPassword = 'DemoUser123!';

  const adminHash = await hashPassword(adminPassword);
  const demoHash = await hashPassword(defaultUserPassword);

  const adminUser = await User.findOneAndUpdate(
    { email: adminEmail.toLowerCase() },
    {
      name: process.env.BOOTSTRAP_ADMIN_NAME || 'System Administrator',
      email: adminEmail.toLowerCase(),
      passwordHash: adminHash,
      role: 'Admin',
      storeId: null,
      isActive: true,
      phone: '+91 98000 00001',
    },
    { upsert: true, returnDocument: 'after' }
  );

  const managerUser = await User.findOneAndUpdate(
    { email: 'manager@crmsystem.local' },
    {
      name: 'Sarah Jenkins (Store Manager)',
      email: 'manager@crmsystem.local',
      passwordHash: demoHash,
      role: 'Store Manager',
      storeId: store1._id,
      isActive: true,
      phone: '+91 98000 00002',
    },
    { upsert: true, returnDocument: 'after' }
  );

  const staffUser = await User.findOneAndUpdate(
    { email: 'staff@crmsystem.local' },
    {
      name: 'Alex Rivera (Staff)',
      email: 'staff@crmsystem.local',
      passwordHash: demoHash,
      role: 'Staff',
      storeId: store1._id,
      isActive: true,
      phone: '+91 98000 00003',
    },
    { upsert: true, returnDocument: 'after' }
  );

  const counterUser = await User.findOneAndUpdate(
    { email: 'counter@crmsystem.local' },
    {
      name: 'David Chen (Counter Cashier)',
      email: 'counter@crmsystem.local',
      passwordHash: demoHash,
      role: 'Counter',
      storeId: store1._id,
      isActive: true,
      phone: '+91 98000 00004',
    },
    { upsert: true, returnDocument: 'after' }
  );

  // 5. Seed Product Categories
  console.log('Seeding Product Categories...');
  const catElectronics = await ProductCategory.findOneAndUpdate(
    { code: 'CAT-ELEC' },
    { name: 'Computers & Laptops', code: 'CAT-ELEC', description: 'Computing gear', isActive: true },
    { upsert: true, returnDocument: 'after' }
  );
  const catAudio = await ProductCategory.findOneAndUpdate(
    { code: 'CAT-AUDIO' },
    { name: 'Audio Equipment', code: 'CAT-AUDIO', description: 'Headphones and speakers', isActive: true },
    { upsert: true, returnDocument: 'after' }
  );
  const catAccessories = await ProductCategory.findOneAndUpdate(
    { code: 'CAT-ACC' },
    { name: 'Peripherals & Accessories', code: 'CAT-ACC', description: 'Mice, keyboards, hubs', isActive: true },
    { upsert: true, returnDocument: 'after' }
  );

  // 6. Seed Products
  console.log('Seeding Products...');
  const productsData = [
    {
      name: 'Pro Ultrabook 14" (Intel Core Ultra 7, 32GB RAM)',
      sku: 'PROD-LAPTOP-01',
      barcode: '8901234567810',
      category: catElectronics.name,
      description: 'High-performance ultra-portable workstation laptop',
      price: 85000,
      costPrice: 65000,
      taxRate: 18,
      isActive: true,
    },
    {
      name: 'QuietComfort Wireless ANC Headphones',
      sku: 'PROD-AUDIO-02',
      barcode: '8901234567827',
      category: catAudio.name,
      description: 'Premium active noise-cancelling wireless audio headset',
      price: 14500,
      costPrice: 9500,
      taxRate: 18,
      isActive: true,
    },
    {
      name: 'Ergonomic Precision Wireless Mouse',
      sku: 'PROD-ACC-03',
      barcode: '8901234567834',
      category: catAccessories.name,
      description: 'Multi-device Bluetooth optical ergonomic mouse',
      price: 3200,
      costPrice: 1900,
      taxRate: 18,
      isActive: true,
    },
    {
      name: 'Mechanical RGB Hot-Swap Keyboard',
      sku: 'PROD-ACC-04',
      barcode: '8901234567841',
      category: catAccessories.name,
      description: 'Tactile mechanical keyboard with sound-dampening foam',
      price: 6800,
      costPrice: 4200,
      taxRate: 18,
      isActive: true,
    },
    {
      name: '8-in-1 Aluminium USB-C Multiport Dock',
      sku: 'PROD-ACC-05',
      barcode: '8901234567858',
      category: catAccessories.name,
      description: '4K HDMI, Gigabit Ethernet, 100W PD passthrough',
      price: 2400,
      costPrice: 1400,
      taxRate: 18,
      isActive: true,
    },
  ];

  const createdProducts: any[] = [];
  for (const p of productsData) {
    const prod = await Product.findOneAndUpdate(
      { sku: p.sku },
      p,
      { upsert: true, returnDocument: 'after' }
    );
    createdProducts.push(prod);
  }

  // 7. Seed Inventory & Stock Movements
  console.log('Seeding Inventory for Stores...');
  for (const store of [store1, store2]) {
    for (const prod of createdProducts) {
      const initialQty = store.code === 'DWT01' ? 45 : 25;
      const inv = await Inventory.findOneAndUpdate(
        { storeId: store._id, productId: prod._id },
        {
          storeId: store._id,
          productId: prod._id,
          quantity: initialQty,
          reservedQuantity: 0,
          reorderThreshold: 10,
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Check if stock movement exists
      const existingMovement = await StockMovement.findOne({
        storeId: store._id,
        productId: prod._id,
        movementType: 'Receive',
      });

      if (!existingMovement) {
        await StockMovement.create({
          storeId: store._id,
          productId: prod._id,
          change: initialQty,
          movementType: 'Receive',
          reason: 'Initial warehouse replenishment',
          referenceId: 'PO-INITIAL-2026',
          performedBy: adminUser._id,
        });
      }
    }
  }

  // 8. Seed Customers
  console.log('Seeding Customers...');
  const customer1 = await Customer.findOneAndUpdate(
    { phone: '+91 98200 12345' },
    {
      name: 'Aarav Sharma',
      phone: '+91 98200 12345',
      email: 'aarav.sharma@example.com',
      address: '702 Skyline Tower, Worli, Mumbai',
      storeId: store1._id,
      assignedStaffId: staffUser._id,
      status: 'Active',
      notes: 'Corporate client looking for 10 office setups.',
      interactions: [
        {
          note: 'Discussed bulk discount for laptops and ergonomic accessories.',
          staffId: staffUser._id,
          date: new Date(),
          type: 'Meeting',
        },
      ],
      createdBy: staffUser._id,
    },
    { upsert: true, new: true }
  );

  const customer2 = await Customer.findOneAndUpdate(
    { phone: '+91 98200 54321' },
    {
      name: 'Priya Mehra',
      phone: '+91 98200 54321',
      email: 'priya.mehra@example.com',
      address: '15 Lotus Residency, Bandra West, Mumbai',
      storeId: store1._id,
      assignedStaffId: staffUser._id,
      status: 'Active',
      notes: 'VIP Retail customer. Prefers contactless UPI payments.',
      interactions: [
        {
          note: 'Purchased wireless ANC headphones on flagship visit.',
          staffId: staffUser._id,
          date: new Date(),
          type: 'Store Visit',
        },
      ],
      createdBy: staffUser._id,
    },
    { upsert: true, new: true }
  );

  // 9. Seed Leads
  console.log('Seeding Leads...');
  await Lead.findOneAndUpdate(
    { phone: '+91 98999 11223' },
    {
      name: 'Rohan Verma',
      phone: '+91 98999 11223',
      email: 'rohan.verma@techconsult.in',
      storeId: store1._id,
      assignedStaffId: staffUser._id,
      source: 'Website',
      interest: 'Ultrabook laptops for design agency',
      status: 'Qualified',
      estimatedValue: 255000,
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      notes: [
        {
          text: 'Requested quotation for 3 Pro Ultrabooks with accessories.',
          staffId: staffUser._id,
          date: new Date(),
        },
      ],
      createdBy: staffUser._id,
    },
    { upsert: true, new: true }
  );

  await Lead.findOneAndUpdate(
    { phone: '+91 98999 44556' },
    {
      name: 'Sunita Patel',
      phone: '+91 98999 44556',
      email: 'sunita.patel@biopharm.org',
      storeId: store1._id,
      assignedStaffId: staffUser._id,
      source: 'Referral',
      interest: 'Ergonomic input devices for data entry team',
      status: 'Proposal',
      estimatedValue: 65000,
      followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      notes: [
        {
          text: 'Sent demo mice and keyboard catalog via email.',
          staffId: staffUser._id,
          date: new Date(),
        },
      ],
      createdBy: staffUser._id,
    },
    { upsert: true, new: true }
  );

  // 10. Seed Tasks
  console.log('Seeding Tasks...');
  await Task.findOneAndUpdate(
    { title: 'Follow up with Rohan Verma on Ultrabook quote' },
    {
      title: 'Follow up with Rohan Verma on Ultrabook quote',
      description: 'Review discount options with Store Manager if total exceeds 2 lakhs.',
      priority: 'High',
      status: 'In Progress',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      storeId: store1._id,
      assignedTo: staffUser._id,
      createdBy: managerUser._id,
      comments: [
        {
          text: 'Manager authorized 10% commercial discount if closed by Friday.',
          userId: managerUser._id,
          date: new Date(),
        },
      ],
    },
    { upsert: true, new: true }
  );

  await Task.findOneAndUpdate(
    { title: 'Verify Friday Stock Count for Audio Peripherals' },
    {
      title: 'Verify Friday Stock Count for Audio Peripherals',
      description: 'Perform physical count of wireless headphones and update stock adjustments.',
      priority: 'Medium',
      status: 'Pending',
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      storeId: store1._id,
      assignedTo: staffUser._id,
      createdBy: managerUser._id,
      comments: [],
    },
    { upsert: true, new: true }
  );

  // 11. Seed Sample Completed Sale
  console.log('Seeding Sample Transactions...');
  const existingSale = await Sale.findOne({ invoiceNumber: 'INV-DWT01-0001' });
  if (!existingSale) {
    const saleItem1 = {
      productId: createdProducts[1]._id,
      name: createdProducts[1].name,
      sku: createdProducts[1].sku,
      unitPrice: createdProducts[1].price,
      quantity: 1,
      taxRate: 18,
      discount: 500,
      taxAmount: Math.round(((createdProducts[1].price - 500) * 18) / 100),
      total: (createdProducts[1].price - 500) + Math.round(((createdProducts[1].price - 500) * 18) / 100),
    };

    const subtotal = createdProducts[1].price;
    const discountTotal = 500;
    const taxTotal = saleItem1.taxAmount;
    const grandTotal = saleItem1.total;

    await Sale.create({
      invoiceNumber: 'INV-DWT01-0001',
      storeId: store1._id,
      customerId: customer2._id,
      customerName: customer2.name,
      customerPhone: customer2.phone,
      cashierId: counterUser._id,
      items: [saleItem1],
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      notes: 'Fast counter checkout with QR code scan',
    });

    // Record inventory deduction
    await Inventory.findOneAndUpdate(
      { storeId: store1._id, productId: createdProducts[1]._id },
      { $inc: { quantity: -1 } }
    );

    await StockMovement.create({
      storeId: store1._id,
      productId: createdProducts[1]._id,
      change: -1,
      movementType: 'Sale',
      reason: 'Sale invoice INV-DWT01-0001',
      referenceId: 'INV-DWT01-0001',
      performedBy: counterUser._id,
    });
  }

  // 12. Seed Initial Audit Log
  await AuditLog.create({
    action: 'SYSTEM_BOOTSTRAP',
    module: 'System',
    performedBy: adminUser._id,
    performedByName: adminUser.name,
    performedByEmail: adminUser.email,
    storeId: store1._id,
    details: {
      message: 'Initial CRM system bootstrap completed with default roles and demo entities',
      storesSeeded: 2,
      productsSeeded: createdProducts.length,
    },
  });

  console.log('--- CRM Seed & Bootstrap Complete! ---');
  console.log(`Admin account: ${adminEmail} | Password: ${adminPassword}`);
  console.log(`Demo accounts password: ${defaultUserPassword}`);
  console.log(`Store Manager: manager@crmsystem.local`);
  console.log(`Staff:         staff@crmsystem.local`);
  console.log(`Counter:       counter@crmsystem.local`);

  if (!isTest) {
    await disconnectDB();
  }
}

// Allow direct CLI execution
if (process.argv[1]?.includes('seed')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed script encountered error:', err);
      process.exit(1);
    });
}
