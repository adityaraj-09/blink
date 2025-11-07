/**
 * API Client - Base HTTP Client
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class APIError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export class APIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private getTokenFn: (() => Promise<string | null>) | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set token getter function (recommended - always gets fresh token)
   */
  setTokenGetter(getTokenFn: () => Promise<string | null>) {
    this.getTokenFn = getTokenFn;
    console.log('🔑 API Client: Token getter function set');
  }

  /**
   * Set authentication token (legacy - for one-time use)
   */
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    console.log('🔑 API Client: Token set', {
      tokenLength: token.length,
      tokenPreview: token.substring(0, 20) + '...',
    });
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    delete this.defaultHeaders['Authorization'];
    this.getTokenFn = null;
    console.log('🔓 API Client: Token cleared');
  }

  /**
   * Get fresh token if token getter is set
   */
  private async getFreshToken(): Promise<string | null> {
    if (this.getTokenFn) {
      try {
        const token = await this.getTokenFn();
        if (token) {
          console.log('🔄 API Client: Got fresh token');
          return token;
        }
      } catch (err) {
        console.error('❌ Failed to get fresh token:', err);
      }
    }
    return null;
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Get fresh token if token getter is available
    const freshToken = await this.getFreshToken();

    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Override with fresh token if available
    if (freshToken) {
      requestHeaders['Authorization'] = `Bearer ${freshToken}`;
    }

    console.log('📡 API Request:', {
      method,
      url,
      hasAuthHeader: !!requestHeaders['Authorization'],
      authHeaderPreview: requestHeaders['Authorization']
        ? requestHeaders['Authorization'].substring(0, 30) + '...'
        : 'none',
      usingFreshToken: !!freshToken,
    });

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      // Parse response
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle errors
      if (!response.ok) {
        console.error('❌ API Error:', {
          status: response.status,
          error: data.error || data.message,
          details: data.details,
        });
        throw new APIError(
          data.error || data.message || 'Request failed',
          response.status,
          data.details || data
        );
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }

      throw new APIError(
        (error as Error).message || 'Network error',
        0
      );
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }
}

// Singleton instance
let clientInstance: APIClient | null = null;

export function getAPIClient(): APIClient {
  if (!clientInstance) {
    clientInstance = new APIClient();
  }
  return clientInstance;
}

// Export singleton instance for direct use
export const apiClient = getAPIClient();
