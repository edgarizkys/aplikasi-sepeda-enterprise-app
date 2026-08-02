import { z } from 'zod';

// ============================================================================
// BIKES VALIDATORS
// ============================================================================

export const createBikeSchema = z.object({
  model: z.string().min(1, 'Model harus diisi').max(255),
  serial_number: z.string().min(1, 'Nomor seri harus diisi').max(255).unique('Nomor seri sudah ada'),
  brand: z.string().min(1, 'Merek harus diisi').max(255),
  bike_type: z.string().min(1, 'Tipe sepeda harus diisi').max(100),
  purchase_date: z.string().date('Format tanggal tidak valid'),
  purchase_price: z.number().positive('Harga beli harus lebih dari 0'),
  condition: z.enum(['excellent', 'good', 'fair', 'poor'], {
    errorMap: () => ({ message: 'Kondisi tidak valid' }),
  }),
  status: z.enum(['available', 'in_use', 'maintenance', 'retired'], {
    errorMap: () => ({ message: 'Status tidak valid' }),
  }),
  location: z.string().min(1, 'Lokasi harus diisi').max(255),
});

export const updateBikeSchema = createBikeSchema.partial();

export const getBikeParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID sepeda tidak valid'),
});

export const listBikesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['available', 'in_use', 'maintenance', 'retired']).optional(),
  bike_type: z.string().optional(),
  brand: z.string().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['model', 'purchase_date', 'purchase_price', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// RIDERS VALIDATORS
// ============================================================================

export const createRiderSchema = z.object({
  name: z.string().min(1, 'Nama harus diisi').max(255),
  email: z.string().email('Format email tidak valid').max(255),
  phone: z.string().min(10, 'Nomor telepon minimal 10 digit').max(20),
  employee_id: z.string().min(1, 'ID Karyawan harus diisi').max(100),
  department: z.string().min(1, 'Departemen harus diisi').max(255),
  join_date: z.string().date('Format tanggal tidak valid'),
});

export const updateRiderSchema = createRiderSchema.partial();

export const getRiderParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID pengguna tidak valid'),
});

export const listRidersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  department: z.string().optional(),
  search: z.string().max(255).optional(),
  sortBy: z.enum(['name', 'join_date', 'employee_id', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// RENTALS VALIDATORS
// ============================================================================

export const createRentalSchema = z.object({
  rider_id: z.string().regex(/^\d+$/, 'ID pengguna tidak valid'),
  bike_id: z.string().regex(/^\d+$/, 'ID sepeda tidak valid'),
  checkout_time: z.string().datetime('Format waktu tidak valid'),
  return_time: z.string().datetime('Format waktu tidak valid').optional().nullable(),
  duration_hours: z.number().positive('Durasi harus lebih dari 0').optional().nullable(),
  status: z.enum(['active', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status peminjaman tidak valid' }),
  }),
  purpose: z.string().min(1, 'Tujuan harus diisi').max(500),
});

export const updateRentalSchema = z.object({
  return_time: z.string().datetime('Format waktu tidak valid').optional().nullable(),
  duration_hours: z.number().positive('Durasi harus lebih dari 0').optional().nullable(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  purpose: z.string().min(1, 'Tujuan harus diisi').max(500).optional(),
});

export const getRentalParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID peminjaman tidak valid'),
});

export const listRentalsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  rider_id: z.string().regex(/^\d+$/).optional(),
  bike_id: z.string().regex(/^\d+$/).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  sortBy: z.enum(['checkout_time', 'duration_hours', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const completeRentalSchema = z.object({
  return_time: z.string().datetime('Format waktu tidak valid'),
});

// ============================================================================
// MAINTENANCE VALIDATORS
// ============================================================================

export const createMaintenanceSchema = z.object({
  bike_id: z.string().regex(/^\d+$/, 'ID sepeda tidak valid'),
  maintenance_type: z.string().min(1, 'Tipe perawatan harus diisi').max(100),
  date: z.string().date('Format tanggal tidak valid'),
  description: z.string().min(1, 'Deskripsi harus diisi').max(1000),
  cost: z.number().nonnegative('Biaya tidak boleh negatif'),
  technician: z.string().min(1, 'Teknisi harus diisi').max(255),
  notes: z.string().max(1000).optional(),
});

export const updateMaintenanceSchema = createMaintenanceSchema.partial();

export const getMaintenanceParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID perawatan tidak valid'),
});

export const listMaintenanceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  bike_id: z.string().regex(/^\d+$/).optional(),
  maintenance_type: z.string().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  sortBy: z.enum(['date', 'cost', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const validateRequest = async <T>(schema: z.ZodSchema, data: unknown): Promise<T> => {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw {
        code: 'VALIDATION_ERROR',
        message: 'Data validasi gagal',
        details: formattedErrors,
      };
    }
    throw error;
  }
};

export type CreateBike = z.infer<typeof createBikeSchema>;
export type UpdateBike = z.infer<typeof updateBikeSchema>;
export type CreateRider = z.infer<typeof createRiderSchema>;
export type UpdateRider = z.infer<typeof updateRiderSchema>;
export type CreateRental = z.infer<typeof createRentalSchema>;
export type UpdateRental = z.infer<typeof updateRentalSchema>;
export type CreateMaintenance = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenance = z.infer<typeof updateMaintenanceSchema>;