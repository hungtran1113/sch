import React, { useState, useEffect, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ApiClient, Booking } from './apiClient';
import { getCurrentWeek, getNextWeek, getPrevWeek, getDaysOfWeek, getWeekId, parseWeekId, generateWeekOptions } from './utils';
import { Calendar, ChevronLeft, ChevronRight, LogIn, UserPlus, Save, X, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const TIME_SLOTS = ['Sáng (08:00 - 12:00)', 'Chiều (13:00 - 17:00)', 'Tối (18:00 - 22:00)'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<{userId: string, username: string} | null>(null);
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<{date: string, slotIndex: number, content: string}[]>([]);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [noteModal, setNoteModal] = useState<{date: string, slotIndex: number} | null>(null);
  const [tempNote, setTempNote] = useState('');
  
  const [loading, setLoading] = useState(false);
  const isAdmin = currentUser?.username === 'hiep14082005';
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  const handleOpenManageUsers = async () => {
    try {
      const users = await ApiClient.getUsers();
      setUsersList(users);
      setIsManageUsersOpen(true);
    } catch (e) { alert("Lỗi tải danh sách người dùng"); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa tài khoản này và toàn bộ lịch của họ?")) return;
    try {
      await ApiClient.deleteUser(id);
      setUsersList(usersList.filter(u => u._id !== id));
      const updatedBookings = await ApiClient.getBookings(getWeekId(currentWeek));
      setBookings(updatedBookings);
      alert("Đã xóa tài khoản thành công!");
    } catch (e) { alert("Lỗi xóa người dùng"); }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const allData = await ApiClient.getAllBookingsForExport();
      
      const excelData = allData.map(b => ({
        'Ngày': format(new Date(b.date), 'dd/MM/yyyy'),
        'Thứ': format(new Date(b.date), 'EEEE', { locale: vi }),
        'Khung Giờ': TIME_SLOTS[b.slotIndex],
        'Người Đăng Ký': b.userId?.username || 'Ẩn danh',
        'Nội Dung': b.content || '(Trống)'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tổng Hợp Lịch");
      XLSX.writeFile(workbook, `Lich_Trinh_Tong_Hop_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    } catch (e) {
      alert("Lỗi khi xuất file Excel");
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = useMemo(() => getDaysOfWeek(currentWeek), [currentWeek]);
  const weekId = useMemo(() => getWeekId(currentWeek), [currentWeek]);
  const weekOptions = useMemo(() => generateWeekOptions(), []);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
  }, []);

  const loadBookings = async () => {
    try {
      const data = await ApiClient.getBookings(weekId);
      setBookings(data);
    } catch (err: any) { console.error(err); }
  };

  useEffect(() => {
    loadBookings();
    setPendingBookings([]);
  }, [weekId]);

  useEffect(() => {
    const interval = setInterval(() => loadBookings(), 5000);
    return () => clearInterval(interval);
  }, [weekId]);

  const handlePrevWeek = () => setCurrentWeek(getPrevWeek(currentWeek));
  const handleNextWeek = () => setCurrentWeek(getNextWeek(currentWeek));
  const handleCurrentWeek = () => setCurrentWeek(getCurrentWeek());
  const handleWeekSelect = (e: React.ChangeEvent<HTMLSelectElement>) => setCurrentWeek(parseWeekId(e.target.value));

  const handleSlotClick = (date: Date, slotIndex: number) => {
    const dateStr = date.toISOString();
    const existingIndex = pendingBookings.findIndex(p => p.date === dateStr && p.slotIndex === slotIndex);
    if (existingIndex > -1) {
      setPendingBookings(prev => prev.filter((_, i) => i !== existingIndex));
      return;
    }
    const existingBooking = bookings.find(b => b.slotIndex === slotIndex && isSameDay(new Date(b.date), date));
    const canEdit = !existingBooking || (currentUser && existingBooking.userId._id === currentUser.userId) || isAdmin;
    if (canEdit) {
      setNoteModal({ date: dateStr, slotIndex });
      setTempNote(existingBooking ? existingBooking.content : '');
    } else {
      alert("Bạn không có quyền sửa lịch của người khác!");
    }
  };

  const handleNoteSubmit = () => {
    if (noteModal) {
      setPendingBookings(prev => [...prev, {
        date: noteModal.date,
        slotIndex: noteModal.slotIndex,
        content: tempNote
      }]);
      setNoteModal(null);
    }
  };

  const handleSave = async () => {
    if (pendingBookings.length === 0) return;
    if (!currentUser) { setIsRegisterModalOpen(true); return; }
    setLoading(true);
    try {
      for (const p of pendingBookings) {
        await ApiClient.saveBooking(currentUser.userId, weekId, p.date, p.slotIndex, p.content);
      }
      setPendingBookings([]);
      await loadBookings();
      alert('Lưu lịch thành công!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu lịch');
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Quản Lý Lịch Trình</h1>
          </div>
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <div className="flex space-x-2">
                <button 
                  onClick={handleExportExcel}
                  className="flex items-center space-x-1 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Excel</span>
                </button>
                <button 
                  onClick={handleOpenManageUsers}
                  className="flex items-center space-x-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Quản lý Tài Khoản</span>
                </button>
              </div>
            )}
            {pendingBookings.length > 0 && (
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Lưu ({pendingBookings.length})</span>
              </button>
            )}
            {currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">Chào, {currentUser.username}</span>
                <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">Đăng xuất</button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  <LogIn className="w-4 h-4" /> <span>Đăng nhập</span>
                </button>
                <button onClick={() => setIsRegisterModalOpen(true)} className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  <UserPlus className="w-4 h-4" /> <span>Đăng ký</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
          <div className="flex space-x-2">
            <button onClick={handlePrevWeek} className="flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4 mr-1" /> Tuần trước
            </button>
            <button onClick={handleCurrentWeek} className="px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100">Hiện tại</button>
            <button onClick={handleNextWeek} className="flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Tuần sau <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <select value={weekId} onChange={handleWeekSelect} className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
            {weekOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
              <div className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200">Thời gian</div>
              {daysOfWeek.map((day, i) => (
                <div key={i} className="py-3 px-4 text-center text-sm font-medium text-gray-900 border-r border-gray-200 last:border-r-0">
                  <div className="uppercase text-xs text-gray-500">{format(day, 'EEEE', { locale: vi })}</div>
                  <div>{format(day, 'dd/MM')}</div>
                </div>
              ))}
            </div>
            <div className="divide-y divide-gray-200 bg-white">
              {TIME_SLOTS.map((slotName, slotIndex) => (
                <div key={slotIndex} className="grid grid-cols-8">
                  <div className="py-4 px-4 text-sm text-gray-500 font-medium border-r border-gray-200 flex items-center bg-gray-50">{slotName}</div>
                  {daysOfWeek.map((day, i) => {
                    const dateStr = day.toISOString();
                    const slotBookings = bookings.filter(b => b.slotIndex === slotIndex && isSameDay(new Date(b.date), day));
                    const isPending = pendingBookings.some(p => p.date === dateStr && p.slotIndex === slotIndex);
                    return (
                      <div key={i} className={`p-2 border-r border-gray-200 last:border-r-0 min-h-[120px] relative transition-colors ${isPending ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                        <div className="mb-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={isPending} onChange={() => handleSlotClick(day, slotIndex)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded cursor-pointer" />
                            <span className="text-xs text-gray-500">Chọn</span>
                          </label>
                        </div>
                        <div className="space-y-2 mt-2">
                          {slotBookings.map((b, idx) => (
                            <div key={idx} className="bg-indigo-50 border border-indigo-100 rounded p-2 text-xs">
                              <div className="font-semibold text-indigo-700">{b.userId?.username || 'Ẩn danh'}</div>
                              {b.content && <div className="text-gray-600 mt-1 line-clamp-3">{b.content}</div>}
                            </div>
                          ))}
                          {isPending && (
                            <div className="bg-green-100 border border-green-200 rounded p-2 text-xs">
                              <div className="font-semibold text-green-700">(Đang chọn)</div>
                              <div className="text-gray-600 mt-1">{pendingBookings.find(p => p.date === dateStr && p.slotIndex === slotIndex)?.content}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ghi chú công việc (Hoặc xóa rỗng để hủy)</h3>
            <textarea autoFocus value={tempNote} onChange={(e) => setTempNote(e.target.value)} placeholder="Nhập ghi chú cho ô này..." className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 resize-none" />
            <div className="mt-4 flex justify-end space-x-3">
              <button onClick={() => setNoteModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Hủy</button>
              <button onClick={handleNoteSubmit} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      <AuthModals isLoginOpen={isLoginModalOpen} isRegisterOpen={isRegisterModalOpen} closeLogin={() => setIsLoginModalOpen(false)} closeRegister={() => setIsRegisterModalOpen(false)} openLogin={() => { setIsRegisterModalOpen(false); setIsLoginModalOpen(true); }} openRegister={() => { setIsLoginModalOpen(false); setIsRegisterModalOpen(true); }} onSuccess={(user: any) => { setCurrentUser(user); localStorage.setItem('currentUser', JSON.stringify(user)); }} />

      {isManageUsersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center"><Users className="w-5 h-5 mr-2 text-indigo-600" /> Quản lý Hệ Thống</h3>
              <button onClick={() => setIsManageUsersOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {usersList.length === 0 ? <p className="text-center text-gray-500 py-4">Đang tải danh sách...</p> : (
                <ul className="divide-y divide-gray-200">
                  {usersList.map(u => (
                    <li key={u._id} className="py-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${u.username === 'hiep14082005' ? 'text-indigo-600' : 'text-gray-900'}`}>{u.username} {u.username === 'hiep14082005' && '(Quản trị viên)'}</span>
                        <span className="text-xs text-gray-500">Tham gia: {u.createdAt ? format(new Date(u.createdAt), 'dd/MM/yyyy') : 'N/A'}</span>
                      </div>
                      {u.username !== 'hiep14082005' && <button onClick={() => handleDeleteUser(u._id)} className="text-xs font-semibold text-red-600 hover:text-white border border-red-600 hover:bg-red-600 px-3 py-1.5 rounded transition-colors">Xóa tài khoản</button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthModals({ isLoginOpen, isRegisterOpen, closeLogin, closeRegister, openLogin, openRegister, onSuccess }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoginOpen || isRegisterOpen) { setUsername(''); setPassword(''); setError(''); }
  }, [isLoginOpen, isRegisterOpen]);

  if (!isLoginOpen && !isRegisterOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegisterOpen) {
        await ApiClient.register(username, password);
        openLogin();
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
      } else {
        const user = await ApiClient.login(username, password);
        onSuccess(user);
        closeLogin();
      }
    } catch (err: any) { setError(err.message || 'Có lỗi xảy ra'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={isLoginOpen ? closeLogin : closeRegister} className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"><X className="w-5 h-5" /></button>
        <h3 className="text-xl font-bold text-center text-gray-900 mb-6">{isLoginOpen ? 'Đăng nhập' : 'Đăng ký tài khoản'}</h3>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tên tài khoản (phải có chữ)</label>
            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 sm:text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400">
            {loading ? 'Đang xử lý...' : (isLoginOpen ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600">
          {isLoginOpen ? (
            <p>Chưa có tài khoản? <button onClick={openRegister} className="text-indigo-600 hover:text-indigo-500 font-medium">Đăng ký ngay</button></p>
          ) : (
            <p>Đã có tài khoản? <button onClick={openLogin} className="text-indigo-600 hover:text-indigo-500 font-medium">Đăng nhập</button></p>
          )}
        </div>
      </div>
    </div>
  );
}