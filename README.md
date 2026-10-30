# NextCRM - Full-Stack Multi-Role CRM & Store Operations System

An enterprise-grade, production-minded Customer Relationship Management (CRM) and Multi-Store Operations Management System built with **Next.js (App Router, React 19, TypeScript)**, **MongoDB / Mongoose**, and **Zero-Trust Role-Based Access Control (RBAC)**.

---

## 🚀 Key Highlights & Architectural Strengths

- **4 Core Enterprise Roles**:
  - **Admin**: System-wide control, multi-store switcher, corporate user directory, audit logs, global revenue analytics.
  - **Store Manager**: Scoped entirely to assigned store, store staff management, task assignment, inventory receiving & adjustment, return approvals.
  - **Staff**: Customer management, lead pipeline tracking & conversion, task execution, customer interaction notes.
  - **Counter**: Point of Sale (POS) billing terminal, real-time stock deductions, customer selection & quick registration, multi-mode payments (Cash, UPI, Card), printable tax invoices & receipts.
- **Strict Server-Side RBAC**: Centralized permission registry (`lib/auth/permissions.ts`), reusable guards (`requireAuth`, `requireRole`, `requirePermission`, `requireStoreAccess`, `requireRecordAccess`). Access restrictions are applied directly at database query boundaries.
- **Zero-Trust Billing**: All item prices, taxes (GST), and discounts are authoritatively recalculated on the server. Overselling is prevented via atomic conditional inventory updates (`$inc: -qty, quantity: { $gte: qty }`).
- **Resilient MongoDB Engine**: Native connection pooling for MongoDB Atlas or local MongoDB instances, with automatic zero-config embedded fallback (`mongodb-memory-server`) for turnkey local development and automated testing out of the box.
- **Separation of Duties**: Employees cannot approve their own return or refund requests.
- **Immutable Audit Logging**: Every administrative action, price change, stock movement, cancellation, and authentication event is logged with timestamps and actor details.

---

## 🏛️ Enterprise Product Design Principles

To make the CRM feel like genuine commercial business software, the application is built around these five core product design principles:

1. **Compact sidebar and consistent top navigation**: Avoids the oversized, generic dashboard template look with a clean, collapsible deep-navy sidebar (`#171B26`), persistent breadcrumbs, store switcher, notifications, and profile controls.
2. **Professional data tables**: High-density operational tables for customers, staff, inventory, and sales orders with compact headers, subtle row borders (`#E5E7EB`), column alignment, status badges, search/filters, and action menus.
3. **Role-specific layouts**: Distinct, practical workspaces for each role:
   - **Counter**: Optimized for checkout billing speed, product lookup, and instant receipt printing.
   - **Staff**: Task-oriented with overdue follow-ups, prospect lead pipeline, and customer interaction logs.
   - **Store Manager**: Scoped to store inventory alerts, pending return authorizations, and branch metrics.
   - **Admin**: Executive oversight, store performance comparisons, user management, and security audit stream.
4. **Real data and meaningful empty states**: Zero fake statistics, decorative charts, or arbitrary numbers. All KPI blocks and charts are computed from MongoDB database records with actionable empty states when data is absent.
5. **Consistent spacing, typography and restrained colors**: A unified 4px/8px spacing grid, Inter/Geist typography scale (24–28px page titles, 16–18px section titles, 13–14px body/table text, 11–12px labels), and a restrained enterprise color palette (`#F7F8FA` background, `#FFFFFF` surface, `#20242C` primary text, `#737B89` secondary text, `#E5E7EB` borders, and `#4F46E5` muted primary accent).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Actions, Route Handlers) |
| **Language** | TypeScript (Strict Mode) |
| **Database & ODM** | MongoDB Atlas / Local MongoDB, Mongoose 9, In-memory fallback |
| **Authentication** | JWT stored in HTTP-Only, SameSite, Secure cookies (`crm_token`) |
| **Password Security** | Bcrypt (12 salt rounds) |
| **Validation** | Zod |
| **Styling** | Tailwind CSS 4 |
| **Icons** | Lucide React |
| **Charts** | Recharts (Revenue Trends, Store Comparisons, Payment Breakdowns) |
| **Test Suite** | Vitest with 15 integration tests covering RBAC, Billing, Inventory & Auth |

---

## 📦 Getting Started & Installation

