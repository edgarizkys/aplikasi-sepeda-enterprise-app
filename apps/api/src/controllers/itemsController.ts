import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';
import { validateRequest } from '../middleware/validateRequest';

// Zod validation schemas
const createItemSchema = z.object({
  name: z.string().min(1, 'Nama harus diisi').max(255),
  description: z.string().max(1000).optional().default(''),
  status: z.enum(['active', 'inactive']).default('active'),
});

const updateItemSchema = createItemSchema.partial();

const listItemsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
  search: z.string().optional().default(''),
  status: z.enum(['active', 'inactive']).optional(),
});

type CreateItemInput = z.infer<typeof createItemSchema>;
type UpdateItemInput = z.infer<typeof updateItemSchema>;
type ListItemsQuery = z.infer<typeof listItemsSchema>;

/**
 * Get all items with pagination and filtering
 * GET /api/items
 */
export const getAllItems = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  
  const query = listItemsSchema.parse(req.query);
  const page = parseInt(query.page as any) || 1;
  const limit = parseInt(query.limit as any) || 20;
  const offset = (page - 1) * limit;

  const whereClause: any = {
    tenantId,
    deletedAt: null,
  };

  if (query.search) {
    whereClause.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.status) {
    whereClause.status = query.status;
  }

  const [items, total] = await Promise.all([
    prisma.items.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.items.count({ where: whereClause }),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get single item by ID
 * GET /api/items/:id
 */
export const getItemById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = req.params;

  const item = await prisma.items.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!item) {
    throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
  }

  res.json({
    success: true,
    data: item,
  });
});

/**
 * Create new item
 * POST /api/items
 */
export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

  const body = createItemSchema.parse(req.body);

  const item = await prisma.items.create({
    data: {
      ...body,
      tenantId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({
    success: true,
    data: item,
  });
});

/**
 * Update item by ID
 * PATCH /api/items/:id
 */
export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = req.params;

  // Verify item exists
  const existingItem = await prisma.items.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      deletedAt: null,
    },
  });

  if (!existingItem) {
    throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
  }

  const body = updateItemSchema.parse(req.body);

  const item = await prisma.items.update({
    where: { id: parseInt(id) },
    data: body,
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    success: true,
    data: item,
  });
});

/**
 * Soft delete item by ID
 * DELETE /api/items/:id
 */
export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { id } = req.params;

  // Verify item exists
  const existingItem = await prisma.items.findFirst({
    where: {
      id: parseInt(id),
      tenantId,
      deletedAt: null,
    },
  });

  if (!existingItem) {
    throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
  }

  await prisma.items.update({
    where: { id: parseInt(id) },
    data: { deletedAt: new Date() },
  });

  res.json({
    success: true,
    data: { id: parseInt(id), message: 'Item berhasil dihapus' },
  });
});

/**
 * Bulk delete items
 * POST /api/items/bulk-delete
 */
export const bulkDeleteItems = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('IDs harus berupa array yang tidak kosong', 400, 'INVALID_INPUT');
  }

  const result = await prisma.items.updateMany({
    where: {
      id: { in: ids.map(Number) },
      tenantId,
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  res.json({
    success: true,
    data: { deletedCount: result.count },
  });
});

/**
 * Get items analytics
 * GET /api/items/analytics/summary
 */
export const getItemsAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

  const [totalItems, activeItems, inactiveItems] = await Promise.all([
    prisma.items.count({
      where: { tenantId, deletedAt: null },
    }),
    prisma.items.count({
      where: { tenantId, status: 'active', deletedAt: null },
    }),
    prisma.items.count({
      where: { tenantId, status: 'inactive', deletedAt: null },
    }),
  ]);

  const itemsByStatus = await prisma.items.groupBy({
    by: ['status'],
    where: { tenantId, deletedAt: null },
    _count: true,
  });

  res.json({
    success: true,
    data: {
      totalItems,
      activeItems,
      inactiveItems,
      byStatus: itemsByStatus.map(item => ({
        status: item.status,
        count: item._count,
      })),
    },
  });
});