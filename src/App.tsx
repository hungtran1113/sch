import React, { useState, useEffect, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ApiClient, Booking } from './apiClient';
import { getCurrentWeek, getNextWeek, getPrevWeek, getDaysOfWeek, getWeekId, parseWeekId, generateWeekOptions } from './utils';
import { Calendar, ChevronLeft, ChevronRight, Save, X, Users, Download, CheckCircle2, MessageSquare, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import TravelPlanner from './TravelPlanner';

// FIX: Chỉ dùng 1 khung giờ cho cả ngày
const TIME_SLOTS = ['Nội dung trong ngày'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'work' | 'travel'>('work'); 
  const [currentUser, setCurrentUser] = useState<{userId: string, username: string} | null>(null);
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<{date: string, slotIndex: number, content: string, isDelete?: boolean}[]>([]);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [noteModal, setNoteModal] = useState<{date: string, slotIndex: number} | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [viewMoreModal, setViewMoreModal] = useState<{date: string, slotIndex: number} | null>(null);
  
  const [loading, setLoading] = useState(false);
  const isAdmin = currentUser?.username === 'hiep14082005';
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  const handleOpenManageUsers = async () => { try { setUsersList(await ApiClient.getUsers()); setIsManageUsersOpen(true); } catch (e) { alert("Lỗi"); } };
  const handleDeleteUser = async (id: string) => { if (!window.confirm("Xóa tài khoản này?")) return; try { await ApiClient.deleteUser(id); setUsersList(usersList.filter(u => u._id !== id)); setBookings(await ApiClient.getBookings(getWeekId(currentWeek))); } catch (e) { alert("Lỗi"); } };
  
  // FIX: XUẤT GOOGLE SHEETS BẰNG BLOB CHUẨN XÁC KHÔNG LỖI
  const handleExportExcel = async () => { 
    try { 
      setLoading(true); 
      const allData = await ApiClient.getAllBookingsForExport(); 
      const excelData = allData.map(b => ({ 
          'Ngày': format(new Date(b.date), 'dd/MM/yyyy'), 
          'Khung Giờ': TIME_SLOTS[b.slotIndex] || 'Cả ngày', 
          'Người Đăng Ký': b.userId?.username || 'Ẩn danh', 
          'Nội Dung': b.content || '' 
      })); 
      const ws = XLSX.utils.json_to_sheet(excelData); 
      const wb = XLSX.utils.book_new(); 
      XLSX.utils.book_append_sheet(wb, ws, "Lich_Ranh"); 
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      saveAs(blob, `Lich_Ranh.xlsx`); 
    } catch (e) { alert("Có lỗi khi xuất file!"); } finally { setLoading(false); } 
  };

  const daysOfWeek = useMemo(() => getDaysOfWeek(currentWeek), [currentWeek]);
  const weekId = useMemo(() => getWeekId(currentWeek), [currentWeek]);
  const weekOptions = useMemo(() => generateWeekOptions(), []);

  useEffect(() => { const stored = localStorage.getItem('currentUser'); if (stored) setCurrentUser(JSON.parse(stored)); }, []);
  const loadBookings = async () => { try { setBookings(await ApiClient.getBookings(weekId)); } catch (err) {} };
  useEffect(() => { if (activeTab === 'work') loadBookings(); setPendingBookings([]); }, [weekId, activeTab]);
  useEffect(() => { const interval = setInterval(() => { if(activeTab === 'work' && pendingBookings.length === 0) loadBookings(); }, 5000); return () => clearInterval(interval); }, [weekId, activeTab, pendingBookings]);

  const handlePrevWeek = () => setCurrentWeek(getPrevWeek(currentWeek));
  const handleNextWeek = () => setCurrentWeek(getNextWeek(currentWeek));
  const handleCurrentWeek = () => setCurrentWeek(getCurrentWeek());
  const handleWeekSelect = (e: React.ChangeEvent<HTMLSelectElement>) => setCurrentWeek(parseWeekId(e.target.value));

  const handleToggleCheck = (date: Date, slotIndex: number, myExistingBooking: any) => {
    if (!currentUser) return alert("Vui lòng đăng nhập!");
    const dateStr = date.toISOString();
    setPendingBookings(prev => {
        const existingPending = prev.find(p => p.date === dateStr && p.slotIndex === slotIndex);
        const isCurrentlyChecked = existingPending ? !existingPending.isDelete : !!myExistingBooking;
        const newPending = prev.filter(p => !(p.date === dateStr && p.slotIndex === slotIndex));

        if (isCurrentlyChecked) {
            newPending.push({ date: dateStr, slotIndex, content: '', isDelete: true });
        } else {
            newPending.push({ date: dateStr, slotIndex, content: '', isDelete: false }); 
        }
        return newPending;
    });
  };

  const handleOpenNote = (date: Date, slotIndex: number, myExistingBooking: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return alert("Vui lòng đăng nhập!");
    const dateStr = date.toISOString();
    setNoteModal({ date: dateStr, slotIndex });
    setTempNote(myExistingBooking ? myExistingBooking.content : (pendingBookings.find(p => p.date === dateStr && p.slotIndex === slotIndex)?.content || ''));
  };

  const handleNoteSubmit = () => {
    if (noteModal) {
      setPendingBookings(prev => {
        const filtered = prev.filter(p => !(p.date === noteModal.date && p.slotIndex === noteModal.slotIndex));
        return [...filtered, { date: noteModal.date, slotIndex: noteModal.slotIndex, content: tempNote, isDelete: false }];
      });
      setNoteModal(null);
    }
  };

  const handleSave = async () => {
    if (pendingBookings.length === 0 || !currentUser) return;
    setLoading(true);
    try {
      for (const p of pendingBookings) {
        await ApiClient.saveBooking(currentUser.userId, weekId, p.date, p.slotIndex, p.content, p.isDelete ? 'delete' : 'save');
      }
      setPendingBookings([]);
      await loadBookings();
      alert("Đã lưu lịch thành công!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('currentUser'); };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2"><Calendar className="w-6 h-6 text-indigo-600" /><h1 className="text-xl font-black text-gray-900 tracking-tight">HIEP MANAGER</h1></div>
            <nav className="hidden md:flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setActiveTab('work')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'work' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Lịch Rảnh</button>
              <button onClick={() => setActiveTab('travel')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'travel' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Travel Timeline</button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {activeTab === 'work' && isAdmin && (
              <div className="flex space-x-2"><button onClick={handleExportExcel} className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-2 rounded-md text-sm font-bold"><Download className="w-4 h-4" /> <span>Xuất Google Sheets</span></button><button onClick={handleOpenManageUsers} className="flex items-center space-x-1 bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm font-bold"><Users className="w-4 h-4" /> <span>User</span></button></div>
            )}
            {activeTab === 'work' && pendingBookings.length > 0 && <button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold flex items-center gap-2"><Save className="w-4 h-4" /> Lưu Lịch</button>}
            {currentUser ? (
              <div className="flex items-center space-x-4"><div className="text-right leading-none"><p className="text-xs text-gray-400">Tài khoản</p><p className="text-sm font-bold text-indigo-600">{currentUser.username}</p></div><button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600"><X className="w-5 h-5"/></button></div>
            ) : (
              <div className="flex items-center space-x-2"><button onClick={() => setIsLoginModalOpen(true)} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md text-sm font-bold">Đăng nhập</button><button onClick={() => setIsRegisterModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-bold">Đăng ký</button></div>
            )}
          </div>
        </div>
      </header>

      {activeTab === 'work' ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex space-x-2">
              <button onClick={handlePrevWeek} className="flex items-center px-3 py-2 border border-gray-300 text-sm font-bold rounded-md bg-white"><ChevronLeft className="w-4 h-4 mr-1" /> Trước</button>
              <button onClick={handleCurrentWeek} className="px-3 py-2 border border-indigo-300 text-sm font-bold rounded-md text-indigo-700 bg-indigo-50">Hiện tại</button>
              <button onClick={handleNextWeek} className="flex items-center px-3 py-2 border border-gray-300 text-sm font-bold rounded-md bg-white">Sau <ChevronRight className="w-4 h-4 ml-1" /></button>
            </div>
            <select value={weekId} onChange={handleWeekSelect} className="block w-full sm:w-auto pl-3 pr-10 py-2 font-bold border-gray-300 rounded-md bg-white">{weekOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
          </div>

          <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-3xl overflow-hidden overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-8 border-b border-gray-100 bg-gray-50/50">
                <div className="py-4 px-4 text-center text-xs font-black text-gray-400 uppercase border-r border-gray-100">Ngày</div>
                {daysOfWeek.map((day, i) => (
                  <div key={i} className="py-4 px-4 text-center border-r border-gray-100">
                    <div className="uppercase text-[10px] font-black text-indigo-500 mb-1">{format(day, 'EEEE', { locale: vi })}</div>
                    <div className="text-sm font-black text-gray-900">{format(day, 'dd/MM')}</div>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-gray-100">
                {TIME_SLOTS.map((slotName, slotIndex) => (
                  <div key={slotIndex} className="grid grid-cols-8">
                    <div className="py-6 px-4 text-[10px] text-gray-400 font-black border-r border-gray-100 flex items-center bg-gray-50/30 uppercase leading-tight">{slotName}</div>
                    {daysOfWeek.map((day, i) => {
                      const dateStr = day.toISOString();
                      const slotBookings = bookings.filter(b => b.slotIndex === slotIndex && isSameDay(new Date(b.date), day));
                      const myExistingBooking = slotBookings.find(b => b.userId._id === currentUser?.userId);
                      const myPending = pendingBookings.find(p => p.date === dateStr && p.slotIndex === slotIndex);
                      
                      const isChecked = myPending ? !myPending.isDelete : !!myExistingBooking;
                      const displayBookings = slotBookings.filter(b => b.userId._id !== currentUser?.userId);
                      
                      let finalRenderList = [...displayBookings];
                      if (isChecked) {
                          finalRenderList.unshift({
                              userId: { username: currentUser?.username || 'User', color: '#10b981' },
                              content: (myPending?.content !== undefined ? myPending.content : myExistingBooking?.content) || '',
                              isPending: !!myPending
                          } as any);
                      }

                      const visibleCount = finalRenderList.length;

                      return (
                        <div key={i} className="p-3 border-r border-gray-100 min-h-[420px] hover:bg-gray-50/50 transition-colors relative flex flex-col group">
                          <div className="flex justify-between items-center mb-3">
                            <label className="flex items-center gap-2 cursor-pointer z-10">
                                <input type="checkbox" checked={isChecked} onChange={() => handleToggleCheck(day, slotIndex, myExistingBooking)} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer shadow-sm" />
                                {isChecked && <span className="text-[10px] font-black text-indigo-600 uppercase">Tham gia</span>}
                            </label>
                            <span className="text-[10px] font-black text-gray-300 uppercase">{visibleCount}/15</span>
                          </div>
                          
                          <div className="space-y-2 flex-1">
                            {/* FIX: HIỂN THỊ TỚI 6 NGƯỜI */}
                            {finalRenderList.slice(0, 6).map((b: any, idx) => (
                              <div key={idx} onClick={(e) => { if(b.userId.username === currentUser?.username) handleOpenNote(day, slotIndex, myExistingBooking, e); }} style={{ borderLeftColor: b.userId?.color || '#cbd5e1' }} className={`bg-white border border-gray-100 border-l-4 shadow-sm rounded-lg p-2 text-xs transition-transform ${b.isPending ? 'animate-pulse opacity-80' : ''} ${b.userId.username === currentUser?.username ? 'cursor-pointer hover:bg-indigo-50' : ''}`}>
                                <div style={{ color: b.userId?.color || '#64748b' }} className="font-black mb-0.5 uppercase text-[10px] flex justify-between">
                                    {b.userId?.username}
                                    {b.userId.username === currentUser?.username && <MessageSquare size={12} className="text-gray-400"/>}
                                </div>
                                {b.content && <div className="text-gray-700 font-bold truncate">{b.content}</div>}
                              </div>
                            ))}
                          </div>

                          {/* NÚT XEM THÊM NẾU > 6 NGƯỜI */}
                          {visibleCount > 6 && (
                              <button onClick={() => setViewMoreModal({date: dateStr, slotIndex})} className="w-full mt-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black text-gray-500 uppercase transition-colors">
                                Xem thêm (+{visibleCount - 6})
                              </button>
                          )}
                          
                          {visibleCount > 0 && visibleCount <= 6 && (
                             <button onClick={() => setViewMoreModal({date: dateStr, slotIndex})} className="absolute bottom-2 right-2 p-1 text-gray-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye size={14}/>
                             </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      ) : ( <div className="animate-in slide-in-from-bottom-4 duration-500"><TravelPlanner /></div> )}

      {/* POPUP NHẬP NỘI DUNG - GIỚI HẠN 150 KÝ TỰ */}
      {noteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 transform animate-in zoom-in-95">
            <h3 className="text-xl font-black text-gray-900 mb-2">Thêm nội dung</h3>
            <p className="text-xs text-gray-400 mb-6">Bạn có thể để trống và chỉ cần lưu để đánh dấu tham gia. (Tối đa 150 ký tự)</p>
            <textarea 
               autoFocus 
               maxLength={150}
               value={tempNote} 
               onChange={(e) => setTempNote(e.target.value)} 
               placeholder="VD: Rảnh từ 8h sáng..." 
               className="w-full h-24 p-4 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-gray-50 font-bold resize-none text-sm" 
            />
            <div className="text-right text-[10px] text-gray-400 mt-1 font-bold">{tempNote.length}/150</div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setNoteModal(null)} className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">Đóng</button>
              <button onClick={handleNoteSubmit} className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">Lưu chữ</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP XEM THÊM ĐÃ SỬA LỖI TYPESCRIPT */}
      {viewMoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95">
             <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                 <h3 className="text-lg font-black text-gray-900 flex items-center gap-2"><CheckCircle2 className="text-green-500"/> Danh sách Tham gia</h3>
                 <button onClick={() => setViewMoreModal(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full"><X size={16}/></button>
             </div>
             <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                 {(() => {
                     const slotBookings = bookings.filter(b => b.slotIndex === viewMoreModal.slotIndex && isSameDay(new Date(b.date), new Date(viewMoreModal.date)));
                     const myPending = pendingBookings.find(p => p.date === viewMoreModal.date && p.slotIndex === viewMoreModal.slotIndex);
                     const myExisting = slotBookings.find(b => b.userId._id === currentUser?.userId);
                     
                     // Gắn Type nghiêm ngặt để Typescript không báo lỗi undefined
                     let fullList: { username: string; color: string; content: string }[] = slotBookings
                        .filter(b => b.userId._id !== currentUser?.userId)
                        .map(b => ({ 
                            username: b.userId.username || "User", 
                            color: b.userId.color || '#4f46e5', 
                            content: b.content || "" 
                        }));
                     
                     if (myPending && !myPending.isDelete) {
                         fullList.unshift({ 
                             username: currentUser?.username || "User", 
                             color: '#10b981', 
                             content: myPending.content || "" 
                         });
                     } else if (myExisting && (!myPending || !myPending.isDelete)) {
                         fullList.unshift({ 
                             username: currentUser?.username || "User", 
                             color: myExisting.userId.color || '#4f46e5', 
                             content: myExisting.content || "" 
                         });
                     }

                     return fullList.map((u, i) => (
                         <div key={i} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                             <div className="flex items-start gap-4">
                                 <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0" style={{backgroundColor: u.color}}>{u.username.charAt(0).toUpperCase()}</div>
                                 <div className="pt-0.5">
                                     <p className="font-black text-sm text-gray-900" style={{color: u.color}}>{u.username}</p>
                                     {u.content && <p className="text-xs font-medium text-gray-600 mt-1">{u.content}</p>}
                                 </div>
                             </div>
                             <div className="shrink-0 pl-2">
                                 <CheckCircle2 className="text-indigo-600 w-6 h-6" />
                             </div>
                         </div>
                     ));
                 })()}
             </div>
          </div>
        </div>
      )}

      <AuthModals isLoginOpen={isLoginModalOpen} isRegisterOpen={isRegisterModalOpen} closeLogin={() => setIsLoginModalOpen(false)} closeRegister={() => setIsRegisterModalOpen(false)} openLogin={() => { setIsRegisterModalOpen(false); setIsLoginModalOpen(true); }} openRegister={() => { setIsLoginModalOpen(false); setIsRegisterModalOpen(true); }} onSuccess={(user: any) => { setCurrentUser(user); localStorage.setItem('currentUser', JSON.stringify(user)); }} />
      {isManageUsersOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center"><h3 className="text-lg font-black flex items-center gap-2"><Users className="text-indigo-600" /> Quản lý User</h3><button onClick={() => setIsManageUsersOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {usersList.map(u => (
                <div key={u._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div><p className="font-bold flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{backgroundColor: u.color}}></span>{u.username}</p></div>
                  {u.username !== 'hiep14082005' && <button onClick={() => handleDeleteUser(u._id)} className="text-[10px] font-black text-red-600 px-3 py-1.5 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white uppercase">Xóa</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthModals({ isLoginOpen, isRegisterOpen, closeLogin, closeRegister, openLogin, openRegister, onSuccess }: any) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { if (isLoginOpen || isRegisterOpen) { setUsername(''); setPassword(''); setError(''); } }, [isLoginOpen, isRegisterOpen]);
  if (!isLoginOpen && !isRegisterOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isRegisterOpen) { await ApiClient.register(username, password); openLogin(); alert('Tạo tài khoản thành công!'); }
      else { const user = await ApiClient.login(username, password); onSuccess(user); closeLogin(); }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-sm p-8 rounded-3xl relative animate-in zoom-in-95">
        <button onClick={isLoginOpen ? closeLogin : closeRegister} className="absolute top-4 right-4"><X className="w-5 h-5 text-gray-400" /></button>
        <h3 className="text-2xl font-black text-center mb-6">{isLoginOpen ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN'}</h3>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Tên tài khoản" required value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold" />
          <input type="password" placeholder="Mật khẩu" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold" />
          <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase shadow-lg shadow-indigo-100 disabled:opacity-50">{loading ? 'Đang xử lý...' : (isLoginOpen ? 'Đăng nhập ngay' : 'Đăng ký ngay')}</button>
        </form>
        <div className="mt-6 text-center text-xs font-bold text-gray-400">
          {isLoginOpen ? <p>Chưa có tài khoản? <button type="button" onClick={openRegister} className="text-indigo-600 ml-1">Đăng ký</button></p> : <p>Đã có tài khoản? <button type="button" onClick={openLogin} className="text-indigo-600 ml-1">Đăng nhập</button></p>}
        </div>
      </div>
    </div>
  );
}