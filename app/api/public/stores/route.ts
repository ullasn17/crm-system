import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { Store } from '@/models/Store';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const city = searchParams.get('city');

    const filter: Record<string, any> = { isActive: true };

    if (city && city !== 'all') {
      filter['address.city'] = { $regex: new RegExp(`^${city}$`, 'i') };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
      ];
    }

    const stores = await Store.find(filter)
      .select('_id name code address phone email settings createdAt')
      .sort({ name: 1 })
      .lean();

    return successResponse({ stores });
  } catch (error) {
    return errorResponse(error);
  }
}
