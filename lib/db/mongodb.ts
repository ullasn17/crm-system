import mongoose from 'mongoose';
import dns from 'dns';

// Fix Windows DNS resolver issues with MongoDB Atlas SRV records (Windows local dev only)
if (process.platform === 'win32') {
  try {
    if (typeof dns.setServers === 'function') {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
  } catch {
    // Ignore if restricted
  }
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
    memoryServerInstance?: any;
    isBootstrapping?: boolean;
    hasBootstrapped?: boolean;
  } | undefined;
}

let cached = global.mongooseConnection;

if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null, hasBootstrapped: false };
}

async function ensureBootstrap() {
  if (cached?.hasBootstrapped || cached?.isBootstrapping) return;
  try {
    cached!.isBootstrapping = true;
    const { User } = await import('@/models/User');
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('[MongoDB] Empty database detected. Performing automated bootstrap seed...');
      const { runSeed } = await import('@/scripts/seed');
      await runSeed(true);
      console.log('[MongoDB] Automated bootstrap seed completed successfully.');
    }
    cached!.hasBootstrapped = true;
  } catch (err) {
    console.error('[MongoDB] Automated bootstrap notice:', err);
  } finally {
    cached!.isBootstrapping = false;
  }
}

async function resolveSrvUri(srvUri: string): Promise<string> {
  if (!srvUri.startsWith('mongodb+srv://')) return srvUri;
  // On Linux/Vercel serverless, standard driver resolves SRV without custom DNS queries
  if (process.platform !== 'win32') {
    return srvUri;
  }
  try {
    const dns = await import('node:dns');
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      if (dns.promises?.setServers) {
        dns.promises.setServers(['8.8.8.8', '1.1.1.1']);
      }
    } catch {}

    const parsed = new URL(srvUri);
    const host = parsed.hostname;
    const auth = parsed.username ? `${parsed.username}:${parsed.password}@` : '';
    const db = parsed.pathname || '/crm_system';

    const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
    const txtRecords = await dns.promises.resolveTxt(host).catch(() => []);

    if (srvRecords && srvRecords.length > 0) {
      const hostList = srvRecords.map((r) => `${r.name}:${r.port}`).join(',');
      const queryParams = new URLSearchParams(parsed.search);
      const txtParams = txtRecords.flat().join('&');
      if (txtParams) {
        const extra = new URLSearchParams(txtParams);
        extra.forEach((val, key) => queryParams.set(key, val));
      }
      queryParams.set('ssl', 'true');
      if (!queryParams.has('retryWrites')) queryParams.set('retryWrites', 'true');
      if (!queryParams.has('w')) queryParams.set('w', 'majority');

      return `mongodb://${auth}${hostList}${db}?${queryParams.toString()}`;
    }
  } catch (err: any) {
    console.warn('[MongoDB] Automated SRV resolver fallback:', err.message);
  }
  return srvUri;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached!.conn) {
    if (!cached?.hasBootstrapped) {
      await ensureBootstrap();
    }
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB || 'crm_system',
    };

    const rawUri = process.env.MONGODB_URI;

    cached!.promise = (async () => {
      // If URI is set, try connecting to it (with automated SRV resolution if needed)
      if (rawUri) {
        const resolvedUri = await resolveSrvUri(rawUri);
        try {
          const m = await mongoose.connect(resolvedUri, opts);
          console.log('[MongoDB] Connected successfully to persistent MongoDB Atlas cluster.');
          return m;
        } catch (err: any) {
          console.warn(`[MongoDB] Primary connection failed (${err.message}). Attempting memory server fallback for local environment...`);
        }
      }

      // Fallback: Use mongodb-memory-server for local dev or automated test environments
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!cached!.memoryServerInstance) {
          cached!.memoryServerInstance = await MongoMemoryServer.create();
        }
        const memUri = cached!.memoryServerInstance.getUri();
        console.log(`[MongoDB] Connected to in-memory instance at ${memUri}`);
        const m = await mongoose.connect(memUri, opts);
        return m;
      } catch (memErr: any) {
        throw new Error(`Failed to establish MongoDB connection: ${memErr.message}`);
      }
    })();
  }

  try {
    cached!.conn = await cached!.promise;
    await ensureBootstrap();
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached?.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
  if (cached?.memoryServerInstance) {
    await cached.memoryServerInstance.stop();
    cached.memoryServerInstance = undefined;
  }
}