### 1. Prerequisites
- **Node.js**: v20 or higher (Tested on Node v24)
- **npm**: v10 or higher
- **MongoDB** (Optional): MongoDB Atlas connection URI or local instance (if omitted, the embedded in-memory database will automatically spin up).

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Example configuration (`.env.local`):
```env
# MongoDB Connection URI (Leave blank for automatic embedded in-memory DB)
MONGODB_URI=mongodb://localhost:27017/crm_system

# JWT Authentication Secret (Generate with: openssl rand -base64 32)
AUTH_SECRET=super-secure-production-jwt-secret-min-32-characters

# App URLs
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Bootstrap Initial Administrator
BOOTSTRAP_ADMIN_NAME="System Administrator"
BOOTSTRAP_ADMIN_EMAIL=admin@crmsystem.local
BOOTSTRAP_ADMIN_PASSWORD=AdminSecurePass123!
```

---

## ⚡ Seed Database & Bootstrap Admin

Run the idempotent database seed script to initialize roles, permissions, demo stores, demo products, store inventory, demo customers, leads, tasks, and initial transactions:

```bash
npm run seed
```

### Pre-configured Seed Credentials:
| Role | Email | Password | Assigned Branch |
|---|---|---|---|
| **Admin** | `admin@crmsystem.local` | `AdminSecurePass123!` | All Stores (Global Switcher) |
| **Store Manager** | `manager@crmsystem.local` | `DemoUser123!` | Downtown Flagship Store (`DWT01`) |
| **Staff** | `staff@crmsystem.local` | `DemoUser123!` | Downtown Flagship Store (`DWT01`) |
| **Counter** | `counter@crmsystem.local` | `DemoUser123!` | Downtown Flagship Store (`DWT01`) |

*(The login page at `/login` also features one-click quick-fill buttons for all 4 roles)*.

---

## 🏃 Running the Application

### Development Mode:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Launch:
```bash
npm run build
npm run start
```

---

## 🧪 Running Automated Tests

Run the complete Vitest test suite covering the RBAC permission matrix, password security, store isolation, customer CRUD, lead conversion, atomic stock adjustments, and overselling prevention:

```bash
npm run test
```

Test Results Output:
```
 ✓ tests/crm.test.ts (15 tests)
   ✓ 1. Password Hashing & Verification
   ✓ 2. Authentication & JWT Session Management
   ✓ 3. RBAC Permission Matrix & Server-Side Authorization
   ✓ 4. Customer Management & Lead Conversion
   ✓ 5. Inventory Management & Stock Adjustments
   ✓ 6. Counter Billing, Concurrency & Server Calculation
   ✓ 7. Returns, Refunds & Separation of Duties
   ✓ 8. Audit Log Verification
```

---

## 🔐 RBAC Permission Matrix

| Permission Key | Description | Admin | Store Manager | Staff | Counter |
|---|---|:---:|:---:|:---:|:---:|
| `users.read` | View user accounts | ✅ | ✅ (Own store) | ❌ | ❌ |
| `users.create` | Create new users | ✅ | ✅ (Staff/Counter) | ❌ | ❌ |
| `users.update` | Update accounts | ✅ | ✅ (Own store) | ❌ | ❌ |
| `users.deactivate` | Deactivate accounts | ✅ | ✅ (Own store) | ❌ | ❌ |
| `roles.assign` | Modify roles & permissions | ✅ | ❌ | ❌ | ❌ |
| `stores.read` | View branch information | ✅ | ✅ | ❌ | ❌ |
| `stores.manage` | Create & configure stores | ✅ | ❌ | ❌ | ❌ |
| `customers.read` | View customer records | ✅ | ✅ | ✅ | ✅ |
| `customers.create` | Register customers | ✅ | ✅ | ✅ | ✅ |
| `customers.update` | Edit customer details & notes | ✅ | ✅ | ✅ | ❌ |
| `leads.manage` | Manage leads & conversion | ✅ | ✅ | ✅ | ❌ |
| `tasks.assign` | Create & assign tasks | ✅ | ✅ | ❌ | ❌ |
| `tasks.update_own` | Update status & comments on tasks | ✅ | ✅ | ✅ | ❌ |
| `inventory.read` | View catalog and stock | ✅ | ✅ | ✅ | ✅ |
| `inventory.receive` | Receive stock batches | ✅ | ✅ | ❌ | ❌ |
| `inventory.adjust` | Adjust stock / write-offs | ✅ | ✅ | ❌ | ❌ |
| `sales.create` | POS billing & invoices | ✅ | ✅ | ❌ | ✅ |
| `sales.read_store` | View store transactions | ✅ | ✅ | ❌ | ✅ |
| `refunds.request` | Initiate return / refund | ✅ | ✅ | ❌ | ✅ |
| `refunds.approve` | Approve refunds & restock | ✅ | ✅ | ❌ | ❌ |
| `reports.read_store` | Store sales & stock reports | ✅ | ✅ | ❌ | ❌ |
| `reports.read_all` | Global consolidated reports | ✅ | ❌ | ❌ | ❌ |
| `audit_logs.read` | View security audit logs | ✅ | ❌ | ❌ | ❌ |

