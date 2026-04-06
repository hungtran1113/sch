import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = "mongodb://tapkichco102_db_user:123u@ac-inv7mum-shard-00-00.q84ato5.mongodb.net:27017,ac-inv7mum-shard-00-01.q84ato5.mongodb.net:27017,ac-inv7mum-shard-00-02.q84ato5.mongodb.net:27017/?ssl=true&replicaSet=atlas-37pyc3-shard-0&authSource=admin&appName=Cluster0";
// const  = "mongodb+srv://tapkichco102_db_user:123u@cluster0.q84ato5.mongodb.net/?appName=Cluster0";


mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Schema definitions
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 15552000 } // 6 months
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekId: { type: String, required: true }, 
    date: { type: Date, required: true },
    slotIndex: { type: Number, required: true },
    content: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, expires: 15552000 } // 6 months
});
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

// --- TỰ ĐỘNG TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH ---
const initAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'hiep14082005' });
        if (!adminExists) {
            await User.create({ username: 'hiep14082005', password: 'Hiep14082005' });
            console.log("Đã tạo tài khoản Admin mặc định!");
        }
    } catch (err) { console.error("Lỗi tạo admin:", err); }
};
initAdmin();
// --------------------------------------------

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!/[a-zA-Z]/.test(username)) {
            return res.status(400).json({ error: "Tên đăng ký phải có chữ." });
        }
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ error: "Tài khoản đã tồn tại." });
        }
        const user = new User({ username, password });
        await user.save();
        res.status(201).json({ success: true, userId: user._id });
    } catch (error) {
        res.status(500).json({ error: "Registration failed", details: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu." });
        }
        res.status(200).json({ success: true, userId: user._id, username: user.username });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});

app.get('/api/bookings', async (req, res) => {
    try {
        const { weekId } = req.query;
        const bookings = await Booking.find({ weekId }).populate('userId', 'username');
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
});

// CẬP NHẬT: API Lưu/Xóa Lịch
app.post('/api/bookings', async (req, res) => {
    try {
        const { userId, weekId, date, slotIndex, content } = req.body;
        
        if (!content || content.trim() === '') {
            await Booking.findOneAndDelete({ weekId, date, slotIndex });
            return res.status(200).json({ success: true, message: "Đã xóa" });
        }

        let booking = await Booking.findOne({ weekId, date, slotIndex });
        if (booking) {
            booking.content = content; 
            await booking.save();
        } else {
            booking = new Booking({ userId, weekId, date, slotIndex, content });
            await booking.save();
        }
        res.status(200).json(booking);
    } catch (error) {
        res.status(500).json({ error: "Failed to create/update booking" });
    }
});

// THÊM: API Quản lý User
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username createdAt');
        res.status(200).json(users);
    } catch (error) { 
        res.status(500).json({ error: "Lỗi lấy danh sách" }); 
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "Không tìm thấy user" });
        
        if (user.username === 'hiep14082005') return res.status(403).json({ error: "Không thể xóa Admin" });
        
        await User.findByIdAndDelete(req.params.id);
        await Booking.deleteMany({ userId: req.params.id }); 
        res.status(200).json({ success: true });
    } catch (error) { 
        res.status(500).json({ error: "Lỗi xóa user" }); 
    }
});

// Khởi động Server chạy nội bộ trên Localhost
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => console.log(`Backend server đang chạy ở http://localhost:${PORT}`));
}
// API Lấy toàn bộ dữ liệu lịch trình để xuất Excel (Chỉ dành cho logic Admin)
app.get('/api/admin/export-all', async (req, res) => {
    try {
        const allBookings = await Booking.find({})
            .populate('userId', 'username')
            .sort({ date: 1, slotIndex: 1 }); // Sắp xếp theo ngày và ca
        res.status(200).json(allBookings);
    } catch (error) {
        res.status(500).json({ error: "Lỗi lấy dữ liệu xuất file" });
    }
});
// Chuyển từ module.exports sang export default cho Vercel/ES Module
export default app;