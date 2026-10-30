import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/authorization';
import { connectDB } from '@/lib/db/mongodb';
import { ProductCategory } from '@/models/ProductCategory';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { z } from 'zod';

const CreateCategorySchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  description: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    await connectDB();
    const categories = await ProductCategory.find({ isActive: true }).sort({ name: 1 }).lean();
    return successResponse({ categories });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(['Admin', 'Store Manager'], req);
    const body = await req.json();
    const data = CreateCategorySchema.parse(body);

    await connectDB();
    const existing = await ProductCategory.findOne({ code: data.code });
    if (existing) {
      return errorResponse(new Error(`Category code '${data.code}' already exists.`));
    }

    const category = await ProductCategory.create({
      name: data.name,
      code: data.code,
      description: data.description || '',
      isActive: true,
    });

    return successResponse({ category }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
