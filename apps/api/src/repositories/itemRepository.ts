import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';

export class ItemRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string;
      search?: string;
    }
  ) {
    try {
      const skip = (page - 1) * limit;
      
      const where: Prisma.ItemWhereInput = {
        tenantId,
        deletedAt: null,
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.item.findMany({
          where,
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
        this.prisma.item.count({ where }),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(
        'Failed to fetch items',
        500,
        'FETCH_ITEMS_ERROR',
        error
      );
    }
  }

  async findById(tenantId: string, id: string) {
    try {
      const item = await this.prisma.item.findFirst