import { Prisma, PrismaClient } from '@prisma/client';
import { AppError, NotFoundError, ValidationError } from '@/lib/errors';
import { paginate, PaginationMeta } from '@/lib/pagination';

interface CreateBikeInput {
  model: string;
  serial_number: string;
  brand: string;
  bike_type: string;
  purchase_date: Date;
  purchase_price: number;
  condition: string;
  status: string;
  location: string;
}

interface UpdateBikeInput {
  model?: string;
  serial_number?: string;
  brand?: string;
  bike_type?: string;
  purchase_date?: Date;
  purchase_price?: number;
  condition?: string;
  status?: string;
  location?: string;
}

interface GetBikesQuery {
  page?: number;
  limit?: number;
  status?: string;
  condition?: string;
  search?: string;
}

interface BikeResponse {
  id: string;
  model: string;
  serial_number: string;
  brand: string;
  bike_type: string;
  purchase_date: Date;
  purchase_price: number;
  condition: string;
  status: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BikesListResponse {
  success: boolean;
  data: BikeResponse[];
  meta: PaginationMeta;
}

interface BikeSingleResponse {
  success: boolean;
  data: BikeResponse;
}

export class BikesService {
  constructor(private prisma: PrismaClient) {}

  async getAllBikes(
    tenantId: string,
    query: GetBikesQuery
  ): Promise<BikesListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const whereCondition: Prisma.BikeWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.condition && { condition: query.condition }),
      ...(query.search && {
        OR: [
          { model: { contains: query.search, mode: 'insensitive' } },
          { serial_number: { contains: query.search, mode: 'insensitive' } },
          { brand: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [bikes, total] = await Promise.all([
      this.prisma.bike.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bike.count({ where: whereCondition }),
    ]);

    const meta = paginate(page, limit, total);

    return {
      success: true,
      data: bikes,
      meta,
    };
  }

  async getBikeById(tenantId: string, bikeId: string): Promise<BikeSingleResponse> {
    const bike = await this.prisma.bike.findFirst({
      where: {
        id: bikeId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!bike) {
      throw new NotFoundError('Sepeda tidak ditemukan');
    }

    return {
      success: true,
      data: bike,
    };
  }

  async createBike(
    tenantId: string,
    input: CreateBikeInput
  ): Promise<BikeSingleResponse> {
    this.validateBikeInput(input);

    const existingBike = await this.prisma.bike.findFirst({
      where: {
        tenantId,
        serial_number: input.serial_number,
        deletedAt: null,
      },
    });

    if (existingBike) {
      throw new ValidationError('Nomor seri sepeda sudah terdaftar');
    }

    const bike = await this.prisma.bike.create({
      data: {
        tenantId,
        model: input.model,
        serial_number: input.serial_number,
        brand: input.brand,
        bike_type: input.bike_type,
        purchase_date: input.purchase_date,
        purchase_price: input.purchase_price,
        condition: input.condition,
        status: input.status,
        location: input.location,
      },
    });

    return {
      success: true,
      data: bike,
    };
  }

  async updateBike(
    tenantId: string,
    bikeId: string,
    input: UpdateBikeInput
  ): Promise<BikeSingleResponse> {
    const bike = await this.prisma.bike.findFirst({
      where: {
        id: bikeId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!bike) {
      throw new NotFoundError('Sepeda tidak ditemukan');
    }

    if (input.serial_number && input.serial_number !== bike.serial_number) {
      const existingBike = await this.prisma.bike.findFirst({
        where: {
          tenantId,
          serial_number: input.serial_number,
          deletedAt: null,
        },
      });

      if (existingBike) {
        throw new ValidationError('Nomor seri sepeda sudah digunakan');
      }
    }

    const updateData: Prisma.BikeUpdateInput = {};

    if (input.model !== undefined) updateData.model = input.model;
    if (input.serial_number !== undefined) updateData.serial_number = input.serial_number;
    if (input.brand !== undefined) updateData.brand = input.brand;
    if (input.bike_type !== undefined) updateData.bike_type = input.bike_type;
    if (input.purchase_date !== undefined) updateData.purchase_date = input.purchase_date;
    if (input.purchase_price !== undefined) updateData.purchase_price = input.purchase_price;
    if (input.condition !== undefined) updateData.condition = input.condition;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.location !== undefined) updateData.location = input.location;

    const updatedBike = await this.prisma.bike.update({
      where: { id: bikeId },
      data: updateData,
    });

    return {
      success: true,
      data: updatedBike,
    };
  }

  async deleteBike(tenantId: string, bikeId: string): Promise<BikeSingleResponse> {
    const bike = await this.prisma.bike.findFirst({
      where: {
        id: bikeId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!bike) {
      throw new NotFoundError('Sepeda tidak ditemukan');
    }

    const hasActiveRentals = await this.prisma.rental.findFirst({
      where: {
        bike_id: bikeId,
        status: 'active',
        deletedAt: null,
      },
    });

    if (hasActiveRentals) {
      throw new ValidationError('Tidak dapat menghapus sepeda yang sedang dipinjam');
    }

    const deletedBike = await this.prisma.bike.update({
      where: { id: bikeId },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      data: deletedBike,
    };
  }

  async getBikesByStatus(
    tenantId: string,
    status: string,
    limit: number = 20
  ): Promise<BikeResponse[]> {
    const bikes = await this.prisma.bike.findMany({
      where: {
        tenantId,
        status,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return bikes;
  }

  async updateBikeStatus(
    tenantId: string,
    bikeId: string,
    status: string
  ): Promise<BikeSingleResponse> {
    const bike = await this.prisma.bike.findFirst({
      where: {
        id: bikeId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!bike) {
      throw new NotFoundError('Sepeda tidak ditemukan');
    }

    const validStatuses = ['available', 'in_use', 'maintenance', 'retired'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Status harus salah satu dari: ${validStatuses.join(', ')}`);
    }

    const updatedBike = await this.prisma.bike.update({
      where: { id: bikeId },
      data: { status },
    });

    return {
      success: true,
      data: updatedBike,
    };
  }

  async updateBikeLocation(
    tenantId: string,
    bikeId: string,
    location: string
  ): Promise<BikeSingleResponse> {
    const bike = await this.prisma.bike.findFirst({
      where: {
        id: bikeId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!bike) {
      throw new NotFoundError('Sepeda tidak ditemukan');
    }

    const updatedBike = await this.prisma.bike.update({
      where: { id: bikeId },
      data: { location },
    });

    return {
      success: true,
      data: updatedBike,
    };
  }

  async getBikeStats(tenantId: string) {
    const [total, available, inUse, maintenance] = await Promise.all([
      this.prisma.bike.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.bike.count({
        where: { tenantId, status: 'available', deletedAt: null },
      }),
      this.prisma.bike.count({
        where: { tenantId, status: 'in_use', deletedAt: null },
      }),
      this.prisma.bike.count({
        where: { tenantId, status: 'maintenance', deletedAt: null },
      }),
    ]);

    return {
      success: true,
      data: {
        total,
        available,
        inUse,
        maintenance,
        utilizationRate: total > 0 ? ((inUse + maintenance) / total) * 100 : 0,
      },
    };
  }

  private validateBikeInput(input: CreateBikeInput): void {
    if (!input.model || input.model.trim().length === 0) {
      throw new ValidationError('Model sepeda harus diisi');
    }

    if (!input.serial_number || input.serial_number.trim().length === 0) {
      throw new ValidationError('Nomor seri sepeda harus diisi');
    }

    if (!input.brand || input.brand.trim().length === 0) {
      throw new ValidationError('Merek sepeda harus diisi');
    }

    if (!input.bike_type || input.bike_type.trim().length === 0) {
      throw new ValidationError('Tipe sepeda harus diisi');
    }

    if (!input.purchase_date) {
      throw new ValidationError('Tanggal pembelian harus diisi');
    }

    if (input.purchase_price <= 0) {
      throw new ValidationError('Harga beli harus lebih dari 0');
    }

    if (!input.condition || input.condition.trim().length === 0) {
      throw new ValidationError('Kondisi sepeda harus diisi');
    }

    if (!input.status || input.status.trim().length === 0) {
      throw new ValidationError('Status sepeda harus diisi');
    }

    if (!input.location || input.location.trim().length === 0) {
      throw new ValidationError('Lokasi sepeda harus diisi');
    }
  }
}