---

## 📡 REST Route Handler API Reference

### Authentication
- `POST /api/auth/login`: Authenticates credentials, validates active status, issues HTTP-only JWT cookie.
- `POST /api/auth/logout`: Clears session cookie and creates audit event.
- `GET /api/auth/me`: Returns current user session, store info, and permissions.
- `POST /api/auth/forgot-password`: Generates secure password reset token (1-hour TTL).
- `POST /api/auth/reset-password`: Validates token and updates password hash.
- `POST /api/auth/change-password`: Authenticated password change.

### Users
- `GET /api/users`: List users (filtered by store for Store Manager).
- `POST /api/users`: Create user (Store Manager can only create Staff/Counter in their store).
- `GET /api/users/[id]`: User details.
- `PATCH /api/users/[id]`: Update user (prevent deactivating the last active Admin).
- `DELETE /api/users/[id]`: Deactivate account.

### Stores
- `GET /api/stores`: List all active branches.
- `POST /api/stores`: Create new store branch (Admin only).
- `GET /api/stores/[id]`: Branch profile.
- `PATCH /api/stores/[id]`: Update branch settings (discount caps, approval rules).

### Customers
- `GET /api/customers`: Paginated, searchable customer records (store-isolated).
- `POST /api/customers`: Register customer (checks duplicate phone per store).
- `GET /api/customers/[id]`: Customer profile with purchase history and lead records.
- `PATCH /api/customers/[id]`: Edit customer information.
- `POST /api/customers/[id]/interactions`: Record CRM interaction note.

### Leads
- `GET /api/leads`: Searchable leads pipeline with overdue follow-up filters.
- `POST /api/leads`: Create new lead.
- `GET /api/leads/[id]`: Lead file with interaction history.
- `PATCH /api/leads/[id]`: Update status or follow-up date.
- `POST /api/leads/[id]/convert`: Converts qualified lead to customer without duplicate creation.

### Tasks
- `GET /api/tasks`: Tasks list (Staff sees own tasks; Managers see store team tasks).
- `POST /api/tasks`: Assign new task with priority and due date.
- `PATCH /api/tasks/[id]`: Update status or assignment.
- `POST /api/tasks/[id]/comments`: Post comment on task.

### Products & Inventory
- `GET /api/products`: Catalog with SKU, prices, GST tax rate, and branch stock.
- `POST /api/products`: Create product (auto-initializes inventory in all stores).
- `PATCH /api/products/[id]`: Update product with price change auditing.
- `GET /api/inventory`: Store inventory levels with low-stock indicators.
- `POST /api/inventory/receive`: Receive batch, updates quantity, logs movement.
- `POST /api/inventory/adjust`: Authorized adjustment, prevents negative inventory.
- `GET /api/inventory/movements`: Stock movement history.

### Sales & Returns
- `POST /api/sales`: POS checkout with server-side price/tax calculation and atomic stock deduction.
- `GET /api/sales`: Transactions list with invoice details.
- `POST /api/sales/[id]/cancel`: Cancel sale and restore stock.
- `POST /api/returns`: Request refund with eligible item quantity verification.
- `POST /api/returns/[id]/approve`: Store Manager approval workflow with separation of duties.

### Analytics & Compliance
- `GET /api/dashboard`: Role-tailored metrics aggregated from MongoDB.
- `GET /api/reports/sales`: Revenue trends, payment breakdowns, and CSV export.
- `GET /api/reports/inventory`: Valuation at cost and retail.
- `GET /api/reports/performance`: Staff KPIs, conversion rates, and sales.
- `GET /api/audit-logs`: Immutable system audit stream.

---

## 🚢 Production Deployment (e.g. Vercel + MongoDB Atlas)

1. **Deploy to Vercel or Node.js Docker Container**:
   - Link the repository to your hosting provider.
2. **Environment Variables**:
   - Set `MONGODB_URI` to your MongoDB Atlas connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/crm_production?retryWrites=true&w=majority`).
   - Set `AUTH_SECRET` to a 64-character random string (`openssl rand -base64 48`).
   - Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production domain (e.g., `https://crm.yourcompany.com`).
3. **Execute Initial Seed in Production**:
   - Run `npm run seed` once from your CI/CD pipeline or deployment terminal to seed the initial roles, permissions, and first Administrator account securely.
4. **Security Hardening**:
   - Passwords are encrypted with 12-round bcrypt salt.
   - JWT tokens are signed with HMAC SHA-256 and stored in HTTP-Only SameSite cookies.
   - All protected Route Handlers enforce server-side authentication and role permissions before any database operation.
