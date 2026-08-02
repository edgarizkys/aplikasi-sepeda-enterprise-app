import { Request, Response } from 'express';
import { z } from 'zod';
import { ItemService } from '../services/itemService';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';

const itemService = new ItemService();

// Validation schemas
const createItemSchema = z.object({
  name: z.string().min(1, 'Nama harus diisi').max(255),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateItemSchema = createItemSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const paramsSchema = z.object({
  id: z.coerce.number().int().min(1),
});

// Get all items with pagination and filtering
export const getAllItems = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const query = querySchema.parse(req.query);

  const result = await itemService.getAllItems(tenantId, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
  });

  res.json({
    success: true,
    data: result.data,
    meta: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      pages: Math.ceil(result.total / query.limit),
    },
  });
});

// Get single item by ID
export const getItemById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = paramsSchema.parse(req.params);

  const item = await itemService.getItemById(tenantId, id);

  if (!item) {
    throw new AppError('Item tidak ditemukan', 'NOT_FOUND', 404);
  }

  res.json({
    success: true,
    data: item,
  });
});

// Create new item
export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const payload = createItemSchema.parse(req.body);

  const item = await itemService.createItem(tenantId, payload);

  res.status(201).json({
    success: true,
    data: item,
  });
});

// Update item
export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = paramsSchema.parse(req.params);
  const payload = updateItemSchema.parse(req.body);

  const item = await itemService.updateItem(tenantId, id, payload);

  if (!item) {
    throw new AppError('Item tidak ditemukan', 'NOT_FOUND', 404);
  }

  res.json({
    success: true,
    data: item,
  });
});

// Delete item (soft delete)
export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = paramsSchema.parse(req.params);

  const item = await itemService.deleteItem(tenantId, id);

  if (!item) {
    throw new AppError('Item tidak ditemukan', 'NOT_FOUND', 404);
  }

  res.json({
    success: true,
    data: { id: item.id, message: 'Item berhasil dihapus' },
  });
});

// Get item statistics
export const getItemStats = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

  const stats = await itemService.getItemStats(tenantId);

  res.json({
    success: true,
    data: stats,
  });
});