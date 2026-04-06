import { v4 as uuidv4 } from 'uuid';

export interface User {
  _id: string;
  username: string;
}

export interface Booking {
  _id: string;
  userId: User;
  weekId: string;
  date: string;
  slotIndex: number;
  content: string;
}

// Fallback logic for Local Storage
export class ApiClient {
  private static getLocalUsers(): any[] {
    return JSON.parse(localStorage.getItem('users') || '[]');
  }
  private static getLocalBookings(): any[] {
    return JSON.parse(localStorage.getItem('bookings') || '[]');
  }
  
  static async register(username: string, password: string):Promise<{userId: string}> {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    } catch (error: any) {
      if (error.message !== 'Failed to fetch') throw error;
      // Fallback
      if (!/[a-zA-Z]/.test(username)) throw new Error("Tên đăng ký phải có chữ.");
      const users = this.getLocalUsers();
      if (users.find(u => u.username === username)) throw new Error("Tài khoản đã tồn tại.");
      const newUser = { _id: uuidv4(), username, password };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      return { userId: newUser._id };
    }
  }

  static async login(username: string, password: string):Promise<{userId: string, username: string}> {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    } catch (error: any) {
      if (error.message !== 'Failed to fetch') throw error;
      // Fallback
      const users = this.getLocalUsers();
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) throw new Error("Sai tài khoản hoặc mật khẩu.");
      return { userId: user._id, username: user.username };
    }
  }

  static async getBookings(weekId: string):Promise<Booking[]> {
    try {
      const res = await fetch(`/api/bookings?weekId=${weekId}`);
      if (res.ok) return await res.json();
      throw new Error('Failed to fetch bookings');
    } catch (error: any) {
      if (error.message !== 'Failed to fetch') throw error;
      // Fallback
      const bookings = this.getLocalBookings();
      const users = this.getLocalUsers();
      return bookings
        .filter(b => b.weekId === weekId)
        .map(b => ({
          ...b,
          userId: users.find(u => u._id === b.userId) || { _id: b.userId, username: 'Unknown' }
        }));
    }
  }

  static async saveBooking(userId: string, weekId: string, date: string, slotIndex: number, content: string):Promise<any> {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, weekId, date, slotIndex, content })
      });
      if (res.ok) return await res.json();
      throw new Error('Failed to save booking');
    } catch (error: any) {
      if (error.message !== 'Failed to fetch') throw error;
      // Fallback
      const bookings = this.getLocalBookings();
      const newBooking = { _id: uuidv4(), userId, weekId, date, slotIndex, content };
      bookings.push(newBooking);
      localStorage.setItem('bookings', JSON.stringify(bookings));
      return { success: true, booking: newBooking };
    }
  }
  static async getUsers(): Promise<User[]> {
    try {
      const res = await fetch('/api/users');
      if (res.ok) return await res.json();
      throw new Error('Lỗi tải danh sách người dùng');
    } catch (error) {
      throw error;
    }
  }

  static async deleteUser(id: string): Promise<any> {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
      throw new Error('Lỗi xóa người dùng');
    } catch (error) {
      throw error;
    }
  }
}
