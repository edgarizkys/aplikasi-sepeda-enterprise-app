import { z } from 'zod';

// ============================================================================
// ITEMS VALIDATION SCHEMAS
// ============================================================================

export const createItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama item harus diisi')
    .max(255, 'Nama item maksimal 255 karakter'),
  description: z
    .string()
    .min(1, 'Deskripsi harus diisi')
    .max(1000, 'Deskripsi maksimal 1000 karakter'),
  status: z
    .enum(['active', 'inactive', 'archived'], {
      errorMap: () => ({ message: 'Status harus active, inactive, atau archived' }),
    })
    .default('active'),
});

export const updateItemSchema = createItemSchema.partial();

export const getItemSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, 'ID harus berupa angka positif'),
});

export const listItemsQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, 'Halaman harus angka positif')
    .default('1'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, 'Limit harus antara 1-100')
    .default('20'),
  search: z
    .string()
    .max(255, 'Pencarian maksimal 255 karakter')
    .optional(),
  status: z
    .enum(['active', 'inactive', 'archived'])
    .optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .default('desc'),
});

export const deleteItemSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, 'ID harus berupa angka positif'),
});

export const bulkDeleteItemsSchema = z.object({
  ids: z
    .array(
      z
        .string()
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val > 0, 'Setiap ID harus angka positif'),
    )
    .min(1, 'Minimal 1 item untuk dihapus')
    .max(100, 'Maksimal 100 items sekaligus'),
});

// ============================================================================
// ANALYTICS VALIDATION SCHEMAS
// ============================================================================

export const getAnalyticsSchema = z.object({
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Tanggal mulai harus format ISO 8601')
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Tanggal akhir harus format ISO 8601')
    .optional(),
  groupBy: z
    .enum(['daily', 'weekly', 'monthly'])
    .default('daily'),
  metric: z
    .enum(['count', 'revenue', 'growth'])
    .default('count'),
});

// ============================================================================
// DASHBOARD VALIDATION SCHEMAS
// ============================================================================

export const getDashboardSchema = z.object({
  period: z
    .enum(['today', 'week', 'month', 'quarter', 'year'])
    .default('month'),
  compareWithPrevious: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type GetItemInput = z.infer<typeof getItemSchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
export type DeleteItemInput = z.infer<typeof deleteItemSchema>;
export type BulkDeleteItemsInput = z.infer<typeof bulkDeleteItemsSchema>;
export type GetAnalyticsInput = z.infer<typeof getAnalyticsSchema>;
export type GetDashboardInput = z.infer<typeof getDashboardSchema>;