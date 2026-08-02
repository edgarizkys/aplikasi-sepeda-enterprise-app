import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/appError';

export class RidersRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    tenantId: string,
    filters?: {
      page?: number;
      limit?: number;
      search?: string;
      department?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';

    const where: Prisma.RiderWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { employeeId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.department) {
      where.department = filters.department;
    }

    const [riders, total] = await Promise.all([
      this.prisma.rider.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          tenantId: true,
          name: true,
          email: true,
          phone: true,
          employeeId: true,
          department: true,
          joinDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.rider.count({ where }),
    ]);

    return {
      data: riders,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantId: string, riderId: string) {
    const rider = await this.prisma.rider.findFirst({
      where: {
        id: riderId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        joinDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!rider) {
      throw new AppError('Pengguna tidak ditemukan', 404, 'RIDER_NOT_FOUND');
    }

    return rider;
  }

  async findByEmail(tenantId: string, email: string) {
    return this.prisma.rider.findFirst({
      where: {
        email,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        joinDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmployeeId(tenantId: string, employeeId: string) {
    return this.prisma.rider.findFirst({
      where: {
        employeeId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        joinDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      email: string;
      phone: string;
      employeeId: string;
      department: string;
      joinDate: Date;
    }
  ) {
    const existingEmail = await this.findByEmail(tenantId, data.email);
    if (existingEmail) {
      throw new AppError('Email sudah terdaftar', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const existingEmployeeId = await this.findByEmployeeId(
      tenantId,
      data.employeeId
    );
    if (existingEmployeeId) {
      throw new AppError(
        'ID Karyawan sudah terdaftar',
        409,
        'EMPLOYEE_ID_ALREADY_EXISTS'
      );
    }

    const rider = await this.prisma.rider.create({
      data: {
        ...data,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        joinDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return rider;
  }

  async update(
    tenantId: string,
    riderId: string,
    data: Partial<{
      name: string;
      email: string;
      phone: string;
      employeeId: string;
      department: string;
      joinDate: Date;
    }>
  ) {
    await this.findById(tenantId, riderId);

    if (data.email) {
      const existingEmail = await this.prisma.rider.findFirst({
        where: {
          email: data.email,
          tenantId,
          deletedAt: null,
          NOT: { id: riderId },
        },
      });

      if (existingEmail) {
        throw new AppError('Email sudah terdaftar', 409, 'EMAIL_ALREADY_EXISTS');
      }
    }

    if (data.employeeId) {
      const existingEmployeeId = await this.prisma.rider.findFirst({
        where: {
          employeeId: data.employeeId,
          tenantId,
          deletedAt: null,
          NOT: { id: riderId },
        },
      });

      if (existingEmployeeId) {
        throw new AppError(
          'ID Karyawan sudah terdaftar',
          409,
          'EMPLOYEE_ID_ALREADY_EXISTS'
        );
      }
    }

    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data,
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        joinDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return rider;
  }

  async softDelete(tenantId: string, riderId: string) {
    await this.findById(tenantId, riderId);

    const activeRentals = await this.prisma.rental.findFirst({
      where: {
        riderId,
        status: { in: ['active', 'pending'] },
        deletedAt: null,
      },
    });

    if (activeRentals) {
      throw new AppError(
        'Tidak dapat menghapus pengguna dengan peminjaman aktif',
        409,
        'ACTIVE_RENTALS_EXIST'
      );
    }

    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        joinDate: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    return rider;
  }

  async delete(tenantId: string, riderId: string) {
    await this.findById(tenantId, riderId);

    const activeRentals = await this.prisma.rental.findFirst({
      where: {
        riderId,
        status: { in: ['active', 'pending'] },
      },
    });

    if (activeRentals) {
      throw new AppError(
        'Tidak dapat menghapus pengguna dengan peminjaman aktif',
        409,
        'ACTIVE_RENTALS_EXIST'
      );
    }

    await this.prisma.rider.delete({
      where: { id: riderId },
    });

    return { success: true };
  }

  async getDepartments(tenantId: string) {
    const departments = await this.prisma.rider.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      distinct: ['department'],
      select: {
        department: true,
      },
    });

    return departments.map((d) => d.department).filter(Boolean);
  }

  async getRiderStats(tenantId: string) {
    const [totalRiders, departmentCounts] = await Promise.all([
      this.prisma.rider.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.rider.groupBy({
        by: ['department'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      total: totalRiders,
      byDepartment: departmentCounts.map((item) => ({
        department: item.department,
        count: item._count,
      })),
    };
  }

  async getRiderRentalHistory(
    tenantId: string,
    riderId: string,
    filters?: { limit?: number; offset?: number }
  ) {
    await this.findById(tenantId, riderId);

    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    const [rentals, total] = await Promise.all([
      this.prisma.rental.findMany({
        where: {
          riderId,
          tenantId,
          deletedAt: null,
        },
        include: {
          bike: {
            select: {
              id: true,
              model: true,
              brand: true,
              bikeType: true,
            },
          },
        },
        orderBy: { checkoutTime: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.rental.count({
        where: {
          riderId,
          tenantId,
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: rentals,
      meta: {
        limit,
        offset,
        total,
      },
    };
  }
}