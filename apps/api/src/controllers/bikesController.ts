import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';
import { BikeService } from '../services/bikeService';

const prisma = new PrismaClient();
const bikeService = new BikeService(prisma);

// Validation schemas
const createBikeSchema = z.object({
  model: z.string().min(1, 'Model sepeda harus diisi').max(255),
  serial_number: z.string().min(1, 'Nomor seri harus diisi').max(100).unique(),
  brand: z.string().min(1, 'Merek harus diisi').max(100),
  bike_type: z.string().min(1, 'Tipe sepeda harus diisi').max(100),
  purchase_date: z.string().datetime('Format tanggal pembelian tidak valid'),
  purchase_price: z.number().positive('Harga beli harus lebih dari 0'),
  condition: z.enum(['excellent', 'good', 'fair', 'poor'], {
    errorMap: () => ({ message: 'Kondisi harus: excellent, good, fair, atau poor' })
  }),
  status: z.enum(['available', 'in_use', 'maintenance', 'retired'], {
    errorMap: () => ({ message: 'Status harus: available, in_use, maintenance, atau retired' })
  }),
  location: z.string().min(1, 'Lokasi harus diisi').max(255)
});

const updateBikeSchema = createBikeSchema.partial();

const listBikesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page harus angka').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit harus angka').transform(Number).default('20'),
  status: z.enum(['available', 'in_use', 'maintenance', 'retired']).optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  search: z.string().max(255).optional()
});

// Get all bikes with pagination and filters
export const getAllBikes = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

    const query = listBikesQuerySchema.parse(req.query);
    const { page, limit, status, condition, search } = query;
    const offset = (page - 1) * limit;

    const bikes = await bikeService.getAllBikes({
      tenantId,
      offset,
      limit,
      status,
      condition,
      search
    });

    const total = await bikeService.countBikes({
      tenantId,
      status,
      condition,
      search
    });

    res.json({
      success: true,
      data: bikes,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }
);

// Get single bike by ID
export const getBikeById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      throw new AppError('ID sepeda tidak valid', 400, 'INVALID_BIKE_ID');
    }

    const bike = await bikeService.getBikeById({
      id: Number(id),
      tenantId
    });

    if (!bike) {
      throw new AppError('Sepeda tidak ditemukan', 404, 'BIKE_NOT_FOUND');
    }

    res.json({
      success: true,
      data: bike
    });
  }
);

// Create new bike
export const createBike = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

    const validatedData = createBikeSchema.parse(req.body);

    // Check for duplicate serial number
    const existingBike = await prisma.bike.findFirst({
      where: {
        serial_number: validatedData.serial_number,
        tenantId,
        deletedAt: null
      }
    });

    if (existingBike) {
      throw new AppError('Nomor seri sepeda sudah terdaftar', 409, 'DUPLICATE_SERIAL_NUMBER');
    }

    const bike = await bikeService.createBike({
      tenantId,
      ...validatedData,
      purchase_date: new Date(validatedData.purchase_date)
    });

    res.status(201).json({
      success: true,
      data: bike
    });
  }
);

// Update bike
export const updateBike = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      throw new AppError('ID sepeda tidak valid', 400, 'INVALID_BIKE_ID');
    }

    const validatedData = updateBikeSchema.parse(req.body);

    // Check bike exists
    const bike = await prisma.bike.findFirst({
      where: {
        id: Number(id),
        tenantId,
        deletedAt: null
      }
    });

    if (!bike) {
      throw new AppError('Sepeda tidak ditemukan', 404, 'BIKE_NOT_FOUND');
    }

    // Check for duplicate serial number if being updated
    if (validatedData.serial_number && validatedData.serial_number !== bike.serial_number) {
      const duplicate = await prisma.bike.findFirst({
        where: {
          serial_number: validatedData.serial_number,
          tenantId,
          deletedAt: null,
          id: { not: Number(id) }
        }
      });

      if (duplicate) {
        throw new AppError('Nomor seri sepeda sudah terdaftar', 409, 'DUPLICATE_SERIAL_NUMBER');
      }
    }

    const updatePayload = {
      ...validatedData,
      ...(validatedData.purchase_date && {
        purchase_date: new Date(validatedData.purchase_date)
      })
    };

    const updatedBike = await bikeService.updateBike({
      id: Number(id),
      tenantId,
      data: updatePayload
    });

    res.json({
      success: true,
      data: updatedBike
    });
  }
);

// Delete bike (soft delete)
export const deleteBike = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      throw new AppError('ID sepeda tidak valid', 400, 'INVALID_BIKE_ID');
    }

    const bike = await prisma.bike.findFirst({
      where: {
        id: Number(id),
        tenantId,
        deletedAt: null
      }
    });

    if (!bike) {
      throw new AppError('Sepeda tidak ditemukan', 404, 'BIKE_NOT_FOUND');
    }

    // Check if bike is currently in use
    const activeRental = await prisma.rental.findFirst({
      where: {
        bike_id: Number(id),
        status: 'active',
        deletedAt: null
      }
    });

    if (activeRental) {
      throw new AppError('Sepeda sedang digunakan dan tidak dapat dihapus', 409, 'BIKE_IN_USE');
    }

    await bikeService.deleteBike({
      id: Number(id),
      tenantId
    });

    res.json({
      success: true,
      data: { message: 'Sepeda berhasil dihapus' }
    });
  }
);

// Get bikes availability summary
export const getBikesAvailabilitySummary = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

    const summary = await bikeService.getAvailabilitySummary(tenantId);

    res.json({
      success: true,
      data: summary
    });
  }
);

// Get bikes by condition
export const getBikesByCondition = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';
    const { condition } = req.params;

    const validConditions = ['excellent', 'good', 'fair', 'poor'];
    if (!validConditions.includes(condition)) {
      throw new AppError('Kondisi tidak valid', 400, 'INVALID_CONDITION');
    }

    const bikes = await bikeService.getBikesByCondition({
      tenantId,
      condition: condition as any
    });

    res.json({
      success: true,
      data: bikes,
      meta: { total: bikes.length }
    });
  }
);

// Get total bikes value
export const getTotalBikesValue = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

    const totalValue = await bikeService.getTotalBikesValue(tenantId);

    res.json({
      success: true,
      data: { totalValue }
    });
  }
);

// Export bikes data
export const exportBikesData = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default_tenant';

    const bikes = await bikeService.getAllBikes({
      tenantId,
      offset: 0,
      limit: 10000
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sepeda-export-${new Date().toISOString().split('T')[0]}.json"`
    );

    res.json({
      success: true,
      data: bikes,
      exportedAt: new Date().toISOString()
    });
  }
);