import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';

export interface FindItemsParams {
  tenantId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateItemInput {
  tenantId: string;
  name: string;
  description: string;
  status: string;
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
  status?: string;
}

export class ItemsRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(params: FindItemsParams) {
    const {
      tenantId,
      page = 1,
      limit = 20,
      search = '',
      status = undefined,
    } = params;

    const skip = (page - 1) * limit;

    const whereClause: Prisma.ItemWhereInput = {
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
      this.prisma.item.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.item.count({ where: whereClause }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number, tenantId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Item tidak ditemukan', 404);
    }

    return item;
  }

  async create(input: CreateItemInput) {
    try {
      const item = await this.prisma.item.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          description: input.description,
          status: input.status,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return item;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError(
          'ITEM_CREATE_FAILED',
          'Gagal membuat item',
          400
        );
      }
      throw error;
    }
  }

  async update(id: number, tenantId: string, input: UpdateItemInput) {
    await this.findById(id, tenantId);

    try {
      const item = await this.prisma.item.update({
        where: { id },
        data: {
          ...input,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return item;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError(
          'ITEM_UPDATE_FAILED',
          'Gagal memperbarui item',
          400
        );
      }
      throw error;
    }
  }

  async softDelete(id: number, tenantId: string) {
    await this.findById(id, tenantId);

    try {
      const item = await this.prisma.item.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });

      return item;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError(
          'ITEM_DELETE_FAILED',
          'Gagal menghapus item',
          400
        );
      }
      throw error;
    }
  }

  async getItemsByStatus(
    tenantId: string,
    status: string,
    limit: number = 20
  ) {
    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        status,
        deletedAt: null,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return items;
  }

  async countByStatus(tenantId: string) {
    const statusCounts = await this.prisma.item.groupBy({
      by: ['status'],
      where: {
        tenantId,
        deletedAt: null,
      },
      _count: true,
    });

    return statusCounts.map((sc) => ({
      status: sc.status,
      count: sc._count,
    }));
  }

  async getAnalytics(tenantId: string) {
    const [total, statusCounts, recentItems] = await Promise.all([
      this.prisma.item.count({
        where: { tenantId, deletedAt: null },
      }),
      this.countByStatus(tenantId),
      this.prisma.item.findMany({
        where: { tenantId, deletedAt: null },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalItems: total,
      statusDistribution: statusCounts,
      recentItems,
    };
  }
}