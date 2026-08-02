import axios, { AxiosInstance, AxiosError } from 'axios';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface Item {
  id: number;
  name: string;
  description: string;
  status: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface CreateItemInput {
  name: string;
  description: string;
  status: string;
}

interface UpdateItemInput {
  name?: string;
  description?: string;
  status?: string;
}

interface DashboardMetrics {
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  recentActivity: Array<{
    id: number;
    action: string;
    itemId: number;
    timestamp: string;
  }>;
}

interface AnalyticsData {
  period: string;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  statusDistribution: Record<string, number>;
  creationTrend: Array<{
    date: string;
    count: number;
  }>;
}

class ApiClient {
  private client: AxiosInstance;
  private tenantId: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api') {
    this.tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'default_tenant';

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': this.tenantId,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers['x-tenant-id'] = this.tenantId;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
                { refreshToken },
                {
                  headers: {
                    'x-tenant-id': this.tenantId,
                  },
                }
              );

              const { accessToken, refreshToken: newRefreshToken } = response.data.data;
              this.setTokens(accessToken, newRefreshToken);

              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  // Items endpoints
  async getAllItems(params: PaginationParams = {}): Promise<ApiResponse<Item[]>> {
    try {
      const response = await this.client.get<ApiResponse<Item[]>>('/items', {
        params: {
          page: params.page || 1,
          limit: params.limit || 20,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getItemById(id: number): Promise<ApiResponse<Item>> {
    try {
      const response = await this.client.get<ApiResponse<Item>>(`/items/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createItem(data: CreateItemInput): Promise<ApiResponse<Item>> {
    try {
      const response = await this.client.post<ApiResponse<Item>>('/items', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateItem(id: number, data: UpdateItemInput): Promise<ApiResponse<Item>> {
    try {
      const response = await this.client.put<ApiResponse<Item>>(`/items/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteItem(id: number): Promise<ApiResponse<{ id: number }>> {
    try {
      const response = await this.client.delete<ApiResponse<{ id: number }>>(`/items/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async searchItems(query: string, params: PaginationParams = {}): Promise<ApiResponse<Item[]>> {
    try {
      const response = await this.client.get<ApiResponse<Item[]>>('/items/search', {
        params: {
          q: query,
          page: params.page || 1,
          limit: params.limit || 20,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async filterItems(
    filters: Record<string, any>,
    params: PaginationParams = {}
  ): Promise<ApiResponse<Item[]>> {
    try {
      const response = await this.client.get<ApiResponse<Item[]>>('/items/filter', {
        params: {
          ...filters,
          page: params.page || 1,
          limit: params.limit || 20,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Dashboard endpoints
  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    try {
      const response = await this.client.get<ApiResponse<DashboardMetrics>>('/dashboard/metrics');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDashboardSummary(): Promise<
    ApiResponse<{
      totalItems: number;
      activeItems: number;
      inactiveItems: number;
      lastUpdated: string;
    }>
  > {
    try {
      const response = await this.client.get<
        ApiResponse<{
          totalItems: number;
          activeItems: number;
          inactiveItems: number;
          lastUpdated: string;
        }>
      >('/dashboard/summary');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Analytics endpoints
  async getAnalytics(startDate?: string, endDate?: string): Promise<ApiResponse<AnalyticsData>> {
    try {
      const response = await this.client.get<ApiResponse<AnalyticsData>>('/analytics', {
        params: {
          startDate,
          endDate,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAnalyticsByStatus(): Promise<
    ApiResponse<Array<{ status: string; count: number; percentage: number }>>
  > {
    try {
      const response = await this.client.get<
        ApiResponse<Array<{ status: string; count: number; percentage: number }>>
      >('/analytics/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getAnalyticsTrend(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<
    ApiResponse<
      Array<{
        date: string;
        created: number;
        updated: number;
        deleted: number;
      }>
    >
  > {
    try {
      const response = await this.client.get<
        ApiResponse<
          Array<{
            date: string;
            created: number;
            updated: number;
            deleted: number;
          }>
        >
      >('/analytics/trend', {
        params: { period },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async exportAnalytics(format: 'csv' | 'pdf' = 'csv'): Promise<Blob> {
    try {
      const response = await this.client.get('/analytics/export', {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await this.client.get<ApiResponse<{ status: string; timestamp: string }>>(
        '/health'
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      const { code, message } = error.response.data.error;
      const err = new Error(message);
      (err as any).code = code;
      (err as any).statusCode = error.response.status;
      return err;
    }

    if (error.message) {
      return error;
    }

    return new Error('Terjadi kesalahan tak terduga');
  }
}

export const apiClient = new ApiClient();

export type { ApiResponse, Item, CreateItemInput, UpdateItemInput, DashboardMetrics, AnalyticsData };