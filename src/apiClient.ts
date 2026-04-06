import { v4 as uuidv4 } from 'uuid';

export interface User { _id: string; username: string; color?: string; createdAt?: string; }
export interface Booking { _id: string; userId: User; weekId: string; date: string; slotIndex: number; content: string; }

export class ApiClient {
  static async register(username: string, password: string): Promise<any> {
    const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Lỗi'); return data;
  }
  static async login(username: string, password: string): Promise<any> {
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Lỗi'); return data;
  }
  static async getBookings(weekId: string): Promise<Booking[]> { return await (await fetch(`/api/bookings?weekId=${weekId}`)).json(); }
  
  // SỬA: Thêm action
  static async saveBooking(userId: string, weekId: string, date: string, slotIndex: number, content: string, action?: string): Promise<any> {
    const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, weekId, date, slotIndex, content, action }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Lỗi'); return data;
  }
  
  static async getTrips(): Promise<any[]> { return await (await fetch('/api/trips')).json(); }
  static async createTrip(data: any): Promise<any> {
    const res = await fetch('/api/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Lỗi'); return result;
  }
  static async updateTrip(id: string, data: any): Promise<any> { return await (await fetch(`/api/trips/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json(); }
  static async deleteTrip(id: string): Promise<any> { return await (await fetch(`/api/trips/${id}`, { method: 'DELETE' })).json(); }
  static async getUsers(): Promise<User[]> { return await (await fetch('/api/users')).json(); }
  static async deleteUser(id: string): Promise<any> { return await (await fetch(`/api/users/${id}`, { method: 'DELETE' })).json(); }
  static async getAllBookingsForExport(): Promise<Booking[]> { return await (await fetch('/api/admin/export-all')).json(); }
}