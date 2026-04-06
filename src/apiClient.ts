export interface User { _id: string; username: string; color?: string; createdAt?: string; }
export interface Booking { _id: string; userId: User; weekId: string; date: string; slotIndex: number; content: string; }

export class ApiClient {
  static async register(username: string, password: string): Promise<any> { 
    const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); 
    return await res.json(); 
  }
  static async login(username: string, password: string): Promise<any> { 
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); 
    return await res.json(); 
  }
  static async getBookings(weekId: string): Promise<Booking[]> { return await (await fetch(`/api/bookings?weekId=${weekId}`)).json(); }
  static async saveBooking(userId: string, weekId: string, date: string, slotIndex: number, content: string, action?: string): Promise<any> { 
    const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, weekId, date, slotIndex, content, action }) }); 
    return await res.json(); 
  }
  
  static async getTrips(): Promise<any[]> { return await (await fetch('/api/trips')).json(); }
  static async createTrip(data: any): Promise<any> { 
    const res = await fetch('/api/trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); 
    return await res.json(); 
  }
  static async updateTrip(id: string, data: any): Promise<any> { 
    return await (await fetch(`/api/trips/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json(); 
  }
  static async deleteTrip(id: string): Promise<any> { return await (await fetch(`/api/trips/${id}`, { method: 'DELETE' })).json(); }
  
  static async getUsers(): Promise<User[]> { return await (await fetch('/api/users')).json(); }
  static async deleteUser(id: string): Promise<any> { return await (await fetch(`/api/users/${id}`, { method: 'DELETE' })).json(); }
  static async getAllBookingsForExport(): Promise<Booking[]> { return await (await fetch('/api/admin/export-all')).json(); }

  static async getChats(userId: string): Promise<any[]> { return await (await fetch(`/api/chats?userId=${userId}`)).json(); }
  static async createChat(userId: string): Promise<any> {
    const res = await fetch('/api/chats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    return await res.json();
  }
  static async deleteChat(id: string): Promise<any> { return await (await fetch(`/api/chats/${id}`, { method: 'DELETE' })).json(); }
  static async sendChatMessage(chatId: string, text: string): Promise<any> {
    const res = await fetch(`/api/chats/${chatId}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    return await res.json();
  }
  static async clearAllBookings(): Promise<any> {
    return await (await fetch('/api/admin/clear-all-bookings', { method: 'DELETE' })).json();
  }
}