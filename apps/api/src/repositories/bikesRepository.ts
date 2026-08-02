import { PrismaClient, Prisma } from '@prisma/client';

export class BikesRepository {
  constructor(private prisma: PrismaClient) {}

  async create(tenantId: string, data: Prisma.BikeCreateInput): Promise<any> {
    return this.prisma.bike.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async findById(tenantId: string, id: string): Promise<any> {
    return this.prisma.bike.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });
  }

  async findAll(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      status?: string;
      condition?: string;
      location?: string;
    }
  ): Promise<{ data: any[]; total: number }> {
    const { page, limit, status, condition, location } = options;
    const offset = (page - 1) * limit;

    const whereClause: Prisma.BikeWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (status) whereClause.status = status;
    if (condition) whereClause.condition = condition;
    if (location) whereClause.location = location;

    const [data, total] = await Promise.all([
      this.prisma.bike.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bike.count({ where: whereClause }),
    ]);

    return { data, total };
  }

  async update(tenantId: string, id: string, data: Prisma.BikeUpdateInput): Promise<any> {
    return this.prisma.bike.update({
      where: {
        id,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            rentals: true,
            maintenance: true,
          },
        },
      },
    });
  }

  async softDelete(tenantId: string, id: string): Promise<any> {
    return this.prisma.bike.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async findBySerialNumber(tenantId: string, serialNumber: string): Promise<any> {
    return this.prisma.bike.findFirst({
      where: {
        serialNumber,
        tenantId,
        deletedAt: null,
      },
    });
  }

  async findByStatus(tenantId: string, status: string, page: number, limit: number): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.bike.findMany({
        where: {
          tenantId,
          status,
          deletedAt: null,
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bike.count({
        where: {
          tenantId,
          status,
          deletedAt: null,
        },
      }),
    ]);

    return { data, total };
  }

  async findByLocation(tenantId: string, location: string, page: number, limit: number): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.bike.findMany({
        where: {
          tenantId,
          location,
          deletedAt: null,
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bike.count({
        where: {
          tenantId,
          location,
          deletedAt: null,
        },
      }),
    ]);

    return { data, total };
  }

  async countByStatus(tenantId: string, status: string): Promise<number> {
    return this.prisma.bike.count({
      where: {
        tenantId,
        status,
        deletedAt: null,
      },
    });
  }

  async countByCondition(tenantId: string, condition: string): Promise<number> {
    return this.prisma.bike.count({
      where: {
        tenantId,
        condition,
        deletedAt: null,
      },
    });
  }

  async getAggregateStats(tenantId: string): Promise<any> {
    const [totalBikes, availableBikes, inUseBikes, maintenanceBikes] = await Promise.all([
      this.prisma.bike.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      }),
      this.prisma.bike.count({
        where: {
          tenantId,
          status: 'available',
          deletedAt: null,
        },
      }),
      this.prisma.bike.count({
        where: {
          tenantId,
          status: 'in_use',
          deletedAt: null,
        },
      }),
      this.prisma.bike.count({
        where: {
          tenantId,
          status: 'maintenance',
          deletedAt: null,
        },
      }),
    ]);

    return {
      totalBikes,
      availableBikes,
      inUseBikes,
      maintenanceBikes,
    };
  }

  async findWithRentals(tenantId: string, bikeId: string): Promise<any> {
    return this.prisma.bike.findFirst({
      where: {
        id: bikeId,
        tenantId,
        deletedAt: null,
      },
      include: {
        rentals: {
          where: {
            deletedAt: null,
          },
          orderBy: { checkoutTime: 'desc' },
          take: 10,
        },
      },
    });
  }

  async findWithMaintenance(tenantId: string, bikeId: string): Promise<any> {
    return this.prisma.bike.findFirst({
      where: {
        id: bikeId,
        tenantId,
        deletedAt: null,
      },
      include: {
        maintenance: {
          where: {
            deletedAt: null,
          },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
  }

  async getTotalPurchaseValue(tenantId: string): Promise<number> {
    const result = await this.prisma.bike.aggregate({
      where: {
        tenantId,
        deletedAt: null,
      },
      _sum: {
        purchasePrice: true,
      },
    });

    return result._sum.purchasePrice || 0;
  }

  async getAverageAge(tenantId: string): Promise<number> {
    const bikes = await this.prisma.bike.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        purchaseDate: true,
      },
    });

    if (bikes.length === 0) return 0;

    const now = new Date();
    const totalDays = bikes.reduce((sum, bike) => {
      const days = Math.floor((now.getTime() - new Date(bike.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return Math.round(totalDays / bikes.length);
  }

  async search(tenantId: string, query: string, page: number, limit: number): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.bike.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { model: { contains: query, mode: 'insensitive' } },
            { serialNumber: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
            { bikeType: { contains: query, mode: 'insensitive' } },
            { location: { contains: query, mode: 'insensitive' } },
          ],
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bike.count({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { model: { contains: query, mode: 'insensitive' } },
            { serialNumber: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
            { bikeType: { contains: query, mode: 'insensitive' } },
            { location: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return { data, total };
  }

  async updateStatus(tenantId: string, id: string, status: string): Promise<any> {
    return this.prisma.bike.update({
      where: {
        id,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async bulkUpdateStatus(tenantId: string, ids: string[], status: string): Promise<Prisma.BatchPayload> {
    return this.prisma.bike.updateMany({
      where: {
        id: { in: ids },
        tenantId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async restore(tenantId: string, id: string): Promise<any> {
    return this.prisma.bike.update({
      where: {
        id,
      },
      data: {
        deletedAt: null,
      },
    });
  }

  async hardDelete(tenantId: string, id: string): Promise<any> {
    return this.prisma.bike.delete({
      where: {
        id,
      },
    });
  }

  async findByBrand(tenantId: string, brand: string, page: number, limit: number): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.bike.findMany({
        where: {
          tenantId,
          brand,
          deletedAt: null,
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bike.count({
        where: {
          tenantId,
          brand,
          deletedAt: null,
        },
      }),
    ]);

    return { data, total };
  }

  async getDistinctBrands(tenantId: string): Promise<string[]> {
    const brands = await this.prisma.bike.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      distinct: ['brand'],
      select: {
        brand: true,
      },
    });

    return brands.map((b) => b.brand).filter((b): b is string => b !== null);
  }

  async getDistinctLocations(tenantId: string): Promise<string[]> {
    const locations = await this.prisma.bike.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      distinct: ['location'],
      select: {
        location: true,
      },
    });

    return locations.map((l) => l.location).filter((l): l is string => l !== null);
  }

  async getDistinctTypes(tenantId: string): Promise<string[]> {
    const types = await this.prisma.bike.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      distinct: ['bikeType'],
      select: {
        bikeType: true,
      },
    });

    return types.map((t) => t.bikeType).filter((t): t is string => t !== null);
  }
}