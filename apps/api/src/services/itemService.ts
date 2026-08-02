import { Prisma } from '@prisma/client';
import prisma from '@/config/database';
import { AppError } from '@/utils/errors';
import { CreateItemSchema, UpdateItemSchema, ItemQuerySchema } from '@/schemas/itemSchema';
import type { z } from 'zod';

type CreateItemInput = z.infer<typeof CreateItemSchema>;
type UpdateItemInput = z.infer<typeof UpdateItemSchema>;
type ItemQueryInput = z.infer<typeof ItemQuerySchema>;

export class ItemService {
  /**
   * Get all items with pagination and filtering
   */
  async getAllItems(tenantId: string, query: ItemQueryInput) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const offset = (page - 1) * limit;

      const where: Prisma.ItemWhereInput = {
        tenantId,
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(status && { status }),
      };

      const [items, total] = await Promise.all([
        prisma.item.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc',
          },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.item.count({ where }),
      ]);

      return {
        success: true,
        data: items,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      throw new AppError(
        'FETCH_ITEMS_FAILED',
        'Gagal mengambil data items',
        500
      );
    }
  }

  /**
   * Get single item by ID
   */
  async getItemById(tenantId: string, itemId: number) {
    try {
      const item = await prisma.item.findFirst({
        where: {
          id: itemId,
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
        throw new AppError(
          'ITEM_NOT_FOUND',
          'Item tidak ditemukan',
          404
        );
      }

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'FETCH_ITEM_FAILED',
        'Gagal mengambil detail item',
        500
      );
    }
  }

  /**
   * Create new item
   */
  async createItem(tenantId: string, input: CreateItemInput) {
    try {
      const item = await prisma.item.create({
        data: {
          tenantId,
          name: input.name.trim(),
          description: input.description.trim(),
          status: input.status || 'active',
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

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError(
            'ITEM_DUPLICATE',
            'Item dengan nama yang sama sudah ada',
            409
          );
        }
      }
      throw new AppError(
        'CREATE_ITEM_FAILED',
        'Gagal membuat item baru',
        500
      );
    }
  }

  /**
   * Update item
   */
  async updateItem(
    tenantId: string,
    itemId: number,
    input: UpdateItemInput
  ) {
    try {
      const existingItem = await prisma.item.findFirst({
        where: {
          id: itemId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!existingItem) {
        throw new AppError(
          'ITEM_NOT_FOUND',
          'Item tidak ditemukan',
          404
        );
      }

      const updatedItem = await prisma.item.update({
        where: { id: itemId },
        data: {
          ...(input.name && { name: input.name.trim() }),
          ...(input.description && { description: input.description.trim() }),
          ...(input.status && { status: input.status }),
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

      return {
        success: true,
        data: updatedItem,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError(
            'ITEM_DUPLICATE',
            'Item dengan nama yang sama sudah ada',
            409
          );
        }
      }
      throw new AppError(
        'UPDATE_ITEM_FAILED',
        'Gagal memperbarui item',
        500
      );
    }
  }

  /**
   * Soft delete item
   */
  async deleteItem(tenantId: string, itemId: number) {
    try {
      const existingItem = await prisma.item.findFirst({
        where: {
          id: itemId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!existingItem) {
        throw new AppError(
          'ITEM_NOT_FOUND',
          'Item tidak ditemukan',
          404
        );
      }

      await prisma.item.update({
        where: { id: itemId },
        data: {
          deletedAt: new Date(),
        },
      });

      return {
        success: true,
        data: { message: 'Item berhasil dihapus' },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'DELETE_ITEM_FAILED',
        'Gagal menghapus item',
        500
      );
    }
  }

  /**
   * Bulk delete items
   */
  async bulkDeleteItems(tenantId: string, itemIds: number[]) {
    try {
      if (!itemIds.length) {
        throw new AppError(
          'INVALID_REQUEST',
          'Pilih minimal satu item untuk dihapus',
          400
        );
      }

      const result = await prisma.item.updateMany({
        where: {
          id: { in: itemIds },
          tenantId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new AppError(
          'ITEM_NOT_FOUND',
          'Item tidak ditemukan atau sudah dihapus',
          404
        );
      }

      return {
        success: true,
        data: { deletedCount: result.count },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'BULK_DELETE_FAILED',
        'Gagal menghapus items',
        500
      );
    }
  }

  /**
   * Get item statistics
   */
  async getItemStatistics(tenantId: string) {
    try {
      const [total, byStatus] = await Promise.all([
        prisma.item.count({
          where: {
            tenantId,
            deletedAt: null,
          },
        }),
        prisma.item.groupBy({
          by: ['status'],
          where: {
            tenantId,
            deletedAt: null,
          },
          _count: true,
        }),
      ]);

      const statusBreakdown = byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        success: true,
        data: {
          totalItems: total,
          byStatus: statusBreakdown,
        },
      };
    } catch (error) {
      throw new AppError(
        'FETCH_STATISTICS_FAILED',
        'Gagal mengambil statistik items',
        500
      );
    }
  }
}

export const itemService = new ItemService();