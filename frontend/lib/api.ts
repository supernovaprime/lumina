import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl || 'http://localhost:7000/api/v1';

  constructor() {}

  get<T>(path: string, params?: any): Promise<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.apiUrl}${path}`, { params })
      .toPromise();
  }

  post<T>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.apiUrl}${path}`, body)
      .toPromise();
  }

  put<T>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.apiUrl}${path}`, body)
      .toPromise();
  }

  delete(path: string): Promise<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}${path}`)
      .toPromise();
  }

  // Get all services
  getServices(): Promise<ApiResponse<any>> {
    return this.get('/services');
  }

  // Get service by slug
  getService(slug: string): Promise<ApiResponse<any>> {
    return this.get(`/services/${slug}`);
  }

  // Get services by category
  getServicesByCategory(category: string): Promise<ApiResponse<any>> {
    return this.get(`/services?category=${category}`);
  }

  // Search businesses
  searchBusinesses(query: string, location?: string, radius?: number, service?: string, minRating?: number): Promise<ApiResponse<any>> {
    const params: any = { query };
    if (location) params.location = location;
    if (radius) params.radius = radius;
    if (service) params.service = service;
    if (minRating) params.minRating = minRating;
    return this.get('/search/businesses', params);
  }

  // Get business by id
  getBusiness(id: string): Promise<ApiResponse<any>> {
    return this.get(`/businesses/${id}`);
  }

  // Create booking
  createBooking(bookingData: any): Promise<ApiResponse<any>> {
    return this.post('/bookings', bookingData);
  }

  // Get booking details
  getBooking(id: string): Promise<ApiResponse<any>> {
    return this.get(`/bookings/${id}`);
  }

  // Cancel booking
  cancelBooking(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/bookings/${id}`);
  }

  // Get user profile
  getProfile(): Promise<ApiResponse<any>> {
    return this.get('/me');
  }

  // Update profile
  updateProfile(data: any): Promise<ApiResponse<any>> {
    return this.put('/me', data);
  }

  // Authenticate user
  login(email: string, password: string): Promise<ApiResponse<{ token: string }>> {
    return this.post('/auth/login', { email, password });
  }

  // Logout
  logout(): Promise<ApiResponse<any>> {
    return this.post('/auth/logout', {});
  }

  // Refresh token
  refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string }>> {
    return this.post('/auth/refresh', { refreshToken });
  }
}