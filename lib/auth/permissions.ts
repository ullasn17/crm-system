export type RoleName = 'Admin' | 'Store Manager' | 'Staff' | 'Counter';

export const ROLES: RoleName[] = ['Admin', 'Store Manager', 'Staff', 'Counter'];

export const ALL_PERMISSIONS = [
  // User Management
  { key: 'users.read', label: 'View Users', module: 'Users', description: 'Can view user accounts and details' },
  { key: 'users.create', label: 'Create Users', module: 'Users', description: 'Can create new users' },
  { key: 'users.update', label: 'Update Users', module: 'Users', description: 'Can edit existing user accounts' },
  { key: 'users.deactivate', label: 'Deactivate Users', module: 'Users', description: 'Can deactivate or activate accounts' },
  { key: 'roles.assign', label: 'Assign Roles', module: 'Users', description: 'Can modify user roles and permissions' },

  // Store Management
  { key: 'stores.read', label: 'View Stores', module: 'Stores', description: 'Can view store profiles' },
  { key: 'stores.manage', label: 'Manage Stores', module: 'Stores', description: 'Can create, edit and configure stores' },

  // Customer Management
  { key: 'customers.read', label: 'View Customers', module: 'Customers', description: 'Can view customer records' },
  { key: 'customers.create', label: 'Create Customers', module: 'Customers', description: 'Can register new customers' },
  { key: 'customers.update', label: 'Update Customers', module: 'Customers', description: 'Can modify customer records' },

  // Leads & CRM
  { key: 'leads.manage', label: 'Manage Leads', module: 'Leads', description: 'Can manage leads and follow-up activities' },

  // Tasks
  { key: 'tasks.assign', label: 'Assign Tasks', module: 'Tasks', description: 'Can create and assign tasks to employees' },
  { key: 'tasks.update_own', label: 'Update Own Tasks', module: 'Tasks', description: 'Can update status and notes on assigned tasks' },

  // Inventory
  { key: 'inventory.read', label: 'View Inventory', module: 'Inventory', description: 'Can view stock levels and catalog' },
  { key: 'inventory.receive', label: 'Receive Inventory', module: 'Inventory', description: 'Can record incoming stock batches' },
  { key: 'inventory.adjust', label: 'Adjust Inventory', module: 'Inventory', description: 'Can modify or write off stock quantities' },

  // Sales & Billing
  { key: 'sales.create', label: 'Create Sales', module: 'Sales', description: 'Can generate new sales transactions and invoices' },
  { key: 'sales.read_own', label: 'View Own Sales', module: 'Sales', description: 'Can view sales created by current user' },
  { key: 'sales.read_store', label: 'View Store Sales', module: 'Sales', description: 'Can view all sales for assigned store' },
  { key: 'sales.read_all', label: 'View All Sales', module: 'Sales', description: 'Can view sales across all stores system-wide' },

  // Refunds & Returns
  { key: 'refunds.request', label: 'Request Refund', module: 'Refunds', description: 'Can initiate a return or refund request' },
  { key: 'refunds.approve', label: 'Approve Refund', module: 'Refunds', description: 'Can approve returns and disburse refunds' },

  // Reports
  { key: 'reports.read_store', label: 'View Store Reports', module: 'Reports', description: 'Can view analytics for assigned store' },
  { key: 'reports.read_all', label: 'View All Reports', module: 'Reports', description: 'Can view global system analytics' },

  // System & Security
  { key: 'audit_logs.read', label: 'View Audit Logs', module: 'Audit', description: 'Can review system security and audit events' },
  { key: 'settings.manage', label: 'Manage System Settings', module: 'Settings', description: 'Can configure operational parameters' },
] as const;

export type PermissionKey = typeof ALL_PERMISSIONS[number]['key'];

export const ROLE_DEFAULT_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  Admin: ALL_PERMISSIONS.map(p => p.key),
  'Store Manager': [
    'stores.read',
    'users.read',
    'users.create',
    'users.update',
    'users.deactivate',
    'customers.read',
    'customers.create',
    'customers.update',
    'leads.manage',
    'tasks.assign',
    'tasks.update_own',
    'inventory.read',
    'inventory.receive',
    'inventory.adjust',
    'sales.create',
    'sales.read_own',
    'sales.read_store',
    'refunds.request',
    'refunds.approve',
    'reports.read_store',
  ],
  Staff: [
    'customers.read',
    'customers.create',
    'customers.update',
    'leads.manage',
    'tasks.update_own',
    'inventory.read',
  ],
  Counter: [
    'customers.read',
    'customers.create',
    'inventory.read',
    'sales.create',
    'sales.read_own',
    'sales.read_store',
    'refunds.request',
  ],
};
