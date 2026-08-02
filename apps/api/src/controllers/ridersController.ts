import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';
import RiderService from '../services/riderService';

const prisma = new PrismaClient();

// Validation schemas
const createRiderSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit').max(15),
  employee_id: z.string().min(3, 'ID karyawan minimal 3 karakter'),
  department: z.string().min(2, 'Departemen minimal 2 karakter').max(100),
  join_date: z.string().datetime('Format tanggal tidak valid'),
});

const updateRiderSchema = createRiderSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  department: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'join_date']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

class RidersController {
  private riderService: RiderService;

  constructor() {
    this.riderService = new RiderService();
  }

  // Get all riders with pagination and filtering
  getAllRiders = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

    const query = querySchema.parse(req.query);
    const { page, limit, search, department, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    const whereClause: any = {
      tenantId,
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employee_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      whereClause.department = {
        contains: department,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      prisma.rider.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          employee_id: true,
          department: true,
          join_date: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.rider.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  // Get rider by ID
  getRiderById = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
    const { id } = req.params;

    const rider = await prisma.rider.findFirst({
      where: {
        id: parseInt(id),
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employee_id: true,
        department: true,
        join_date: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!rider) {
      throw new AppError('Pengguna tidak ditemukan', 404, 'RIDER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: rider,
    });
  });

  // Create new rider
  createRider = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

    const validated = createRiderSchema.parse(req.body);

    // Check if employee_id already exists
    const existingRider = await prisma.rider.findFirst({
      where: {
        employee_id: validated.employee_id,
        tenantId,
        deletedAt: null,
      },
    });

    if (existingRider) {
      throw new AppError(
        'ID karyawan sudah terdaftar',
        409,
        'EMPLOYEE_ID_EXISTS'
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.rider.findFirst({
      where: {
        email: validated.email,
        tenantId,
        deletedAt: null,
      },
    });

    if (existingEmail) {
      throw new AppError('Email sudah terdaftar', 409, 'EMAIL_EXISTS');
    }

    const rider = await prisma.rider.create({
      data: {
        ...validated,
        tenantId,
        join_date: new Date(validated.join_date),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employee_id: true,
        department: true,
        join_date: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: rider,
    });
  });

  // Update rider
  updateRider = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
    const { id } = req.params;

    const validated = updateRiderSchema.parse(req.body);

    const rider = await prisma.rider.findFirst({
      where: {
        id: parseInt(id),
        tenantId,
        deletedAt: null,
      },
    });

    if (!rider) {
      throw new AppError('Pengguna tidak ditemukan', 404, 'RIDER_NOT_FOUND');
    }

    // Check if new email already exists (if email is being updated)
    if (validated.email && validated.email !== rider.email) {
      const existingEmail = await prisma.rider.findFirst({
        where: {
          email: validated.email,
          tenantId,
          deletedAt: null,
          id: { not: parseInt(id) },
        },
      });

      if (existingEmail) {
        throw new AppError('Email sudah terdaftar', 409, 'EMAIL_EXISTS');
      }
    }

    // Check if new employee_id already exists (if employee_id is being updated)
    if (validated.employee_id && validated.employee_id !== rider.employee_id) {
      const existingEmployeeId = await prisma.rider.findFirst({
        where: {
          employee_id: validated.employee_id,
          tenantId,
          deletedAt: null,
          id: { not: parseInt(id) },
        },
      });

      if (existingEmployeeId) {
        throw new AppError(
          'ID karyawan sudah terdaftar',
          409,
          'EMPLOYEE_ID_EXISTS'
        );
      }
    }

    const updateData: any = { ...validated };
    if (validated.join_date) {
      updateData.join_date = new Date(validated.join_date);
    }

    const updatedRider = await prisma.rider.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employee_id: true,
        department: true,
        join_date: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: updatedRider,
    });
  });

  // Delete rider (soft delete)
  deleteRider = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
    const { id } = req.params;

    const rider = await prisma.rider.findFirst({
      where: {
        id: parseInt(id),
        tenantId,
        deletedAt: null,
      },
    });

    if (!rider) {
      throw new AppError('Pengguna tidak ditemukan', 404, 'RIDER_NOT_FOUND');
    }

    // Check if rider has active rentals
    const activeRental = await prisma.rental.findFirst({
      where: {
        rider_id: parseInt(id),
        status: 'active',
        deletedAt: null,
      },
    });

    if (activeRental) {
      throw new AppError(
        'Tidak dapat menghapus pengguna dengan peminjaman aktif',
        400,
        'RIDER_HAS_ACTIVE_RENTALS'
      );
    }

    await prisma.rider.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        message: 'Pengguna berhasil dihapus',
        id: parseInt(id),
      },
    });
  });

  // Get rider rental history
  getRiderRentalHistory = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
    const { id } = req.params;

    const query = querySchema.parse(req.query);
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const rider = await prisma.rider.findFirst({
      where: {
        id: parseInt(id),
        tenantId,
        deletedAt: null,
      },
    });

    if (!rider) {
      throw new AppError('Pengguna tidak ditemukan', 404, 'RIDER_NOT_FOUND');
    }

    const [rentals, total] = await Promise.all([
      prisma.rental.findMany({
        where: {
          rider_id: parseInt(id),
          tenantId,
          deletedAt: null,
        },
        skip: offset,
        take: limit,
        orderBy: { checkout_time: 'desc' },
        select: {
          id: true,
          bike_id: true,
          checkout_time: true,
          return_time: true,
          duration_hours: true,
          status: true,
          purpose: true,
          createdAt: true,
        },
      }),
      prisma.rental.count({
        where: {
          rider_id: parseInt(id),
          tenantId,
          deletedAt: null,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        rider: {
          id: rider.id,
          name: rider.name,
          email: rider.email,
        },
        rentals,
      },
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  });

  // Get riders statistics
  getRidersStatistics = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

    const [totalRiders, activeRentals, departmentStats] = await Promise.all([
      prisma.rider.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      }),
      prisma.rental.count({
        where: {
          tenantId,
          status: 'active',
          deletedAt: null,
        },
      }),
      prisma.rider.groupBy({
        by: ['department'],
        where: {
          tenantId,
          deletedAt: null,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    const departmentBreakdown = departmentStats.map((dept) => ({
      department: dept.department,
      count: dept._count.id,
    }));

    res.json({
      success: true,
      data: {
        totalRiders,
        ridersWithActiveRentals: activeRentals,
        departmentBreakdown,
      },
    });
  });
}

export default RidersController;