import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = "mongodb://tapkichco102_db_user:123u@ac-inv7mum-shard-00-00.q84ato5.mongodb.net:27017,ac-inv7mum-shard-00-01.q84ato5.mongodb.net:27017,ac-inv7mum-shard-00-02.q84ato5.mongodb.net:27017/?ssl=true&replicaSet=atlas-37pyc3-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const getRandomColor = () => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ff9800', '#ff5722', '#795548'];
    return colors[Math.floor(Math.random() * colors.length)];
};

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    color: { type: String, default: getRandomColor }, 
    createdAt: { type: Date, default: Date.now, expires: 15552000 }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekId: { type: String, required: true }, 
    date: { type: Date, required: true },
    slotIndex: { type: Number, required: true },
    content: { type: String, default: "" } 
});
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

const tripSchema = new mongoose.Schema({
    title: { type: String, required: true },
    itinerary: [{
        time: String, activity: String, location: String, mapUrl: String, note: String, costExpr: { type: String, default: "" } 
    }],
    updatedAt: { type: Date, default: Date.now }
});
const Trip = mongoose.models.Trip || mongoose.model('Trip', tripSchema);

const initAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'hiep14082005' });
        if (!adminExists) await User.create({ username: 'hiep14082005', password: 'Hiep14082005', color: '#111827' });
    } catch (err) { console.error("Lỗi tạo admin:", err); }
};
initAdmin();

app.get('/api/trips', async (req, res) => {
    try { res.json(await Trip.find().sort({ updatedAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/trips', async (req, res) => {
    try {
        if (await Trip.countDocuments() >= 3) return res.status(400).json({ error: "Tối đa 3 lịch trình." });
        const trip = new Trip(req.body); await trip.save(); res.status(201).json(trip);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/trips/:id', async (req, res) => {
    try { res.json(await Trip.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true })); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/trips/:id', async (req, res) => {
    try { await Trip.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!/[a-zA-Z]/.test(username)) return res.status(400).json({ error: "Tên phải có chữ." });
        if (await User.findOne({ username })) return res.status(400).json({ error: "Tài khoản đã tồn tại." });
        const user = new User({ username, password }); await user.save(); 
        // TRẢ VỀ KÈM COLOR
        res.status(201).json({ success: true, userId: user._id, username: user.username, color: user.color });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (!user) return res.status(401).json({ error: "Sai tài khoản/mật khẩu." });
        // TRẢ VỀ KÈM COLOR
        res.json({ userId: user._id, username: user.username, color: user.color });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/bookings', async (req, res) => {
    try { res.json(await Booking.find({ weekId: req.query.weekId }).populate('userId', 'username color')); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { userId, weekId, date, slotIndex, content, action } = req.body;
        if (action === 'delete') {
            await Booking.findOneAndDelete({ userId, weekId, date, slotIndex });
            return res.json({ success: true });
        }
        const slotBookings = await Booking.find({ weekId, date, slotIndex });
        const hasMyBooking = slotBookings.some(b => b.userId.toString() === userId);
        if (!hasMyBooking && slotBookings.length >= 15) return res.status(400).json({ error: "Đã đạt tối đa 15 người." });
        const booking = await Booking.findOneAndUpdate(
            { userId, weekId, date, slotIndex }, { content: content || "" }, { upsert: true, new: true }
        );
        res.json(booking);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/export-all', async (req, res) => {
    try { res.json(await Booking.find().populate('userId', 'username color').sort({ date: 1 })); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/users', async (req, res) => {
    try { res.json(await User.find({}, 'username color createdAt')); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user?.username === 'hiep14082005') return res.status(403).json({ error: "Không thể xóa Admin" });
        await User.findByIdAndDelete(req.params.id); await Booking.deleteMany({ userId: req.params.id }); res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

if (process.env.NODE_ENV !== 'production') app.listen(3000, () => console.log(`🚀 Server: http://localhost:3000`));
export default app;