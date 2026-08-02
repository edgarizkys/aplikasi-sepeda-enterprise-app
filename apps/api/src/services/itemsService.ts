import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { CreateItemSchema, UpdateItemSchema, ListItemsSchema } from '@/lib/validations/items';
import { AppError } from '@/lib/errors/AppError';
import { z } from 'zod';

export class ItemsService {
  /**
   * Get all items with pagination and filtering
   */
  async listItems(
    tenantId: string,
    query: z.infer<typeof ListItemsSchema>
  ) {
    try {
      const { page = 1, limit = 20, search, status } = query;
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
        },
      };
    } catch (error) {
      throw new AppError(
        'Failed to list items',
        'ITEMS_LIST_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  /**
   * Get single item by ID
   */
  async getItemById(tenantId: string, itemId: string) {
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
          'Item tidak ditemukan',
          'ITEM_NOT_FOUND',
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
        'Failed to retrieve item',
        'ITEM_RETRIEVE_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  /**
   * Create new item
   */
  async createItem(
    tenantId: string,
    payload: z.infer<typeof CreateItemSchema>
  ) {
    try {
      const { name, description, status } = payload;

      const existingItem = await prisma.item.findFirst({
        where: {
          tenantId,
          name,
          deletedAt: null,
        },
      });

      if (existingItem) {
        throw new AppError(
          'Item dengan nama yang sama sudah ada',
          'ITEM_NAME_DUPLICATE',
          409
        );
      }

      const item = await prisma.item.create({
        data: {
          tenantId,
          name,
          description,
          status,
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
        meta: {
          message: 'Item berhasil dibuat',
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to create item',
        'ITEM_CREATE_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  /**
   * Update item
   */
  async updateItem(
    tenantId: string,
    itemId: string,
    payload: z.infer<typeof UpdateItemSchema>
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
          'Item tidak ditemukan',
          'ITEM_NOT_FOUND',
          404
        );
      }

      if (payload.name && payload.name !== existingItem.name) {
        const duplicateName = await prisma.item.findFirst({
          where: {
            tenantId,
            name: payload.name,
            deletedAt: null,
            NOT: { id: itemId },
          },
        });

        if (duplicateName) {
          throw new AppError(
            'Item dengan nama yang sama sudah ada',
            'ITEM_NAME_DUPLICATE',
            409
          );
        }
      }

      const updatedItem = await prisma.item.update({
        where: { id: itemId },
        data: {
          ...(payload.name && { name: payload.name }),
          ...(payload.description && { description: payload.description }),
          ...(payload.status && { status: payload.status }),
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
        meta: {
          message: 'Item berhasil diperbarui',
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to update item',
        'ITEM_UPDATE_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  /**
   * Soft delete item
   */
  async deleteItem(tenantId: string, itemId: string) {
    try {
      const item = await prisma.item.findFirst({
        where: {
          id: itemId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!item) {
        throw new AppError(
          'Item tidak ditemukan',
          'ITEM_NOT_FOUND',
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
        meta: {
          message: 'Item berhasil dihapus',
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'Failed to delete item',
        'ITEM_DELETE_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }

  /**
   * Get item statistics
   */
  async getItemStatistics(tenantId: string) {
    try {
      const [total, byStatus, recent] = await Promise.all([
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
        prisma.item.findMany({
          where: {
            tenantId,
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

      const statusCounts = byStatus.reduce(
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
          byStatus: statusCounts,
          recentItems: recent,
        },
      };
    } catch (error) {
      throw new AppError(
        'Failed to get item statistics',
        'ITEM_STATS_ERROR',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  }
}

export const itemsService = new ItemsService();