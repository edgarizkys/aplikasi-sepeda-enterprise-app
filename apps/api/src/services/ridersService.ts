import { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';
import { CreateRiderInput, UpdateRiderInput, RiderQueryParams } from '../schemas/riders.schema';

export class RidersService {
  constructor(private prisma: PrismaClient) {}

  async getAllRiders(tenantId: string, params: RiderQueryParams) {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;
      const search = params.search || '';

      const whereClause: Prisma.RiderWhereInput = {
        tenantId,
        deletedAt: null,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };

      const [riders, total] = await Promise.all([
        this.prisma.rider.findMany({
          where: whereClause,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
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
        this.prisma.rider.count({ where: whereClause }),
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
    } catch (error) {
      throw new AppError(
        'RIDERS_FETCH_ERROR',
        'Gagal mengambil data pengguna',
        500,
        error
      );
    }
  }

  async getRiderById(tenantId: string, riderId: string) {
    try {
      const rider = await this.prisma.rider.findFirst({
        where: {
          id: riderId,
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
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
        throw new AppError(
          'RIDER_NOT_FOUND',
          'Pengguna tidak ditemukan',
          404
        );
      }

      return rider;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'RIDER_FETCH_ERROR',
        'Gagal mengambil data pengguna',
        500,
        error
      );
    }
  }

  async createRider(tenantId: string, data: CreateRiderInput) {
    try {
      // Check if email already exists in tenant
      const existingRider = await this.prisma.rider.findFirst({
        where: {
          email: data.email,
          tenantId,
          deletedAt: null,
        },
      });

      if (existingRider) {
        throw new AppError(
          'RIDER_EMAIL_EXISTS',
          'Email sudah terdaftar',
          409
        );
      }

      // Check if employee_id already exists in tenant
      if (data.employeeId) {
        const existingEmployeeId = await this.prisma.rider.findFirst({
          where: {
            employeeId: data.employeeId,
            tenantId,
            deletedAt: null,
          },
        });

        if (existingEmployeeId) {
          throw new AppError(
            'RIDER_EMPLOYEE_ID_EXISTS',
            'ID Karyawan sudah terdaftar',
            409
          );
        }
      }

      const rider = await this.prisma.rider.create({
        data: {
          tenantId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          employeeId: data.employeeId || null,
          department: data.department || null,
          joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
        },
        select: {
          id: true,
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
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'RIDER_CREATE_ERROR',
        'Gagal membuat pengguna baru',
        500,
        error
      );
    }
  }

  async updateRider(tenantId: string, riderId: string, data: UpdateRiderInput) {
    try {
      const rider = await this.prisma.rider.findFirst({
        where: {
          id: riderId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!rider) {
        throw new AppError(
          'RIDER_NOT_FOUND',
          'Pengguna tidak ditemukan',
          404
        );
      }

      // Check if new email already exists
      if (data.email && data.email !== rider.email) {
        const existingEmail = await this.prisma.rider.findFirst({
          where: {
            email: data.email,
            tenantId,
            deletedAt: null,
            NOT: { id: riderId },
          },
        });

        if (existingEmail) {
          throw new AppError(
            'RIDER_EMAIL_EXISTS',
            'Email sudah terdaftar',
            409
          );
        }
      }

      // Check if new employee_id already exists
      if (
        data.employeeId &&
        data.employeeId !== rider.employeeId
      ) {
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
            'RIDER_EMPLOYEE_ID_EXISTS',
            'ID Karyawan sudah terdaftar',
            409
          );
        }
      }

      const updatedRider = await this.prisma.rider.update({
        where: { id: riderId },
        data: {
          name: data.name || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          employeeId: data.employeeId || undefined,
          department: data.department || undefined,
          joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
        },
        select: {
          id: true,
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

      return updatedRider;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'RIDER_UPDATE_ERROR',
        'Gagal memperbarui data pengguna',
        500,
        error
      );
    }
  }

  async softDeleteRider(tenantId: string, riderId: string) {
    try {
      const rider = await this.prisma.rider.findFirst({
        where: {
          id: riderId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!rider) {
        throw new AppError(
          'RIDER_NOT_FOUND',
          'Pengguna tidak ditemukan',
          404
        );
      }

      // Check if rider has active rentals
      const activeRental = await this.prisma.rental.findFirst({
        where: {
          riderId,
          status: 'active',
          deletedAt: null,
        },
      });

      if (activeRental) {
        throw new AppError(
          'RIDER_HAS_ACTIVE_RENTAL',
          'Pengguna memiliki peminjaman aktif',
          400
        );
      }

      await this.prisma.rider.update({
        where: { id: riderId },
        data: { deletedAt: new Date() },
      });

      return { success: true, message: 'Pengguna berhasil dihapus' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'RIDER_DELETE_ERROR',
        'Gagal menghapus pengguna',
        500,
        error
      );
    }
  }

  async getRiderRentalHistory(
    tenantId: string,
    riderId: string,
    params: RiderQueryParams
  ) {
    try {
      const rider = await this.prisma.rider.findFirst({
        where: {
          id: riderId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!rider) {
        throw new AppError(
          'RIDER_NOT_FOUND',
          'Pengguna tidak ditemukan',
          404
        );
      }

      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;

      const [rentals, total] = await Promise.all([
        this.prisma.rental.findMany({
          where: {
            riderId,
            tenantId,
            deletedAt: null,
          },
          skip: offset,
          take: limit,
          orderBy: { checkoutTime: 'desc' },
          include: {
            bike: {
              select: {
                id: true,
                model: true,
                brand: true,
              },
            },
          },
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
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'RIDER_RENTAL_HISTORY_ERROR',
        'Gagal mengambil riwayat peminjaman',
        500,
        error
      );
    }
  }

  async getRiderStats(tenantId: string, riderId: string) {
    try {
      const rider = await this.prisma.rider.findFirst({
        where: {
          id: riderId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!rider) {
        throw new AppError(
          'RIDER_NOT_FOUND',
          'Pengguna tidak ditemukan',
          404
        );
      }

      const [totalRentals, completedRentals, totalHours, activeRental] =
        await Promise.all([
          this.prisma.rental.count({
            where: {
              riderId,
              tenantId,
              deletedAt: null,
            },
          }),
          this.prisma.rental.count({
            where: {
              riderId,
              tenantId,
              status: 'completed',
              deletedAt: null,
            },
          }),
          this.prisma.rental.aggregate({
            where: {
              riderId,
              tenantId,
              status: 'completed',
              deletedAt: null,
            },
            _sum: {
              durationHours: true,
            },
          }),
          this.prisma.rental.findFirst({
            where: {
              riderId,
              tenantId,
              status: 'active',
              deletedAt: null,
            },
          }),
        ]);

      return {
        riderId,
        totalRentals,
        completedRentals,
        totalHours: activeRental?._sum?.durationHours || 0,
        hasActiveRental: !!activeRental,
        joinDate: rider.joinDate,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        'RIDER_STATS_ERROR',
        'Gagal mengambil statistik pengguna',
        500,
        error
      );
    }
  }
}