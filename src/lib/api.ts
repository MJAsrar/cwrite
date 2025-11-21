import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiError } from '@/types';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

class ApiClient {
  private client: AxiosInstance;
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryCondition: (error: AxiosError) => {
      // Retry on network errors, timeouts, and 5xx server errors
      return !error.response || 
             error.code === 'NETWORK_ERROR' ||
             error.code === 'ECONNABORTED' ||
             (error.response.status >= 500 && error.response.status < 600);
    }
  };

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: 30000,
      withCredentials: true,
    });

    // Request interceptor to add auth token from localStorage
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Clear token on unauthorized
          localStorage.removeItem('access_token');
          // Don't auto-redirect here, let the component handle it
          // This prevents infinite redirect loops
        }
        
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private categorizeError(error: AxiosError): 'network' | 'auth' | 'validation' | 'server' | 'unknown' {
    if (!error.response) {
      // Network errors, timeouts, etc.
      return 'network';
    }

    const status = error.response.status;
    if (status === 401 || status === 403) {
      return 'auth';
    }
    if (status === 400 || status === 422) {
      return 'validation';
    }
    if (status >= 500) {
      return 'server';
    }
    return 'unknown';
  }

  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<AxiosResponse<T>> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    let lastError: AxiosError;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as AxiosError;
        
        // Don't retry on the last attempt or if retry condition is not met
        if (attempt === config.maxRetries || !config.retryCondition!(lastError)) {
          throw lastError;
        }

        // Don't retry auth errors
        if (this.categorizeError(lastError) === 'auth') {
          throw lastError;
        }

        // Calculate delay and wait before retry
        const delay = this.calculateDelay(attempt, config.baseDelay, config.maxDelay);
        console.warn(`API request failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`, lastError.message);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private handleError(error: AxiosError): ApiError {
    const errorCategory = this.categorizeError(error);
    
    // If we have a response with error data, use it
    if (error.response?.data && typeof error.response.data === 'object') {
      const errorData = error.response.data as any;
      return {
        error: errorData.error || 'api_error',
        message: errorData.message || 'An error occurred',
        timestamp: errorData.timestamp || new Date().toISOString(),
        request_id: errorData.request_id || 'unknown',
        ...errorData,
        category: errorCategory,
        status: error.response.status
      };
    }
    
    // Create appropriate error message based on category
    let message = 'An unexpected error occurred';
    let errorCode = 'unknown_error';

    switch (errorCategory) {
      case 'network':
        if (error.code === 'ECONNABORTED') {
          message = 'Request timed out. Please check your connection and try again.';
          errorCode = 'timeout_error';
        } else {
          message = 'Unable to connect to the server. Please check your internet connection.';
          errorCode = 'network_error';
        }
        break;
      case 'auth':
        message = 'Authentication failed. Please log in again.';
        errorCode = 'auth_error';
        break;
      case 'server':
        message = 'The server is currently experiencing issues. Please try again later.';
        errorCode = 'server_error';
        break;
      default:
        message = error.message || message;
        errorCode = 'unknown_error';
    }
    
    return {
      error: errorCode,
      message,
      category: errorCategory,
      status: error.response?.status,
      timestamp: new Date().toISOString(),
      request_id: 'unknown'
    };
  }

  // Generic request methods with retry logic
  async get<T>(url: string, params?: any, retryConfig?: Partial<RetryConfig>): Promise<T> {
    const response = await this.executeWithRetry(
      () => this.client.get(url, { params }),
      retryConfig
    );
    return response.data;
  }

  async post<T>(url: string, data?: any, retryConfig?: Partial<RetryConfig>): Promise<T> {
    const response = await this.executeWithRetry(
      () => this.client.post(url, data),
      retryConfig
    );
    return response.data;
  }

  async put<T>(url: string, data?: any, retryConfig?: Partial<RetryConfig>): Promise<T> {
    const response = await this.executeWithRetry(
      () => this.client.put(url, data),
      retryConfig
    );
    return response.data;
  }

  async delete<T>(url: string, retryConfig?: Partial<RetryConfig>): Promise<T> {
    const response = await this.executeWithRetry(
      () => this.client.delete(url),
      retryConfig
    );
    return response.data;
  }

  async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void, retryConfig?: Partial<RetryConfig>): Promise<T> {
    // Don't retry uploads by default to avoid duplicate uploads
    const uploadRetryConfig = {
      maxRetries: 0,
      ...retryConfig
    };

    const response = await this.executeWithRetry(
      () => this.client.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }),
      uploadRetryConfig
    );
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Convenience methods
export const api = {
  // Generic methods with enhanced retry support
  get: <T>(url: string, params?: any, retryConfig?: Partial<RetryConfig>) => 
    apiClient.get<T>(url, params, retryConfig),
  post: <T>(url: string, data?: any, retryConfig?: Partial<RetryConfig>) => 
    apiClient.post<T>(url, data, retryConfig),
  put: <T>(url: string, data?: any, retryConfig?: Partial<RetryConfig>) => 
    apiClient.put<T>(url, data, retryConfig),
  delete: <T>(url: string, retryConfig?: Partial<RetryConfig>) => 
    apiClient.delete<T>(url, retryConfig),
  
  // Health check with aggressive retry
  health: () => apiClient.get('/api/v1/health', undefined, { maxRetries: 5 }),
  
  // Auth endpoints with appropriate retry configs
  auth: {
    register: (data: any) => apiClient.post('/api/v1/auth/register', data, { maxRetries: 1 }),
    login: (data: any) => apiClient.post('/api/v1/auth/login', data, { maxRetries: 1 }),
    logout: () => apiClient.post('/api/v1/auth/logout', undefined, { maxRetries: 1 }),
    refresh: () => apiClient.post('/api/v1/auth/refresh', undefined, { maxRetries: 2 }),
    resetPassword: (email: string) => apiClient.post('/api/v1/auth/reset-password', { email }, { maxRetries: 1 }),
  },
  
  // Project endpoints with enhanced retry support
  projects: {
    list: () => apiClient.get('/api/v1/projects', undefined, { maxRetries: 3 }),
    create: (data: any) => apiClient.post('/api/v1/projects', data, { maxRetries: 2 }),
    get: (id: string) => apiClient.get(`/api/v1/projects/${id}`, undefined, { maxRetries: 3 }),
    update: (id: string, data: any) => apiClient.put(`/api/v1/projects/${id}`, data, { maxRetries: 2 }),
    delete: (id: string) => apiClient.delete(`/api/v1/projects/${id}`, { maxRetries: 1 }),
  },
  
  // File endpoints with appropriate retry configs
  files: {
    upload: (projectId: string, file: File, onProgress?: (progress: number) => void) => {
      const formData = new FormData();
      formData.append('file', file);
      // Don't retry uploads to avoid duplicates
      return apiClient.upload(`/api/v1/projects/${projectId}/files/upload`, formData, onProgress, { maxRetries: 0 });
    },
    list: (projectId: string) => apiClient.get(`/api/v1/projects/${projectId}/files`, undefined, { maxRetries: 3 }),
    get: (fileId: string) => apiClient.get(`/api/v1/files/${fileId}`, undefined, { maxRetries: 3 }),
    delete: (fileId: string) => apiClient.delete(`/api/v1/files/${fileId}`, { maxRetries: 1 }),
  },
  
  // Search endpoints with enhanced retry support
  search: {
    query: (data: any) => apiClient.post('/api/v1/search', data, { maxRetries: 2 }),
    suggestions: (query: string) => apiClient.get('/api/v1/search/suggestions', { q: query }, { maxRetries: 2 }),
  },
  
  // Entity endpoints with enhanced retry support
  entities: {
    list: (projectId: string, params?: any) => apiClient.get(`/api/v1/projects/${projectId}/entities`, params, { maxRetries: 3 }),
    get: (entityId: string) => apiClient.get(`/api/v1/entities/${entityId}`, undefined, { maxRetries: 3 }),
    relationships: (entityId: string) => apiClient.get(`/api/v1/entities/${entityId}/relationships`, undefined, { maxRetries: 3 }),
  },
};