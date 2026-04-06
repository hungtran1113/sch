import React, { useState, useEffect, useRef } from 'react';
import { ApiClient } from './apiClient';
import { Send, Plus, MessageSquare, Trash2, Bot, User as UserIcon, X, AlertTriangle } from 'lucide-react';

export default function AIChat({ currentUser }: { currentUser: any }) {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Mobile sidebar toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) loadChats();
  }, [currentUser]);

  useEffect(() => {
    // Tự cuộn xuống tin nhắn mới nhất
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const loadChats = async () => {
    try {
      const data = await ApiClient.getChats(currentUser.userId);
      setChats(data);
      if (data.length > 0 && !activeChat) setActiveChat(data[0]);
    } catch (e) {}
  };

  const handleCreateChat = async () => {
    try {
      const newChat = await ApiClient.createChat(currentUser.userId);
      setChats([newChat, ...chats]);
      setActiveChat(newChat);
      if(window.innerWidth < 768) setIsSidebarOpen(false); // Ẩn sidebar trên mobile khi tạo mới
    } catch (e: any) {
      if (e.message === 'LIMIT_REACHED') setShowLimitPopup(true);
      else alert(e.message);
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Xóa đoạn chat này?")) return;
    await ApiClient.deleteChat(id);
    if (activeChat?._id === id) setActiveChat(null);
    loadChats();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    const userMsg = inputText.trim();
    setInputText("");
    
    // Optimistic UI update
    const updatedChat = { ...activeChat, messages: [...activeChat.messages, { role: 'user', text: userMsg }] };
    setActiveChat(updatedChat);
    setIsLoading(true);

    try {
      const serverChat = await ApiClient.sendChatMessage(activeChat._id, userMsg);
      setActiveChat(serverChat);
      loadChats(); // Reload để update title bên sidebar
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Vui lòng đăng nhập để sử dụng AI Chat</div>;
  }

  return (
    <div className="h-[85vh] flex rounded-[2rem] overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl relative transition-colors duration-300">
      
      {/* Nút bật tắt Sidebar trên Mobile */}
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden absolute top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-lg shadow-lg">
        {isSidebarOpen ? <X size={20}/> : <MessageSquare size={20}/>}
      </button>

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:relative z-40 w-72 h-full bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300`}>
        <div className="p-4 pt-16 md:pt-4">
          <button onClick={handleCreateChat} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
            <Plus size={18}/> Cuộc trò chuyện mới
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {chats.map(c => (
            <div key={c._id} onClick={() => { setActiveChat(c); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`group p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all ${activeChat?._id === c._id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
              <div className="flex items-center gap-3 truncate pr-2">
                <MessageSquare size={16} className="shrink-0"/>
                <span className="text-sm font-semibold truncate">{c.title}</span>
              </div>
              <button onClick={(e) => handleDeleteChat(c._id, e)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
        <div className="p-4 text-xs text-center text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-800">
          Đã dùng {chats.length}/5 lượt hội thoại
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 w-full">
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-4">
            <Bot size={64} className="opacity-20 animate-pulse"/>
            <p className="font-bold text-lg">Tạo cuộc trò chuyện mới để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {activeChat.messages.length === 0 && (
                 <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400 dark:text-gray-500 font-bold bg-gray-50 dark:bg-gray-800 px-6 py-3 rounded-full">Chào bạn! Mình có thể giúp gì cho bạn hôm nay?</p>
                 </div>
              )}
              {activeChat.messages.map((msg: any, idx: number) => (
                <div key={idx} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-lg'}`}>
                    {msg.role === 'user' ? <UserIcon size={16}/> : <Bot size={16}/>}
                  </div>
                  <div className={`px-5 py-3 rounded-2xl max-w-[85%] text-sm md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-gray-800 dark:text-gray-200 rounded-tr-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm border border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                    {/* Render text with basic markdown formatting (paragraphs) */}
                    {msg.text.split('\n').map((line:string, i:number) => <p key={i} className="mb-2 last:mb-0">{line}</p>)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 max-w-4xl mx-auto">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-lg"><Bot size={16}/></div>
                  <div className="px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 rounded-tl-sm flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  placeholder="Nhập câu hỏi của bạn tại đây..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl py-4 pl-5 pr-14 focus:ring-2 focus:ring-indigo-500 resize-none min-h-[60px] max-h-[200px]"
                  rows={1}
                />
                <button type="submit" disabled={isLoading || !inputText.trim()} className="absolute right-2 bottom-2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-all">
                  <Send size={18}/>
                </button>
              </form>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-3 font-medium">Gemini AI có thể cung cấp thông tin không chính xác. Hãy kiểm chứng lại.</p>
            </div>
          </>
        )}
      </div>

      {/* Popup Limit */}
      {showLimitPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm text-center shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Đã đạt giới hạn!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Mỗi tài khoản chỉ được tạo tối đa 5 cuộc trò chuyện. Hãy xóa bớt lịch sử cũ ở thanh bên trái để tạo mới nhé.</p>
            <button onClick={() => setShowLimitPopup(false)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-xl transition-colors">Đã hiểu</button>
          </div>
        </div>
      )}
    </div>
  );
}