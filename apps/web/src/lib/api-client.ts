import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

// Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// Error handling
export class AppApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppApiError';
  }
}

// Token storage utilities
const TOKEN_KEY = 'app_access_token';
const REFRESH_TOKEN_KEY = 'app_refresh_token';
const TENANT_ID_KEY = 'tenant_id';

const getStorageValue = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const setStorageValue = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
};

const removeStorageValue = (key: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
};

// API Client class
class ApiClient {
  private axiosInstance: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api') {
    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = getStorageValue(TOKEN_KEY);
        const tenantId = getStorageValue(TENANT_ID_KEY);

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (tenantId && config.headers) {
          config.headers['X-Tenant-ID'] = tenantId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => this.handleResponseError(error)
    );
  }

  private async handleResponseError(error: AxiosError): Promise<never> {
    const status = error.response?.status;
    const data = error.response?.data as ApiResponse | undefined;

    // Handle 401 Unauthorized - attempt token refresh
    if (status === 401 && !error.config?.headers['X-Skip-Refresh']) {
      const refreshToken = getStorageValue(REFRESH_TOKEN_KEY);

      if (refreshToken) {
        try {
          if (!this.refreshPromise) {
            this.refreshPromise = this.performTokenRefresh(refreshToken);
          }

          const newAccessToken = await this.refreshPromise;
          this.refreshPromise = null;

          setStorageValue(TOKEN_KEY, newAccessToken);

          if (error.config && error.config.headers) {
            error.config.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          return this.axiosInstance(error.config!);
        } catch (refreshError) {
          this.clearAuthTokens();
          throw new AppApiError(
            'REFRESH_TOKEN_EXPIRED',
            'Sesi Anda telah berakhir. Silakan login kembali.',
            401,
            refreshError
          );
        }
      }
    }

    // Handle validation errors (422)
    if (status === 422) {
      throw new AppApiError(
        data?.error?.code || 'VALIDATION_ERROR',
        data?.error?.message || 'Data tidak valid',
        422,
        error
      );
    }

    // Handle server errors (5xx)
    if (status && status >= 500) {
      throw new AppApiError(
        data?.error?.code || 'SERVER_ERROR',
        'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
        status,
        error
      );
    }

    // Handle generic errors
    throw new AppApiError(
      data?.error?.code || 'UNKNOWN_ERROR',
      data?.error?.message || error.message || 'Terjadi kesalahan',
      status,
      error
    );
  }

  private async performTokenRefresh(refreshToken: string): Promise<string> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<AuthTokens>>(
        '/auth/refresh',
        { refreshToken },
        { headers: { 'X-Skip-Refresh': 'true' } }
      );

      if (response.data.success && response.data.data?.accessToken) {
        return response.data.data.accessToken;
      }

      throw new Error('Invalid refresh response');
    } catch (error) {
      throw error;
    }
  }

  // Auth methods
  public async login(email: string, password: string): Promise<AuthTokens> {
    const response = await this.axiosInstance.post<ApiResponse<AuthTokens & { tenantId: string }>>(
      '/auth/login',
      { email, password },
      { headers: { 'X-Skip-Refresh': 'true' } }
    );

    if (!response.data.success || !response.data.data) {
      throw new AppApiError('LOGIN_FAILED', 'Login gagal. Periksa email dan password Anda.', 400);
    }

    const { accessToken, refreshToken, tenantId } = response.data.data;
    setStorageValue(TOKEN_KEY, accessToken);
    setStorageValue(REFRESH_TOKEN_KEY, refreshToken);
    setStorageValue(TENANT_ID_KEY, tenantId);

    return { accessToken, refreshToken };
  }

  public async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/logout');
    } catch {
      // Logout silently even if request fails
    } finally {
      this.clearAuthTokens();
    }
  }

  public clearAuthTokens(): void {
    removeStorageValue(TOKEN_KEY);
    removeStorageValue(REFRESH_TOKEN_KEY);
    removeStorageValue(TENANT_ID_KEY);
  }

  public getAccessToken(): string | null {
    return getStorageValue(TOKEN_KEY);
  }

  public getTenantId(): string | null {
    return getStorageValue(TENANT_ID_KEY);
  }

  // Generic request methods
  public async get<T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.get<ApiResponse<T>>(url, {
      ...config,
      params,
    });

    if (!response.data.success) {
      throw new AppApiError(
        response.data.error?.code || 'GET_ERROR',
        response.data.error?.message || 'Gagal mengambil data',
        response.status
      );
    }

    return response.data.data as T;
  }

  public async post<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);

    if (!response.data.success) {
      throw new AppApiError(
        response.data.error?.code || 'POST_ERROR',
        response.data.error?.message || 'Gagal membuat data',
        response.status
      );
    }

    return response.data.data as T;
  }

  public async put<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);

    if (!response.data.success) {
      throw new AppApiError(
        response.data.error?.code || 'PUT_ERROR',
        response.data.error?.message || 'Gagal memperbarui data',
        response.status
      );
    }

    return response.data.data as T;
  }

  public async patch<T = unknown>(
    url: string,
    data?: Record<string, unknown>,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config);

    if (!response.data.success) {
      throw new AppApiError(
        response.data.error?.code || 'PATCH_ERROR',
        response.data.error?.message || 'Gagal memperbarui data',
        response.status
      );
    }

    return response.data.data as T;
  }

  public async delete<T = unknown>(
    url: string,
    config?: ApiRequestConfig
  ): Promise<T> {
    const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);

    if (!response.data.success) {
      throw new AppApiError(
        response.data.error?.code || 'DELETE_ERROR',
        response.data.error?.message || 'Gagal menghapus data',
        response.status
      );
    }

    return response.data.data as T;
  }

  // Pagination helper
  public async getPaginated<T = unknown>(
    url: string,
    params?: PaginationParams & Record<string, unknown>,
    config?: ApiRequestConfig
  ): Promise<{ data: T[]; meta: { page: number; limit: number; total: number } }> {
    const response = await this.axiosInstance.get<ApiResponse<T[]>>(url, {
      ...config,
      params: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        ...params,
      },
    });

    if (!response.data.success) {
      throw new AppApiError(
        response.data.error?.code || 'PAGINATE_ERROR',
        response.data.error?.message || 'Gagal mengambil data',
        response.status
      );
    }

    return {
      data: response.data.data as T[],
      meta: response.data.meta || { page: 1, limit: 20, total: 0 },
    };
  }
}

// Singleton instance
export const apiClient = new ApiClient();

export default apiClient;