const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const winston = require('winston');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== LOGGING SETUP ====================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5001'],
  credentials: true
}));

// ==================== SECURITY HEADERS (Anti-Clickjacking) ====================
app.use((req, res, next) => {
  // Prevent clickjacking by disallowing iframe embedding
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Use morgan for HTTP request logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// ==================== MIDDLEWARE ====================

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ==================== MULTER SETUP FOR FILE UPLOADS ====================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp and random number
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${random}${ext}`;
    console.log(`Saving file as: ${filename}`);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, documents, and spreadsheets are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==================== DATABASE CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arcreate';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  logger.error('MongoDB connection error:', err.message);
});

// ==================== SCHEMAS ====================
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: String,
  email: String,
  phone: String,
  role: { type: String, enum: ['admin', 'foreman', 'client'], default: 'client' },
  status: { type: String, default: 'active' },
  specialties: [{ type: String }], // Add this line for foreman specialties
  created_at: { type: Date, default: Date.now }
});

const materialSchema = new mongoose.Schema({
  material_name: { type: String, required: true },
  category: String,
  description: String,
  quantity: { type: Number, default: 0 },
  unit: String,
  unit_price: { type: Number, default: 0 },
  location: String,
  min_stock_level: { type: Number, default: 10 },
  reorder_level: { type: Number, default: 5 },
  status: { type: String, default: 'available' },
  created_at: { type: Date, default: Date.now },
  updated_at: Date
});

const projectSchema = new mongoose.Schema({
  project_name: { type: String, required: true },
  project_type: String,
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  client_name: String,
  client_phone: String,
  address: String,
  status: { type: String, default: 'planning' },
  total_contract_amount: Number,
  start_date: Date,
  estimated_end_date: Date,
  progress: { type: Number, default: 0 },
  description: String,
  created_at: { type: Date, default: Date.now }
});

const clientDetailsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  company: String,
  client_type: { type: String, default: 'individual' }
});

const paymentSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  payment_date: Date,
  payment_method: String,
  payment_type: String,
  reference_number: String,
  notes: String,
  payment_status: { type: String, default: 'paid' },
  created_at: { type: Date, default: Date.now }
});

const progressSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  phase: String,
  percentage: Number,
  description: String,
  progress_date: Date,
  reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  images: [String],
  created_at: { type: Date, default: Date.now }
});

const stockOutSchema = new mongoose.Schema({
  material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
  quantity: Number,
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  purpose: String,
  date_issued: Date,
  issued_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issued_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now }
});

const passwordResetSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  full_name: String,
  email: String,
  phone: String,
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now },
  resolved_at: Date,
  resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const dailyReportSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_name: String,
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foreman_name: String,
  report_date: { type: Date, required: true },
  weather_conditions: String,
  temperature: String,
  work_description: String,
  work_completed: String,
  work_planned: String,
  issues_encountered: String,
  material_used: String,
  equipment_used: String,
  workers_present: String,
  hours_worked: String,
  safety_incidents: String,
  supervisor_notes: String,
  images: [String],
  created_at: { type: Date, default: Date.now }
});

const materialRequestSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_name: String,
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foreman_name: String,
  material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  material_name: String,
  quantity: { type: Number, required: true },
  unit: String,
  priority: { type: String, default: 'medium' },
  required_by: Date,
  purpose: String,
  notes: String,
  status: { type: String, default: 'pending' },
  request_number: String,
  created_at: { type: Date, default: Date.now },
  processed_at: { type: Date }
});

const taskRequestSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_name: String,
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foreman_name: String,
  task_name: { type: String, required: true },
  description: String,
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  assigned_to_name: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  due_date: Date,
  status: { type: String, default: 'pending' },
  request_number: String,
  notes: String,
  created_at: { type: Date, default: Date.now },
  processed_at: Date,
  processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processed_by_name: String,
  rejection_reason: String,
  last_viewed_at: { type: Date, default: null } // Track when foreman last viewed
});

const safetyChecklistSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_name: String,
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checklist_date: Date,
  inspector: String,
  items: {
    ppe: Boolean,
    signage: Boolean,
    fire_extinguisher: Boolean,
    first_aid: Boolean,
    electrical_safety: Boolean,
    scaffolding: Boolean,
    excavation: Boolean,
    confined_space: Boolean,
    hot_work: Boolean,
    chemical_storage: Boolean
  },
  comments: String,
  overall_status: String,
  created_at: { type: Date, default: Date.now }
});

const incidentReportSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_name: String,
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  incident_date: Date,
  incident_time: String,
  incident_type: String,
  severity: String,
  location: String,
  description: String,
  involved_persons: String,
  actions_taken: String,
  reported_by: String,
  status: { type: String, default: 'open' },
  created_at: { type: Date, default: Date.now }
});

const supplierSchema = new mongoose.Schema({
  company_name: { type: String, required: true },
  contact_person: String,
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: String,
  products: [String],
  payment_terms: { type: String, default: 'net30' },
  status: { type: String, default: 'active' },
  notes: String,
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const supplierPurchaseSchema = new mongoose.Schema({
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  material_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  total_amount: { type: Number, required: true },
  purchase_date: { type: Date, required: true },
  invoice_number: String,
  payment_status: { type: String, default: 'pending' },
  notes: String,
  created_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const taskSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_name: String,
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task_name: { type: String, required: true },
  description: String,
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  assigned_to_name: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  due_date: Date,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  created_by: String,
  created_at: { type: Date, default: Date.now },
  completed_at: Date
});

const workerSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  phone: String,
  position: String,
  specialty: String,
  daily_rate: Number,
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const documentSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  project_name: String,
  document_name: { type: String, required: true },
  document_type: { type: String, enum: ['contract', 'blueprint', 'permit', 'invoice', 'report', 'photo', 'other'], required: true },
  description: String,
  file_url: String,  // Now stores the link URL
  is_link: { type: Boolean, default: true }, // Flag for external links
  file_size: String, // Optional for links
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploaded_by_name: String,
  upload_date: { type: Date, default: Date.now },
  is_public: { type: Boolean, default: true }
});

const activityLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_name: String,
  user_role: String,
  action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW'] },
  description: String,
  ip_address: String,
  timestamp: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender_name: String,
  content: String,
  attachment: String,
  timestamp: { type: Date, default: Date.now },
  is_read: { type: Boolean, default: false }
});

const conversationSchema = new mongoose.Schema({
  participant1_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participant1_name: String,
  participant1_role: String,
  participant2_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participant2_name: String,
  participant2_role: String,
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  last_message: String,
  last_message_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

// Add the schema for tracking last viewed
const materialRequestLastViewedSchema = new mongoose.Schema({
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  last_viewed_at: { type: Date, default: Date.now }
});

// Add schema for tracking processed requests last viewed
const materialRequestProcessedViewedSchema = new mongoose.Schema({
  foreman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  last_viewed_at: { type: Date, default: Date.now }
});

// Add notification schema
const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_name: String,
  user_role: String,
  type: { type: String, enum: ['material_request', 'task_request', 'system', 'payment', 'project', 'progress_update', 'document'] },
  action: { type: String, enum: ['approved', 'rejected', 'pending', 'created', 'updated'] },
  title: String,
  message: String,
  link: String,
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed
});

// ==================== MODELS ====================
const User = mongoose.model('User', userSchema);
const Material = mongoose.model('Material', materialSchema);
const Project = mongoose.model('Project', projectSchema);
const StockOut = mongoose.model('StockOut', stockOutSchema);
const ClientDetails = mongoose.model('ClientDetails', clientDetailsSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Progress = mongoose.model('Progress', progressSchema);
const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
const DailyReport = mongoose.model('DailyReport', dailyReportSchema);
const MaterialRequest = mongoose.model('MaterialRequest', materialRequestSchema);
const TaskRequest = mongoose.model('TaskRequest', taskRequestSchema);
const SafetyChecklist = mongoose.model('SafetyChecklist', safetyChecklistSchema);
const IncidentReport = mongoose.model('IncidentReport', incidentReportSchema);
const Supplier = mongoose.model('Supplier', supplierSchema);
const SupplierPurchase = mongoose.model('SupplierPurchase', supplierPurchaseSchema);
const Task = mongoose.model('Task', taskSchema);
const Worker = mongoose.model('Worker', workerSchema);
const Document = mongoose.model('Document', documentSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);
const MaterialRequestLastViewed = mongoose.model('MaterialRequestLastViewed', materialRequestLastViewedSchema);
const MaterialRequestProcessedViewed = mongoose.model('MaterialRequestProcessedViewed', materialRequestProcessedViewedSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// ==================== HELPER FUNCTIONS ====================
const createActivityLog = async (userId, userName, userRole, action, description, ipAddress = '127.0.0.1') => {
  try {
    await ActivityLog.create({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action,
      description,
      ip_address: ipAddress,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating activity log:', error);
  }
};

// Helper function to create notifications
const createNotification = async (userId, userName, userRole, type, action, title, message, link, metadata = {}) => {
  try {
    // Validate that userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.error(`Invalid user_id for notification: ${userId}`);
      return null;
    }

    const notification = await Notification.create({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      type,
      action,
      title,
      message,
      link,
      metadata,
      created_at: new Date(),
      is_read: false
    });
    
    logger.info(`Notification created for ${userName}: ${title}`);
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    return null;
  }
};

// ==================== TEST ROUTE ====================
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Server is running!' });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if admin exists, if not create one
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        full_name: 'System Administrator',
        role: 'admin',
        status: 'active'
      });
      logger.info('Default admin created');
    }
    
    const user = await User.findOne({ username, status: 'active' });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Create activity log
    await createActivityLog(
      user._id,
      user.full_name,
      user.role,
      'LOGIN',
      `User logged in`,
      req.ip
    );
    
    res.json({
      success: true,
      user: {
        user_id: user._id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        email: user.email || '',
        phone: user.phone || ''
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, full_name, email, phone } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      username,
      password: hashedPassword,
      full_name,
      email: email || '',
      phone: phone || '',
      role: 'client',
      status: 'active'
    });
    
    await createActivityLog(
      user._id,
      full_name,
      'client',
      'CREATE',
      `New user registered: ${username}`
    );
    
    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PASSWORD RESET ROUTES ====================
app.post('/api/auth/forgot-password-request', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const existingRequest = await PasswordReset.findOne({ 
      user_id: user._id, 
      status: 'pending' 
    });
    
    if (existingRequest) {
      return res.json({ 
        success: true, 
        message: 'You already have a pending password reset request',
        request_id: existingRequest._id
      });
    }
    
    const resetRequest = await PasswordReset.create({
      user_id: user._id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      status: 'pending',
      created_at: new Date()
    });
    
    logger.info(`Password reset request created for user: ${username}`);
    
    res.json({ 
      success: true, 
      message: 'Your password reset request has been submitted',
      request_id: resetRequest._id
    });
    
  } catch (error) {
    logger.error('Error creating password reset request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { username, admin_username, admin_password } = req.body;
    
    const admin = await User.findOne({ username: admin_username, role: 'admin' });
    
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin authentication failed' });
    }
    
    const validAdminPassword = await bcrypt.compare(admin_password, admin.password);
    if (!validAdminPassword) {
      return res.status(401).json({ success: false, message: 'Admin authentication failed' });
    }
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const newPassword = Math.random().toString(36).slice(-8) + 
                       Math.random().toString(36).slice(-8).toUpperCase();
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    await PasswordReset.updateMany(
      { user_id: user._id, status: 'pending' },
      { 
        status: 'resolved', 
        resolved_at: new Date(),
        resolved_by: admin._id
      }
    );
    
    await createActivityLog(
      admin._id,
      admin.full_name,
      'admin',
      'UPDATE',
      `Reset password for user: ${username}`
    );
    
    logger.info(`Password reset for user: ${username} by admin: ${admin_username}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successful',
      new_password: newPassword,
      username: user.username
    });
    
  } catch (error) {
    logger.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/pending-resets', async (req, res) => {
  try {
    const pendingRequests = await PasswordReset.find({ status: 'pending' })
      .sort({ created_at: -1 });
    
    res.json({ success: true, requests: pendingRequests });
  } catch (error) {
    logger.error('Error fetching pending resets:', error);
    res.status(500).json({ success: false, message: error.message, requests: [] });
  }
});

// ==================== GET PENDING RESET REQUESTS COUNT ====================
app.get('/api/auth/pending-resets-count', async (req, res) => {
  try {
    const count = await PasswordReset.countDocuments({ status: 'pending' });
    res.json({ success: true, count });
  } catch (error) {
    logger.error('Error fetching pending resets count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/resolve-reset/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId, status } = req.body;
    
    const resetRequest = await PasswordReset.findById(requestId);
    
    if (!resetRequest) {
      return res.status(404).json({ success: false, message: 'Reset request not found' });
    }
    
    resetRequest.status = status || 'resolved';
    resetRequest.resolved_at = new Date();
    resetRequest.resolved_by = adminId;
    
    await resetRequest.save();
    
    res.json({ success: true, message: 'Reset request updated successfully' });
  } catch (error) {
    logger.error('Error resolving reset request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { user_id, current_password, new_password } = req.body;
    
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    
    user.password = await bcrypt.hash(new_password, 10);
    await user.save();
    
    await createActivityLog(
      user_id,
      user.full_name,
      user.role,
      'UPDATE',
      `Changed password`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/reset-user-password', async (req, res) => {
  try {
    const { user_id, admin } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (admin) {
      const adminUser = await User.findOne({ username: admin, role: 'admin' });
      if (!adminUser) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Admin verification failed' });
      }
    }
    
    const user = await User.findById(user_id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const generateSecurePassword = () => {
      const length = 8; // Fixed at 8 characters
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let password = '';
      
      // Ensure at least one uppercase, one lowercase, and one number
      password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      password += '0123456789'[Math.floor(Math.random() * 10)];
      
      // Fill the remaining 5 characters randomly
      for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
      }
      
      // Shuffle the password to mix the required characters
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };
    
    const newPassword = generateSecurePassword();
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    if (mongoose.modelNames().includes('PasswordReset')) {
      await PasswordReset.updateMany(
        { user_id: user._id, status: 'pending' },
        { 
          status: 'resolved', 
          resolved_at: new Date(),
          resolved_by: admin ? await User.findOne({ username: admin }).select('_id') : null
        }
      );
    }
    
    logger.info(`Password reset for user: ${user.username} by admin: ${admin || 'Unknown'}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset successful',
      new_password: newPassword,
      username: user.username
    });
    
  } catch (error) {
    logger.error('Error resetting user password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== USER ROUTES ====================
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ created_at: -1 });
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: error.message, users: [] });
  }
});

app.get('/api/users/all', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ created_at: -1 });
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Error fetching all users:', error);
    res.status(500).json({ success: false, message: error.message, users: [] });
  }
});

app.get('/api/users/with-admin', async (req, res) => {
  try {
    const adminId = req.query.admin_id;
    
    const adminInfo = adminId ? await User.findById(adminId).select('-password') : null;
    const users = await User.find().select('-password').sort({ created_at: -1 });
    
    res.json({
      success: true,
      users,
      resetRequests: [],
      adminInfo: adminInfo || {}
    });
  } catch (error) {
    logger.error('Error fetching users with admin:', error);
    res.status(500).json({ success: false, message: error.message, users: [], resetRequests: [], adminInfo: {} });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, full_name, email, phone, role, created_by, specialties } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      username,
      password: hashedPassword,
      full_name,
      email: email || '',
      phone: phone || '',
      role,
      status: 'active',
      specialties: Array.isArray(specialties) ? specialties : []
    });
    
    // Fix: created_by might be a username, not an ObjectId
    let creator = null;
    if (created_by) {
      // Try to find the creator by username first
      creator = await User.findOne({ username: created_by });
    }
    
    await createActivityLog(
      creator?._id || null,
      creator?.full_name || 'System',
      creator?.role || 'admin',
      'CREATE',
      `Created new user: ${username} (${role})`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/users/profile', async (req, res) => {
  try {
    const { user_id, username, full_name, email, phone, specialties } = req.body;
    
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.username = username;
    user.full_name = full_name;
    user.email = email || '';
    user.phone = phone || '';
    if (Array.isArray(specialties)) {
      user.specialties = specialties;
    }
    await user.save();
    
    await createActivityLog(
      user_id,
      full_name,
      user.role,
      'UPDATE',
      `Updated profile`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/users/:userId/specialties', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('full_name role specialties');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, specialties: user.specialties || [] });
  } catch (error) {
    logger.error('Error fetching user specialties:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, password, userRole } = req.body;

    if (userRole === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts cannot be deleted' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.username !== username) {
      return res.status(401).json({ success: false, message: 'Username does not match' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    if (user.role === 'client') {
      await ClientDetails.deleteMany({ user_id: userId });
      const projects = await Project.find({ client_id: userId });
      const projectIds = projects.map(p => p._id);
      await Payment.deleteMany({ client_id: userId });
      await Payment.deleteMany({ project_id: { $in: projectIds } });
      await Progress.deleteMany({ project_id: { $in: projectIds } });
      await Project.deleteMany({ client_id: userId });
      
    } else if (user.role === 'foreman') {
      await Project.updateMany(
        { foreman_id: userId },
        { $set: { foreman_id: null } }
      );
      await StockOut.deleteMany({ $or: [{ issued_by: userId }, { issued_to: userId }] });
    }

    const conversations = await Conversation.find({
      $or: [
        { participant1_id: userId },
        { participant2_id: userId }
      ]
    });
    
    const conversationIds = conversations.map(c => c._id);
    
    await Message.deleteMany({ conversation_id: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });

    await User.findByIdAndDelete(userId);

    logger.info(`User account deleted: ${user.username} (${user.role})`);
    
    res.json({ success: true, message: 'Account successfully deleted' });

  } catch (error) {
    logger.error('Error deleting user account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== MATERIALS ROUTES ====================
app.get('/api/materials', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const materials = await Material.find()
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Material.countDocuments();

    res.json({ 
      success: true, 
      materials,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching materials:', error);
    res.status(500).json({ success: false, message: error.message, materials: [] });
  }
});

// ==================== GET LOW STOCK MATERIALS ====================
app.get('/api/materials/low-stock', async (req, res) => {
  try {
    const materials = await Material.find({
      $expr: {
        $and: [
          { $gt: ['$quantity', 0] },
          { $lte: ['$quantity', '$min_stock_level'] }
        ]
      },
      status: 'available'
    }).sort({ quantity: 1 });

    res.json({ success: true, materials });
  } catch (error) {
    logger.error('Error fetching low stock materials:', error);
    res.status(500).json({ success: false, message: error.message, materials: [] });
  }
});

// ==================== GET OUT OF STOCK MATERIALS ====================
app.get('/api/materials/out-of-stock', async (req, res) => {
  try {
    const materials = await Material.find({
      quantity: { $lte: 0 },
      status: 'available'
    }).sort({ material_name: 1 });

    res.json({ success: true, materials });
  } catch (error) {
    logger.error('Error fetching out of stock materials:', error);
    res.status(500).json({ success: false, message: error.message, materials: [] });
  }
});

app.get('/api/materials/:id', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    res.json({ success: true, material });
  } catch (error) {
    logger.error('Error fetching material:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/materials/search', async (req, res) => {
  try {
    const { search } = req.body;
    
    if (!search) {
      const materials = await Material.find().sort({ created_at: -1 });
      return res.json({ success: true, materials });
    }
    
    const materials = await Material.find({
      $or: [
        { material_name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }).sort({ created_at: -1 });
    
    res.json({ success: true, materials });
  } catch (error) {
    logger.error('Error searching materials:', error);
    res.status(500).json({ success: false, message: error.message, materials: [] });
  }
});

app.post('/api/materials', async (req, res) => {
  try {
    const { username, role, ...materialData } = req.body;
    
    const material = await Material.create({
      ...materialData,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      role,
      'CREATE',
      `Added new material: ${materialData.material_name}`
    );
    
    res.status(201).json({ success: true, material_id: material._id });
  } catch (error) {
    logger.error('Error creating material:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/materials/:id', async (req, res) => {
  try {
    const { username, role, ...materialData } = req.body;
    materialData.updated_at = new Date();
    
    const material = await Material.findByIdAndUpdate(req.params.id, materialData, { new: true });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      role,
      'UPDATE',
      `Updated material: ${materialData.material_name || material.material_name}`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating material:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  try {
    const { username, role } = req.body;
    
    if (!['admin', 'foreman'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }
    
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    
    await Material.findByIdAndDelete(req.params.id);
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      role,
      'DELETE',
      `Deleted material: ${material.material_name}`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting material:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DASHBOARD ROUTES ====================
app.get('/api/dashboard/admin', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalClients = await User.countDocuments({ role: 'client' });
    const totalForemen = await User.countDocuments({ role: 'foreman' });
    const materials = await Material.find();
    const totalInventoryValue = materials.reduce((sum, m) => sum + (m.quantity * m.unit_price), 0);
    const lowStockCount = materials.filter(m => m.quantity <= m.min_stock_level).length;
    
    const recentUsers = await User.find().select('-password').limit(5).sort({ created_at: -1 });

    // Fix: Properly populate client information in recent projects
    const recentProjects = await Project.find()
      .populate('client_id', 'full_name company_name email phone')
      .populate('foreman_id', 'full_name email phone')
      .limit(5)
      .sort({ created_at: -1 });

    const formattedProjects = recentProjects.map(project => ({
      project_id: project._id,
      project_name: project.project_name,
      project_type: project.project_type,
      client_id: project.client_id?._id,
      client_name: project.client_id?.company_name || project.client_id?.full_name || 'Unknown',
      foreman_id: project.foreman_id?._id,
      foreman_name: project.foreman_id?.full_name,
      address: project.address,
      total_contract_amount: project.total_contract_amount,
      status: project.status,
      start_date: project.start_date,
      estimated_end_date: project.estimated_end_date,
      created_at: project.created_at,
      progress: project.progress || 0
    }));
    
    const pendingResets = await PasswordReset.countDocuments({ status: 'pending' });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalProjects: await Project.countDocuments(),
        totalClients,
        totalForemen,
        totalSuppliers: await Supplier.countDocuments(),
        totalRevenue: 0,
        totalInventoryValue,
        lowStockCount,
        pendingInquiries: pendingResets,
        activeProjects: await Project.countDocuments({ status: { $in: ['planning', 'construction', 'finishing'] } })
      },
      recentUsers,
      recentProjects: formattedProjects
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/dashboard/foreman/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const projects = await Project.find({ foreman_id: userId })
      .populate('client_id', 'full_name company_name email phone')  // Add populate for client
      .sort({ created_at: -1 })
      .limit(5);
    
    const totalMaterials = await Material.countDocuments();
    
    const lowStock = await Material.find({
      $expr: { $lte: ['$quantity', '$min_stock_level'] }
    }).limit(5);
    
    const recentStockOut = await StockOut.find({ issued_to: userId })
      .populate('material_id', 'material_name')
      .populate('project_id', 'project_name')
      .sort({ date_issued: -1 })
      .limit(5);
    
    // Format projects with proper client name
    const formattedProjects = projects.map(p => ({
      project_id: p._id,
      project_name: p.project_name,
      project_type: p.project_type,
      client_id: p.client_id?._id,
      client_name: p.client_id?.company_name || p.client_id?.full_name || 'Not assigned', // Fix: Use company_name or full_name
      client_phone: p.client_id?.phone || '',
      client_email: p.client_id?.email || '',
      foreman_id: p.foreman_id,
      address: p.address,
      total_contract_amount: p.total_contract_amount,
      status: p.status,
      start_date: p.start_date,
      estimated_end_date: p.estimated_end_date,
      progress: p.progress || 0
    }));
    
    res.json({
      success: true,
      stats: {
        activeProjects: projects.length,
        totalMaterials,
        lowStockItems: lowStock.length,
        recentIssues: recentStockOut.length
      },
      projects: formattedProjects,
      lowStock: lowStock.map(m => ({
        material_id: m._id,
        material_name: m.material_name,
        quantity: m.quantity,
        unit: m.unit,
        location: m.location || 'Not specified',
        min_stock_level: m.min_stock_level
      })),
      recentStockOut: recentStockOut.map(s => ({
        stockout_id: s._id,
        material_name: s.material_id?.material_name || 'Unknown',
        quantity: s.quantity,
        project_name: s.project_id?.project_name || 'General Use',
        purpose: s.purpose || '',
        date_issued: s.date_issued
      }))
    });
  } catch (error) {
    logger.error('Foreman dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      stats: {
        activeProjects: 0,
        totalMaterials: 0,
        lowStockItems: 0,
        recentIssues: 0
      },
      projects: [],
      lowStock: [],
      recentStockOut: []
    });
  }
});

app.get('/api/dashboard/client/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    const clientDetails = await ClientDetails.findOne({ user_id: userId });
    
    const projects = await Project.find({ client_id: userId })
      .populate('foreman_id', 'full_name email phone')
      .sort({ created_at: -1 });
    
    const payments = await Payment.find({ client_id: userId })
      .populate('project_id', 'project_name')
      .sort({ payment_date: -1 })
      .limit(5);
    
    const projectIds = projects.map(p => p._id);
    const progressUpdates = await Progress.find({ project_id: { $in: projectIds } })
      .populate('project_id', 'project_name')
      .populate('reported_by', 'full_name')
      .sort({ progress_date: -1 })
      .limit(5);
    
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => 
      ['planning', 'construction', 'finishing'].includes(p.status)
    ).length;
    const totalInvestment = projects.reduce((sum, p) => sum + (p.total_contract_amount || 0), 0);
    const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const teamMembers = [];
    const teamMap = new Map();
    
    for (const project of projects) {
      if (project.foreman_id && !teamMap.has(project.foreman_id._id.toString())) {
        teamMap.set(project.foreman_id._id.toString(), true);
        teamMembers.push({
          user_id: project.foreman_id._id,
          full_name: project.foreman_id.full_name,
          role: 'foreman',
          email: project.foreman_id.email,
          phone: project.foreman_id.phone
        });
      }
    }
    
    res.json({
      success: true,
      clientInfo: {
        company: clientDetails?.company || '',
        client_type: clientDetails?.client_type || 'individual',
        phone: user?.phone || '',
        email: user?.email || ''
      },
      stats: {
        totalProjects,
        activeProjects,
        totalInvestment,
        paidAmount
      },
      projects: projects.map(p => {
        const projectPayments = payments.filter(pay => pay.project_id?._id.toString() === p._id.toString());
        const totalPaid = projectPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
        
        return {
          project_id: p._id,
          project_name: p.project_name,
          project_type: p.project_type || 'Residential',
          status: p.status || 'planning',
          address: p.address || '',
          start_date: p.start_date,
          total_contract_amount: p.total_contract_amount || 0,
          balance: (p.total_contract_amount || 0) - totalPaid,
          project_manager: p.foreman_id?.full_name || 'Not assigned'
        };
      }),
      recentPayments: payments.map(p => ({
        payment_id: p._id,
        project_name: p.project_id?.project_name || 'Unknown',
        amount: p.amount || 0,
        payment_type: p.payment_type || 'payment',
        payment_method: p.payment_method || 'cash',
        payment_date: p.payment_date
      })),
      recentUpdates: progressUpdates.map(u => ({
        progress_id: u._id,
        project_name: u.project_id?.project_name || 'Unknown',
        phase: u.phase || 'Construction',
        percentage: u.percentage || 0,
        description: u.description || '',
        progress_date: u.progress_date,
        reported_by: u.reported_by?.full_name || 'Unknown'
      })),
      projectTeam: teamMembers
    });
  } catch (error) {
    logger.error('Client dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      clientInfo: {},
      stats: {
        totalProjects: 0,
        activeProjects: 0,
        totalInvestment: 0,
        paidAmount: 0
      },
      projects: [],
      recentPayments: [],
      recentUpdates: [],
      projectTeam: []
    });
  }
});

// ==================== PROJECTS ROUTES ====================
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('client_id', 'full_name company_name')
      .populate('foreman_id', 'full_name')
      .sort({ created_at: -1 });
    
    const formatted = projects.map(p => ({
      project_id: p._id,
      project_name: p.project_name,
      project_type: p.project_type,
      client_id: p.client_id?._id,
      client_name: p.client_id?.company_name || p.client_id?.full_name || 'Unknown',
      foreman_id: p.foreman_id?._id,
      foreman_name: p.foreman_id?.full_name,
      address: p.address,
      total_contract_amount: p.total_contract_amount,
      status: p.status,
      start_date: p.start_date,
      estimated_end_date: p.estimated_end_date,
      created_at: p.created_at,
      progress: p.progress || 0
    }));
    
    res.json({ success: true, projects: formatted });
  } catch (error) {
    logger.error('Error fetching projects:', error);
    res.status(500).json({ success: false, message: error.message, projects: [] });
  }
});

app.get('/api/projects/client/:clientId', async (req, res) => {
  try {
    const projects = await Project.find({ client_id: req.params.clientId })
      .populate('foreman_id', 'full_name')
      .sort({ created_at: -1 });
    
    const projectsWithBalance = await Promise.all(projects.map(async (p) => {
      const payments = await Payment.find({ project_id: p._id });
      const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
      const balance = (p.total_contract_amount || 0) - totalPaid;
      
      return {
        project_id: p._id,
        project_name: p.project_name,
        project_type: p.project_type,
        client_id: p.client_id,
        foreman_id: p.foreman_id?._id,
        foreman_name: p.foreman_id?.full_name,
        address: p.address,
        total_contract_amount: p.total_contract_amount,
        balance,
        status: p.status,
        start_date: p.start_date,
        estimated_end_date: p.estimated_end_date,
        created_at: p.created_at,
        progress: p.progress || 0
      };
    }));
    
    res.json({ success: true, projects: projectsWithBalance });
  } catch (error) {
    logger.error('Error fetching client projects:', error);
    res.status(500).json({ success: false, message: error.message, projects: [] });
  }
});

app.get('/api/projects/foreman/:foremanId', async (req, res) => {
  try {
    const projects = await Project.find({ foreman_id: req.params.foremanId })
      .populate('client_id', 'full_name company_name')
      .sort({ created_at: -1 });
    
    const formatted = projects.map(p => ({
      project_id: p._id,
      project_name: p.project_name,
      project_type: p.project_type,
      client_id: p.client_id?._id,
      client_name: p.client_id?.company_name || p.client_id?.full_name || 'Unknown',
      address: p.address,
      total_contract_amount: p.total_contract_amount,
      status: p.status,
      start_date: p.start_date,
      estimated_end_date: p.estimated_end_date,
      created_at: p.created_at,
      progress: p.progress || 0
    }));
    
    res.json({ success: true, projects: formatted });
  } catch (error) {
    logger.error('Error fetching foreman projects:', error);
    res.status(500).json({ success: false, message: error.message, projects: [] });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client_id', 'full_name company_name email phone')
      .populate('foreman_id', 'full_name email phone');
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const payments = await Payment.find({ project_id: project._id }).sort({ payment_date: -1 });
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const progressUpdates = await Progress.find({ project_id: project._id })
      .populate('reported_by', 'full_name')
      .sort({ progress_date: -1 });
    
    res.json({
      success: true,
      project: {
        project_id: project._id,
        project_name: project.project_name,
        project_type: project.project_type,
        client: project.client_id,
        foreman: project.foreman_id,
        address: project.address,
        total_contract_amount: project.total_contract_amount,
        balance: (project.total_contract_amount || 0) - totalPaid,
        status: project.status,
        start_date: project.start_date,
        estimated_end_date: project.estimated_end_date,
        created_at: project.created_at,
        description: project.description,
        progress: project.progress || 0,
        payments,
        progressUpdates
      }
    });
  } catch (error) {
    logger.error('Error fetching project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { username, ...projectData } = req.body;
    
    const project = await Project.create({
      ...projectData,
      created_at: new Date()
    });
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      user?.role || 'admin',
      'CREATE',
      `Created new project: ${projectData.project_name}`
    );
    
    res.status(201).json({ success: true, project_id: project._id });
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { username, ...projectData } = req.body;
    
    const project = await Project.findByIdAndUpdate(req.params.id, projectData, { new: true });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      user?.role || 'admin',
      'UPDATE',
      `Updated project: ${projectData.project_name || project.project_name}`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { username, role } = req.body;
    
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }
    
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    await Payment.deleteMany({ project_id: req.params.id });
    await Progress.deleteMany({ project_id: req.params.id });
    await StockOut.deleteMany({ project_id: req.params.id });
    
    await Project.findByIdAndDelete(req.params.id);
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      role,
      'DELETE',
      `Deleted project: ${project.project_name}`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CLIENTS ROUTES ====================
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' })
      .select('-password')
      .sort({ created_at: -1 });
    
    const clientsWithDetails = await Promise.all(clients.map(async (client) => {
      const details = await ClientDetails.findOne({ user_id: client._id });
      return {
        user_id: client._id,
        username: client.username,
        full_name: client.full_name,
        email: client.email,
        phone: client.phone,
        company_name: details?.company,
        client_type: details?.client_type || 'individual',
        created_at: client.created_at
      };
    }));
    
    res.json({ success: true, clients: clientsWithDetails });
  } catch (error) {
    logger.error('Error fetching clients:', error);
    res.status(500).json({ success: false, message: error.message, clients: [] });
  }
});

// ==================== PAYMENTS ROUTES ====================
app.get('/api/payments/all', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('project_id', 'project_name')
      .sort({ payment_date: -1 });
    
    const formattedPayments = payments.map(p => ({
      _id: p._id,
      project_id: p.project_id?._id,
      project_name: p.project_id?.project_name || 'Unknown Project',
      amount: p.amount || 0,
      payment_date: p.payment_date,
      payment_method: p.payment_method || 'cash',
      payment_type: p.payment_type || 'payment',
      client_id: p.client_id
    }));
    
    res.json({ success: true, payments: formattedPayments });
  } catch (error) {
    logger.error('Error fetching all payments:', error);
    res.status(500).json({ success: false, message: error.message, payments: [] });
  }
});

app.get('/api/payments/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const projects = await Project.find({ client_id: clientId });
    const projectIds = projects.map(p => p._id);
    
    const payments = await Payment.find({ project_id: { $in: projectIds } })
      .populate('project_id', 'project_name')
      .sort({ payment_date: -1 });
    
    const formattedPayments = payments.map(p => ({
      payment_id: p._id,
      project_id: p.project_id?._id,
      project_name: p.project_id?.project_name || 'Unknown Project',
      amount: p.amount || 0,
      payment_date: p.payment_date,
      payment_method: p.payment_method || 'cash',
      payment_type: p.payment_type || 'payment',
      payment_status: p.payment_status || 'paid',
      reference_number: p.reference_number || '',
      notes: p.notes || '',
      created_at: p.created_at
    }));
    
    res.json({ success: true, payments: formattedPayments });
  } catch (error) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: error.message, payments: [] });
  }
});

app.get('/api/payments/client/:clientId/recent', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 5 } = req.query;
    
    const projects = await Project.find({ client_id: clientId });
    const projectIds = projects.map(p => p._id);
    
    const payments = await Payment.find({ project_id: { $in: projectIds } })
      .populate('project_id', 'project_name')
      .sort({ payment_date: -1 })
      .limit(parseInt(limit));
    
    const formattedPayments = payments.map(p => ({
      payment_id: p._id,
      project_name: p.project_id?.project_name || 'Unknown Project',
      amount: p.amount || 0,
      payment_date: p.payment_date,
      payment_method: p.payment_method || 'cash',
      payment_type: p.payment_type || 'payment'
    }));
    
    res.json({ success: true, payments: formattedPayments });
  } catch (error) {
    logger.error('Error fetching recent payments:', error);
    res.status(500).json({ success: false, message: error.message, payments: [] });
  }
});

app.get('/api/payments/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const payments = await Payment.find({ project_id: projectId })
      .populate('project_id', 'project_name')
      .sort({ payment_date: -1 });

    const formattedPayments = payments.map(p => ({
      payment_id: p._id,
      project_id: p.project_id?._id,
      project_name: p.project_id?.project_name || 'Unknown Project',
      amount: p.amount || 0,
      payment_date: p.payment_date,
      payment_method: p.payment_method || 'cash',
      payment_type: p.payment_type || 'payment',
      payment_status: p.payment_status || 'paid',
      reference_number: p.reference_number || '',
      notes: p.notes || '',
      created_at: p.created_at
    }));

    res.json({ success: true, payments: formattedPayments });
  } catch (error) {
    logger.error('Error fetching project payments:', error);
    res.status(500).json({ success: false, message: error.message, payments: [] });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { username, ...paymentData } = req.body;
    
    const payment = await Payment.create({
      ...paymentData,
      payment_date: paymentData.payment_date || new Date(),
      created_at: new Date()
    });
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      user?.role || 'client',
      'CREATE',
      `Made payment of ₱${paymentData.amount} for project`
    );
    
    res.status(201).json({ success: true, payment_id: payment._id });
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PROGRESS ROUTES ====================
app.get('/api/progress/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const updates = await Progress.find({ project_id: projectId })
      .populate('reported_by', 'full_name')
      .sort({ progress_date: -1 });
    
    const formattedUpdates = updates.map(u => ({
      progress_id: u._id,
      project_id: u.project_id,
      phase: u.phase || 'Construction',
      percentage: u.percentage || 0,
      description: u.description || '',
      progress_date: u.progress_date,
      reported_by: u.reported_by?.full_name || 'Unknown',
      images: u.images || []
    }));
    
    res.json({ success: true, updates: formattedUpdates });
  } catch (error) {
    logger.error('Error fetching progress updates:', error);
    res.status(500).json({ success: false, message: error.message, updates: [] });
  }
});

app.get('/api/progress/client/:clientId/recent', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { limit = 5 } = req.query;
    
    const projects = await Project.find({ client_id: clientId });
    const projectIds = projects.map(p => p._id);
    
    const updates = await Progress.find({ project_id: { $in: projectIds } })
      .populate('project_id', 'project_name')
      .populate('reported_by', 'full_name')
      .sort({ progress_date: -1 })
      .limit(parseInt(limit));
    
    const formattedUpdates = updates.map(u => ({
      progress_id: u._id,
      project_name: u.project_id?.project_name || 'Unknown Project',
      phase: u.phase || 'Construction',
      percentage: u.percentage || 0,
      description: u.description || '',
      progress_date: u.progress_date,
      reported_by: u.reported_by?.full_name || 'Unknown'
    }));
    
    res.json({ success: true, updates: formattedUpdates });
  } catch (error) {
    logger.error('Error fetching recent progress:', error);
    res.status(500).json({ success: false, message: error.message, updates: [] });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    const { username, ...progressData } = req.body;
    
    const update = await Progress.create({
      ...progressData,
      progress_date: progressData.progress_date || new Date(),
      created_at: new Date()
    });
    
    // Get the project to find the client
    const project = await Project.findById(progressData.project_id);
    
    if (project && project.client_id) {
      const client = await User.findById(project.client_id);
      const foreman = await User.findOne({ username });
      
      if (client && mongoose.Types.ObjectId.isValid(client._id)) {
        // Create notification for client - FIXED: changed type from 'progress_update' to 'project'
        await createNotification(
          client._id,
          client.full_name,
          'client',
          'project',  // Changed from 'progress_update' to 'project'
          'created',
          `📊 Progress Update: ${project.project_name}`,
          `Project "${project.project_name}" is now ${progressData.percentage}% complete. Phase: ${progressData.phase}`,
          `/progress-updates?project_id=${project._id}`,
          {
            project_id: project._id,
            project_name: project.project_name,
            phase: progressData.phase,
            percentage: progressData.percentage
          }
        );
      }
    }
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      user?.role || 'foreman',
      'CREATE',
      `Added progress update: ${progressData.phase} - ${progressData.percentage}%`
    );
    
    res.status(201).json({ success: true, progress_id: update._id });
  } catch (error) {
    logger.error('Error creating progress update:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete progress update endpoint
app.delete('/api/progress/:progressId', async (req, res) => {
  try {
    const { progressId } = req.params;
    const { user_id, user_role, username } = req.body;
    
    const progress = await Progress.findById(progressId);
    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress update not found' });
    }
    
    // Check if user has permission to delete
    if (user_role === 'client') {
      // Verify the progress update belongs to a project of this client
      const project = await Project.findById(progress.project_id);
      if (!project || project.client_id.toString() !== user_id) {
        return res.status(403).json({ success: false, message: 'You do not have permission to delete this progress update' });
      }
    } else if (user_role !== 'admin' && user_role !== 'foreman') {
      // Only admin, foreman, and client can delete
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }
    
    await Progress.findByIdAndDelete(progressId);
    
    // Create activity log
    const user = await User.findById(user_id);
    await createActivityLog(
      user_id,
      user?.full_name || username,
      user_role,
      'DELETE',
      `Deleted progress update for project: ${progress.project_name} - ${progress.phase} (${progress.percentage}%)`
    );
    
    res.json({ success: true, message: 'Progress update deleted successfully' });
  } catch (error) {
    logger.error('Error deleting progress update:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SUPPLIERS ROUTES ====================
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ created_at: -1 });
    res.json({ success: true, suppliers });
  } catch (error) {
    logger.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: error.message, suppliers: [] });
  }
});

app.get('/api/suppliers/top', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const topSuppliers = await SupplierPurchase.aggregate([
      {
        $group: {
          _id: '$supplier_id',
          totalSpent: { $sum: '$total_amount' },
          purchaseCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      { $unwind: '$supplier' }
    ]);
    
    res.json({ success: true, suppliers: topSuppliers });
  } catch (error) {
    logger.error('Error fetching top suppliers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/suppliers/purchases', async (req, res) => {
  try {
    const purchases = await SupplierPurchase.find()
      .populate('supplier_id', 'company_name')
      .populate('material_id', 'material_name unit')
      .sort({ purchase_date: -1 });
    
    const formatted = purchases.map(p => ({
      _id: p._id,
      supplier_id: p.supplier_id?._id,
      supplier_name: p.supplier_id?.company_name || 'Unknown',
      material_id: p.material_id?._id,
      material_name: p.material_id?.material_name || 'Unknown',
      unit: p.material_id?.unit || 'pcs',
      quantity: p.quantity,
      unit_price: p.unit_price,
      total_amount: p.total_amount,
      purchase_date: p.purchase_date,
      invoice_number: p.invoice_number,
      payment_status: p.payment_status,
      notes: p.notes,
      created_at: p.created_at
    }));
    
    res.json({ success: true, purchases: formatted });
  } catch (error) {
    logger.error('Error fetching purchases:', error);
    res.status(500).json({ success: false, message: error.message, purchases: [] });
  }
});

app.get('/api/suppliers/:supplierId/purchases', async (req, res) => {
  try {
    const purchases = await SupplierPurchase.find({ supplier_id: req.params.supplierId })
      .populate('material_id', 'material_name unit')
      .sort({ purchase_date: -1 });
    
    res.json({ success: true, purchases });
  } catch (error) {
    logger.error('Error fetching supplier purchases:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/suppliers/:supplierId/details', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.supplierId);
    
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    const purchases = await SupplierPurchase.find({ supplier_id: req.params.supplierId })
      .populate('material_id', 'material_name unit')
      .sort({ purchase_date: -1 });
    
    const stats = {
      total_spent: purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      total_purchases: purchases.length,
      average_order_value: purchases.length > 0 
        ? purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0) / purchases.length 
        : 0,
      last_purchase: purchases[0]?.purchase_date || null
    };
    
    res.json({
      success: true,
      supplier,
      purchases,
      stats
    });
  } catch (error) {
    logger.error('Error fetching supplier details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { username, ...supplierData } = req.body;
    
    const supplier = await Supplier.create({
      ...supplierData,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      user?.role || 'admin',
      'CREATE',
      `Added new supplier: ${supplierData.company_name}`
    );
    
    res.status(201).json({ success: true, supplier_id: supplier._id });
  } catch (error) {
    logger.error('Error creating supplier:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { username, ...supplierData } = req.body;
    supplierData.updated_at = new Date();
    
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, supplierData, { new: true });
    
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      user?.role || 'admin',
      'UPDATE',
      `Updated supplier: ${supplierData.company_name || supplier.company_name}`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating supplier:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { username } = req.body;
    
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    
    await SupplierPurchase.deleteMany({ supplier_id: req.params.id });
    await Supplier.findByIdAndDelete(req.params.id);
    
    const user = await User.findOne({ username });
    await createActivityLog(
      user?._id,
      username,
      user?.role || 'admin',
      'DELETE',
      `Deleted supplier: ${supplier.company_name}`
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting supplier:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/suppliers/purchases', async (req, res) => {
  try {
    const { username, ...purchaseData } = req.body;
    
    const purchase = await SupplierPurchase.create({
      ...purchaseData,
      created_at: new Date()
    });
    
    // Update material quantity
    await Material.findByIdAndUpdate(purchaseData.material_id, {
      $inc: { quantity: purchaseData.quantity }
    });
    
    const user = await User.findOne({ username });
    const supplier = await Supplier.findById(purchaseData.supplier_id);
    await createActivityLog(
      user?._id,
      username,
      user?.role || 'admin',
      'CREATE',
      `Recorded purchase from ${supplier?.company_name}`
    );
    
    res.status(201).json({ success: true, purchase_id: purchase._id });
  } catch (error) {
    logger.error('Error recording purchase:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/suppliers/compare-prices', async (req, res) => {
  try {
    const { materialId, startDate, endDate } = req.body;

    if (!materialId) {
      return res.status(400).json({ success: false, message: 'Material ID is required' });
    }
    
    const query = { material_id: materialId };
    if (startDate && endDate) {
      query.purchase_date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const comparison = await SupplierPurchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$supplier_id',
          min_price: { $min: '$unit_price' },
          max_price: { $max: '$unit_price' },
          avg_price: { $avg: '$unit_price' },
          total_spent: { $sum: '$total_amount' },
          purchase_count: { $sum: 1 },
          last_purchase: { $max: '$purchase_date' }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      { $unwind: '$supplier' },
      { $sort: { avg_price: 1 } }
    ]);
    
    const formatted = comparison.map(c => ({
      supplier_id: c._id,
      supplier_name: c.supplier.company_name,
      min_price: c.min_price,
      max_price: c.max_price,
      avg_price: c.avg_price,
      total_spent: c.total_spent,
      purchase_count: c.purchase_count,
      last_purchase: c.last_purchase
    }));
    
    res.json({ success: true, comparison: formatted });
  } catch (error) {
    logger.error('Error comparing prices:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PURCHASES ROUTES ====================
app.get('/api/purchases/all', async (req, res) => {
  try {
    const purchases = await SupplierPurchase.find()
      .populate('supplier_id', 'company_name')
      .populate('material_id', 'material_name unit')
      .sort({ purchase_date: -1 });
    
    const formatted = purchases.map(p => ({
      _id: p._id,
      supplier_id: p.supplier_id?._id,
      supplier_name: p.supplier_id?.company_name || 'Unknown',
      material_id: p.material_id?._id,
      material_name: p.material_id?.material_name || 'Unknown',
      unit: p.material_id?.unit || 'pcs',
      quantity: p.quantity,
      unit_price: p.unit_price,
      total_amount: p.total_amount,
      purchase_date: p.purchase_date,
      invoice_number: p.invoice_number,
      payment_status: p.payment_status,
      notes: p.notes,
      created_at: p.created_at
    }));
    
    res.json({ success: true, purchases: formatted });
  } catch (error) {
    logger.error('Error fetching all purchases:', error);
    res.status(500).json({ success: false, message: error.message, purchases: [] });
  }
});

// ==================== STOCK ROUTES ====================
app.get('/api/stock/out/recent', async (req, res) => {
  try {
    const { limit = 5, foremanId } = req.query;
    
    const query = foremanId ? { issued_to: foremanId } : {};
    
    const stockOut = await StockOut.find(query)
      .populate('material_id', 'material_name')
      .populate('project_id', 'project_name')
      .sort({ date_issued: -1 })
      .limit(parseInt(limit));
    
    const formatted = stockOut.map(s => ({
      stockout_id: s._id,
      material_name: s.material_id?.material_name || 'Unknown',
      quantity: s.quantity,
      project_name: s.project_id?.project_name || 'General Use',
      purpose: s.purpose || '',
      date_issued: s.date_issued
    }));
    
    res.json({ success: true, stockOut: formatted });
  } catch (error) {
    logger.error('Recent stock out error:', error);
    res.status(500).json({ success: false, message: error.message, stockOut: [] });
  }
});

// Delete stock out record endpoint
app.delete('/api/stock/out/:stockId', async (req, res) => {
  try {
    const { stockId } = req.params;
    const { user_id, user_role, username } = req.body;
    
    const stockOut = await StockOut.findById(stockId);
    if (!stockOut) {
      return res.status(404).json({ success: false, message: 'Stock issue record not found' });
    }
    
    // Check if user has permission to delete
    if (user_role === 'foreman') {
      // Verify the stock out record belongs to this foreman
      if (stockOut.issued_to && stockOut.issued_to.toString() !== user_id) {
        return res.status(403).json({ success: false, message: 'You do not have permission to delete this record' });
      }
    } else if (user_role !== 'admin') {
      // Only admin and foreman can delete
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }
    
    // Get material info for restoring stock (optional)
    const material = await Material.findById(stockOut.material_id);
    
    await StockOut.findByIdAndDelete(stockId);
    
    // Create activity log
    const user = await User.findById(user_id);
    await createActivityLog(
      user_id,
      user?.full_name || username,
      user_role,
      'DELETE',
      `Deleted stock issue record for ${stockOut.quantity} ${stockOut.unit || 'units'} of ${material?.material_name || 'material'} from project: ${stockOut.project_name || 'General Use'}`
    );
    
    res.json({ success: true, message: 'Stock issue record deleted successfully' });
  } catch (error) {
    logger.error('Error deleting stock out record:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DAILY REPORTS ROUTES ====================
app.get('/api/reports/all', async (req, res) => {
  try {
    const { project_id, start, end } = req.query;
    let query = {};

    if (project_id && project_id !== 'all') {
      query.project_id = project_id;
    }

    if (start && end) {
      query.report_date = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    const reports = await DailyReport.find(query)
      .populate('project_id', 'project_name')
      .populate('foreman_id', 'full_name')
      .sort({ report_date: -1 });

    const formatted = reports.map(r => ({
      ...r.toObject(),
      project_name: r.project_id?.project_name || r.project_name,
      foreman_name: r.foreman_id?.full_name || r.foreman_name
    }));

    res.json({ success: true, reports: formatted });
  } catch (error) {
    logger.error('Error fetching all reports:', error);
    res.status(500).json({ success: false, message: error.message, reports: [] });
  }
});

app.get('/api/reports/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { start, end } = req.query;
    
    const query = { project_id: projectId };
    if (start && end) {
      query.report_date = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }
    
    const reports = await DailyReport.find(query).sort({ report_date: -1 });
    res.json({ success: true, reports });
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ success: false, message: error.message, reports: [] });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const report = await DailyReport.create(req.body);
    res.status(201).json({ success: true, report_id: report._id });
  } catch (error) {
    logger.error('Error creating report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== MATERIAL REQUESTS ROUTES ====================
app.get('/api/material-requests/foreman/:foremanId', async (req, res) => {
  try {
    const { foremanId } = req.params;
    const { project_id } = req.query;
    
    const query = { foreman_id: foremanId };
    if (project_id) {
      query.project_id = project_id;
    }
    
    const requests = await MaterialRequest.find(query).sort({ created_at: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    logger.error('Error fetching material requests:', error);
    res.status(500).json({ success: false, message: error.message, requests: [] });
  }
});

app.post('/api/material-requests', async (req, res) => {
  try {
    const requestPayload = {
      ...req.body,
      status: req.body.status || 'pending',
      created_at: req.body.created_at ? new Date(req.body.created_at) : new Date(),
      request_number: req.body.request_number || `REQ-${Date.now().toString().slice(-8)}`
    };

    const request = await MaterialRequest.create(requestPayload);

    // Optional activity log on creation
    await createActivityLog(
      request.foreman_id,
      request.foreman_name,
      'foreman',
      'CREATE',
      `Submitted material request: ${request.quantity} ${request.unit} of ${request.material_name}`
    );

    res.status(201).json({ success: true, request_id: request._id });
  } catch (error) {
    logger.error('Error creating material request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/material-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    await MaterialRequest.findByIdAndUpdate(requestId, req.body, { new: true });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating material request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PROCESS MATERIAL REQUEST (APPROVE AND DEDUCT STOCK) ====================
// Update the material request process endpoint
app.put('/api/material-requests/:requestId/process', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, admin_username } = req.body;
    
    const request = await MaterialRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    const admin = await User.findOne({ username: admin_username });
    
    // Store foreman details for notification
    const foremanId = request.foreman_id;
    const foremanName = request.foreman_name;
    const requestNumber = request.request_number || request._id.toString().slice(-8);
    const materialName = request.material_name;
    const quantity = request.quantity;
    const unit = request.unit;
    
    if (action === 'reject') {
      request.status = 'rejected';
      request.processed_at = new Date();
      await request.save();
      
      // Create notification for foreman - REJECTED
      await createNotification(
        foremanId,
        foremanName,
        'foreman',
        'material_request',
        'rejected',
        `❌ Material Request Rejected`,
        `Your request for ${quantity} ${unit} of ${materialName} (${requestNumber}) was rejected by ${admin?.full_name || admin_username}.`,
        '/material-requests',
        {
          request_id: requestId,
          request_number: requestNumber,
          material_name: materialName,
          quantity: quantity,
          unit: unit,
          action: 'rejected'
        }
      );
      
      // Create activity log
      await createActivityLog(
        admin?._id,
        admin_username,
        'admin',
        'UPDATE',
        `Rejected material request #${requestNumber} for ${materialName}`,
        req.ip
      );
      
      logger.info(`Material request ${requestId} rejected by ${admin_username}`);
      return res.json({ success: true, message: 'Request rejected' });
    }

    if (action !== 'approve') {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const material = await Material.findById(request.material_id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    if (material.quantity < request.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${material.quantity} ${material.unit}, Requested: ${request.quantity} ${material.unit}`
      });
    }

    material.quantity -= request.quantity;
    material.updated_at = new Date();
    await material.save();

    request.status = 'approved';
    request.processed_at = new Date();
    await request.save();

    await StockOut.create({
      material_id: request.material_id,
      quantity: request.quantity,
      project_id: request.project_id,
      purpose: request.purpose || 'Material request approved',
      date_issued: new Date(),
      issued_to: request.foreman_id,
      issued_by: admin?._id,
      created_at: new Date()
    });
    
    // Create notification for foreman - APPROVED
    await createNotification(
      foremanId,
      foremanName,
      'foreman',
      'material_request',
      'approved',
      `✅ Material Request Approved`,
      `Your request for ${quantity} ${unit} of ${materialName} (${requestNumber}) was approved by ${admin?.full_name || admin_username}. ${quantity} ${unit} has been deducted from inventory.`,
      '/material-requests',
      {
        request_id: requestId,
        request_number: requestNumber,
        material_name: materialName,
        quantity: quantity,
        unit: unit,
        remaining_stock: material.quantity,
        action: 'approved'
      }
    );

    await createActivityLog(
      admin?._id,
      admin_username,
      'admin',
      'UPDATE',
      `Approved material request #${requestNumber} and deducted ${quantity} ${unit} of ${materialName}`,
      req.ip
    );

    logger.info(`Material request ${requestId} approved and stock deducted by ${admin_username}`);

    res.json({
      success: true,
      message: 'Request approved and stock deducted',
      remaining_stock: material.quantity
    });
  } catch (error) {
    logger.error('Error processing material request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GET PENDING MATERIAL REQUESTS COUNT ====================
app.get('/api/material-requests/pending-count', async (req, res) => {
  try {
    const count = await MaterialRequest.countDocuments({ status: 'pending' });
    res.json({ success: true, count });
  } catch (error) {
    logger.error('Error fetching pending count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add route to get all material requests (for admin view)
app.get('/api/material-requests/all', async (req, res) => {
  try {
    const requests = await MaterialRequest.find()
      .populate('project_id', 'project_name')
      .populate('foreman_id', 'full_name username')
      .populate('material_id', 'material_name unit quantity')
      .sort({ created_at: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    logger.error('Error fetching all material requests:', error);
    res.status(500).json({ success: false, message: error.message, requests: [] });
  }
});

// Add route to check material availability before submitting request
app.post('/api/material-requests/check-availability', async (req, res) => {
  try {
    const { material_id, quantity } = req.body;

    const material = await Material.findById(material_id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    const isAvailable = material.quantity >= quantity;
    const availableQuantity = material.quantity;

    res.json({
      success: true,
      isAvailable,
      availableQuantity,
      material_name: material.material_name,
      unit: material.unit
    });
  } catch (error) {
    logger.error('Error checking material availability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get last viewed timestamp for material requests
app.get('/api/material-requests/foreman/:foremanId/last-viewed', async (req, res) => {
  try {
    const { foremanId } = req.params;
    
    // You can store this in a separate collection or use a simple cache
    // For now, let's use a simple in-memory store or fetch from a dedicated collection
    const lastViewed = await MaterialRequestLastViewed.findOne({ foreman_id: foremanId });
    
    res.json({ 
      success: true, 
      lastViewedAt: lastViewed?.last_viewed_at || null 
    });
  } catch (error) {
    logger.error('Error fetching last viewed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update last viewed timestamp
app.post('/api/material-requests/update-last-viewed', async (req, res) => {
  try {
    const { foreman_id } = req.body;
    
    await MaterialRequestLastViewed.findOneAndUpdate(
      { foreman_id },
      { last_viewed_at: new Date() },
      { upsert: true, new: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating last viewed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a new endpoint to get unviewed processed requests count for foreman
app.get('/api/material-requests/foreman/:foremanId/unviewed-processed-count', async (req, res) => {
  try {
    const { foremanId } = req.params;
    
    // Get last viewed timestamp for processed requests
    const lastViewed = await MaterialRequestProcessedViewed.findOne({ foreman_id: foremanId });
    const lastViewedAt = lastViewed?.last_viewed_at || new Date(0);
    
    // Count approved or rejected requests created after last view
    const count = await MaterialRequest.countDocuments({
      foreman_id: foremanId,
      status: { $in: ['approved', 'rejected'] },
      processed_at: { $gt: lastViewedAt }
    });
    
    res.json({ success: true, count });
  } catch (error) {
    logger.error('Error fetching unviewed processed count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add endpoint to clear history (remove processed requests older than X days or all)
app.post('/api/material-requests/clear-history', async (req, res) => {
  try {
    const { foreman_id } = req.body;
    
    // Option 1: Delete all processed requests (approved/rejected)
    await MaterialRequest.deleteMany({
      foreman_id: foreman_id,
      status: { $in: ['approved', 'rejected'] }
    });
    
    // Option 2: Or archive them (if you want to keep for records)
    // Move to an archive collection
    
    res.json({ success: true, message: 'History cleared successfully' });
  } catch (error) {
    logger.error('Error clearing history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get last viewed for processed requests
app.get('/api/material-requests/foreman/:foremanId/processed-last-viewed', async (req, res) => {
  try {
    const { foremanId } = req.params;
    
    const lastViewed = await MaterialRequestProcessedViewed.findOne({ foreman_id: foremanId });
    
    res.json({ 
      success: true, 
      lastViewedAt: lastViewed?.last_viewed_at || null 
    });
  } catch (error) {
    logger.error('Error fetching processed last viewed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update processed last viewed
app.post('/api/material-requests/update-processed-last-viewed', async (req, res) => {
  try {
    const { foreman_id } = req.body;
    
    await MaterialRequestProcessedViewed.findOneAndUpdate(
      { foreman_id },
      { last_viewed_at: new Date() },
      { upsert: true, new: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating processed last viewed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TASK REQUEST ROUTES (FOR FOREMAN TO REQUEST TASK APPROVAL) ====================

// Get all task requests (for admin)
app.get('/api/task-requests/all', async (req, res) => {
  try {
    const requests = await TaskRequest.find()
      .populate('project_id', 'project_name')
      .populate('foreman_id', 'full_name username')
      .populate('assigned_to', 'full_name position')
      .sort({ created_at: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    logger.error('Error fetching all task requests:', error);
    res.status(500).json({ success: false, message: error.message, requests: [] });
  }
});

// Get pending task requests count
app.get('/api/task-requests/pending-count', async (req, res) => {
  try {
    const count = await TaskRequest.countDocuments({ status: 'pending' });
    res.json({ success: true, count });
  } catch (error) {
    logger.error('Error fetching pending task requests count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get task requests for a specific foreman
app.get('/api/task-requests/foreman/:foremanId', async (req, res) => {
  try {
    const { foremanId } = req.params;
    const { project_id } = req.query;
    
    const query = { foreman_id: foremanId };
    if (project_id) {
      query.project_id = project_id;
    }
    
    const requests = await TaskRequest.find(query)
      .populate('assigned_to', 'full_name position')
      .sort({ created_at: -1 });
    
    res.json({ success: true, requests });
  } catch (error) {
    logger.error('Error fetching foreman task requests:', error);
    res.status(500).json({ success: false, message: error.message, requests: [] });
  }
});

// Create a task request (foreman submits for approval)
app.post('/api/task-requests', async (req, res) => {
  try {
    const requestPayload = {
      ...req.body,
      status: 'pending',
      created_at: new Date(),
      request_number: req.body.request_number || `TASK-${Date.now().toString().slice(-8)}`
    };

    const request = await TaskRequest.create(requestPayload);

    await createActivityLog(
      request.foreman_id,
      request.foreman_name,
      'foreman',
      'CREATE',
      `Submitted task request: ${request.task_name} for project: ${request.project_name}`
    );

    res.status(201).json({ success: true, request_id: request._id });
  } catch (error) {
    logger.error('Error creating task request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Process task request (approve/reject)
app.put('/api/task-requests/:requestId/process', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, admin_username, rejection_reason } = req.body;

    const request = await TaskRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    const admin = await User.findOne({ username: admin_username });
    
    request.processed_at = new Date();
    request.processed_by = admin?._id;
    request.processed_by_name = admin?.full_name || admin_username;

    if (action === 'reject') {
      request.status = 'rejected';
      request.rejection_reason = rejection_reason || 'No reason provided';
      await request.save();
      
      logger.info(`Task request ${requestId} rejected by ${admin_username}`);
      return res.json({ success: true, message: 'Request rejected' });
    }

    if (action !== 'approve') {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    // Approve - create actual task
    const task = await Task.create({
      project_id: request.project_id,
      project_name: request.project_name,
      foreman_id: request.foreman_id,
      task_name: request.task_name,
      description: request.description,
      assigned_to: request.assigned_to,
      assigned_to_name: request.assigned_to_name,
      priority: request.priority,
      due_date: request.due_date,
      status: 'pending',
      created_by: admin?.full_name || admin_username,
      created_at: new Date()
    });

    request.status = 'approved';
    await request.save();

    await createActivityLog(
      admin?._id,
      admin?.full_name || admin_username,
      'admin',
      'CREATE',
      `Approved task request and created task: ${request.task_name}`
    );

    logger.info(`Task request ${requestId} approved and task created by ${admin_username}`);

    res.json({
      success: true,
      message: 'Request approved and task created',
      task_id: task._id
    });
  } catch (error) {
    logger.error('Error processing task request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update last viewed timestamp for task requests
app.post('/api/task-requests/update-last-viewed', async (req, res) => {
  try {
    const { foreman_id } = req.body;
    
    await TaskRequest.updateMany(
      { foreman_id: foreman_id },
      { last_viewed_at: new Date() }
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating last viewed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get pending task requests count (unviewed)
app.get('/api/task-requests/foreman/:foremanId/unviewed-count', async (req, res) => {
  try {
    const { foremanId } = req.params;
    
    // Get the last viewed timestamp for this foreman
    const lastViewed = await TaskRequest.findOne({ foreman_id: foremanId })
      .sort({ last_viewed_at: -1 })
      .select('last_viewed_at');
    
    const lastViewedDate = lastViewed?.last_viewed_at || new Date(0);
    
    // Count requests that have status changed after last view or are new
    const unviewedCount = await TaskRequest.countDocuments({
      foreman_id: foremanId,
      $or: [
        { created_at: { $gt: lastViewedDate } },
        { processed_at: { $gt: lastViewedDate } }
      ]
    });
    
    res.json({ success: true, count: unviewedCount });
  } catch (error) {
    logger.error('Error fetching unviewed count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SAFETY ROUTES ====================
app.get('/api/safety/checklists', async (req, res) => {
  try {
    const { foreman_id } = req.query;
    const query = foreman_id ? { foreman_id } : {};
    const checklists = await SafetyChecklist.find(query).sort({ checklist_date: -1 });
    res.json({ success: true, checklists });
  } catch (error) {
    logger.error('Error fetching safety checklists:', error);
    res.status(500).json({ success: false, message: error.message, checklists: [] });
  }
});

app.post('/api/safety/checklists', async (req, res) => {
  try {
    const checklist = await SafetyChecklist.create(req.body);
    res.status(201).json({ success: true, checklist_id: checklist._id });
  } catch (error) {
    logger.error('Error creating safety checklist:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/safety/incidents', async (req, res) => {
  try {
    const { foreman_id } = req.query;
    const query = foreman_id ? { foreman_id } : {};
    const incidents = await IncidentReport.find(query).sort({ incident_date: -1 });
    res.json({ success: true, incidents });
  } catch (error) {
    logger.error('Error fetching incidents:', error);
    res.status(500).json({ success: false, message: error.message, incidents: [] });
  }
});

app.post('/api/safety/incidents', async (req, res) => {
  try {
    const incident = await IncidentReport.create(req.body);
    res.status(201).json({ success: true, incident_id: incident._id });
  } catch (error) {
    logger.error('Error creating incident report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/safety/incidents/:incidentId', async (req, res) => {
  try {
    const { incidentId } = req.params;
    await IncidentReport.findByIdAndUpdate(incidentId, req.body, { new: true });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating incident:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TASK MANAGEMENT ROUTES ====================
app.get('/api/tasks/foreman/:foremanId', async (req, res) => {
  try {
    const tasks = await Task.find({ foreman_id: req.params.foremanId })
      .populate('project_id', 'project_name')
      .populate('assigned_to', 'full_name position')
      .sort({ created_at: -1 });
    
    const formattedTasks = tasks.map(t => ({
      _id: t._id,
      project_id: t.project_id?._id,
      project_name: t.project_name || t.project_id?.project_name || 'Unknown',
      task_name: t.task_name,
      description: t.description,
      assigned_to: t.assigned_to?._id,
      assigned_to_name: t.assigned_to_name || t.assigned_to?.full_name || 'Unassigned',
      priority: t.priority,
      due_date: t.due_date,
      status: t.status,
      created_by: t.created_by,
      created_at: t.created_at
    }));
    
    res.json({ success: true, tasks: formattedTasks });
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: error.message, tasks: [] });
  }
});

app.get('/api/tasks/project/:projectId', async (req, res) => {
  try {
    const tasks = await Task.find({ project_id: req.params.projectId })
      .populate('assigned_to', 'full_name')
      .sort({ created_at: -1 });
    
    res.json({ success: true, tasks });
  } catch (error) {
    logger.error('Error fetching project tasks:', error);
    res.status(500).json({ success: false, message: error.message, tasks: [] });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      created_at: new Date()
    });
    
    const project = await Project.findById(req.body.project_id);
    
    await createActivityLog(
      req.body.foreman_id,
      req.body.created_by,
      'foreman',
      'CREATE',
      `Created new task: ${req.body.task_name} for project: ${project?.project_name || 'Unknown'}`
    );
    
    res.status(201).json({ success: true, task_id: task._id });
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/tasks/:taskId', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, { new: true });
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/workers', async (req, res) => {
  try {
    const workers = await Worker.find().sort({ created_at: -1 });
    res.json({ success: true, workers });
  } catch (error) {
    logger.error('Error fetching workers:', error);
    res.status(500).json({ success: false, message: error.message, workers: [] });
  }
});

app.get('/api/workers/:workerId', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    res.json({ success: true, worker });
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/workers', async (req, res) => {
  try {
    const worker = await Worker.create({
      ...req.body,
      created_at: new Date()
    });
    
    res.status(201).json({ success: true, worker_id: worker._id });
  } catch (error) {
    logger.error('Error creating worker:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/workers/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const updateData = req.body;

    const worker = await Worker.findByIdAndUpdate(
      workerId,
      { ...updateData, updated_at: new Date() },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    res.json({ success: true, worker });
  } catch (error) {
    logger.error('Error updating worker:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/workers/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await Worker.findByIdAndDelete(workerId);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    res.json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) {
    logger.error('Error deleting worker:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DOCUMENTS ROUTES ====
app.get('/api/documents/client/:clientId', async (req, res) => {
  try {
    const projects = await Project.find({ client_id: req.params.clientId });
    const projectIds = projects.map(p => p._id);
    
    const documents = await Document.find({ 
      project_id: { $in: projectIds },
      is_public: true 
    })
    .populate('uploaded_by', 'full_name')
    .sort({ upload_date: -1 });
    
    const formattedDocuments = documents.map(d => ({
      _id: d._id,
      project_id: d.project_id,
      project_name: d.project_name || projects.find(p => p._id.equals(d.project_id))?.project_name || 'Unknown',
      document_name: d.document_name,
      document_type: d.document_type,
      description: d.description,
      file_url: d.file_url,
      file_size: d.file_size,
      uploaded_by_name: d.uploaded_by_name || d.uploaded_by?.full_name || 'Unknown',
      upload_date: d.upload_date
    }));
    
    res.json({ success: true, documents: formattedDocuments });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: error.message, documents: [] });
  }
});

app.get('/api/documents/project/:projectId', async (req, res) => {
  try {
    const documents = await Document.find({ 
      project_id: req.params.projectId,
      is_public: true 
    })
    .sort({ upload_date: -1 });
    
    res.json({ success: true, documents });
  } catch (error) {
    logger.error('Error fetching project documents:', error);
    res.status(500).json({ success: false, message: error.message, documents: [] });
  }
});

// Get all documents for admin
app.get('/api/documents/all', async (req, res) => {
  try {
    console.log('📄 Fetching all documents for admin...');

    const documents = await Document.find()
      .sort({ upload_date: -1 });

    console.log(`✅ Found ${documents.length} documents`);

    const formattedDocuments = documents.map(doc => ({
      _id: doc._id,
      project_id: doc.project_id,
      project_name: doc.project_name,
      document_name: doc.document_name,
      document_type: doc.document_type,
      description: doc.description,
      file_url: doc.file_url,
      file_size: doc.file_size,
      uploaded_by_name: doc.uploaded_by_name,
      upload_date: doc.upload_date,
      is_public: doc.is_public
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      documents: formattedDocuments
    });
  } catch (error) {
    console.error('❌ Error fetching all documents:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      documents: []
    });
  }
});

// Get single document
app.get('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({ success: true, document });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update document endpoint for admin
app.put('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { document_name, document_type, description, file_url, username, role } = req.body;

    console.log(`📝 Updating document ${documentId} by ${username}`);

    // Check if user is admin
    if (role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Update document fields
    document.document_name = document_name;
    document.document_type = document_type;
    document.description = description || '';
    document.file_url = file_url;
    document.updated_at = new Date();

    await document.save();

    // Create activity log
    await createActivityLog(
      null,
      username,
      role,
      'UPDATE',
      `Updated document: ${document_name}`
    );

    res.json({ success: true, message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Simple endpoint to list all documents (no filtering)
app.get('/api/debug/list-all-documents', async (req, res) => {
  try {
    const documents = await Document.find();
    res.json({
      success: true,
      count: documents.length,
      documents: documents.map(doc => ({
        id: doc._id,
        name: doc.document_name,
        file_url: doc.file_url,
        project_id: doc.project_id,
        project_name: doc.project_name
      }))
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Check uploads folder contents
app.get('/api/debug/check-uploads', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json({
        success: false,
        message: 'Uploads folder does not exist',
        path: uploadsDir
      });
    }
    
    const files = fs.readdirSync(uploadsDir);
    const fileDetails = [];
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      fileDetails.push({
        name: file,
        size: stats.size,
        modified: stats.mtime,
        isFile: stats.isFile()
      });
    }
    
    res.json({
      success: true,
      uploads_folder: uploadsDir,
      files: fileDetails
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Comprehensive debug endpoint
app.get('/api/debug/document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findById(documentId);
    if (!document) {
      return res.json({ success: false, error: 'Document not found in database' });
    }

    const uploadsDir = path.join(__dirname, 'uploads');
    const uploadsExists = fs.existsSync(uploadsDir);
    let filesInUploads = [];
    if (uploadsExists) {
      filesInUploads = fs.readdirSync(uploadsDir);
    }

    let foundPath = null;
    const possiblePaths = [
      path.join(uploadsDir, document.file_url || ''),
      path.join(uploadsDir, path.basename(document.file_url || '')),
      path.join(__dirname, document.file_url || ''),
      path.join(__dirname, 'uploads', document.file_url || ''),
      document.file_url || ''
    ];

    const pathChecks = [];
    for (const tryPath of possiblePaths) {
      const exists = fs.existsSync(tryPath);
      pathChecks.push({ path: tryPath, exists });
      if (exists && !foundPath) {
        foundPath = tryPath;
      }
    }

    if (!foundPath && filesInUploads.length > 0) {
      const searchName = path.basename(document.file_url || '').toLowerCase();
      const matchingFile = filesInUploads.find(f => 
        f.toLowerCase() === searchName || 
        f.toLowerCase().includes(searchName.replace(/\.[^/.]+$/, ''))
      );
      if (matchingFile) {
        foundPath = path.join(uploadsDir, matchingFile);
        pathChecks.push({ path: foundPath, exists: true, note: 'Found by pattern matching' });
      }
    }

    res.json({
      success: true,
      document: {
        id: document._id,
        name: document.document_name,
        stored_file_url: document.file_url,
        document_type: document.document_type
      },
      server_info: {
        uploads_directory_exists: uploadsExists,
        uploads_directory_path: uploadsDir,
        files_in_uploads: filesInUploads,
        current_working_directory: __dirname
      },
      file_search: {
        found: !!foundPath,
        found_path: foundPath,
        paths_checked: pathChecks
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message, stack: error.stack });
  }
});

// Enhanced download endpoint with better file lookup
app.get('/api/download/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    console.log('='.repeat(60));
    console.log('📥 DOWNLOAD REQUEST:');
    console.log(`   Document ID: ${documentId}`);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      console.log('   ❌ Invalid ObjectId format');
      return res.status(400).json({ success: false, message: 'Invalid document ID format' });
    }
    
    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      console.log('   ❌ Document not found in database');
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    console.log(`   Document: ${document.document_name}`);
    console.log(`   Stored file_url: ${document.file_url}`);
    
    // Path to uploads folder
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log(`   ❌ Uploads directory not found: ${uploadsDir}`);
      return res.status(404).json({ 
        success: false, 
        message: `Uploads directory not found` 
      });
    }
    
    // Get all files in uploads directory
    let filesInUploads = [];
    try {
      filesInUploads = fs.readdirSync(uploadsDir);
      console.log(`   Files in uploads folder (${filesInUploads.length}):`);
      filesInUploads.slice(0, 10).forEach(f => console.log(`      - ${f}`));
      if (filesInUploads.length > 10) console.log(`      ... and ${filesInUploads.length - 10} more`);
    } catch (err) {
      console.error('   Error reading uploads directory:', err);
    }
    
    // Try multiple strategies to find the file
    let targetFile = null;
    const storedFilename = document.file_url;
    
    // Strategy 1: Exact match (after cleaning)
    if (storedFilename) {
      let cleaned = storedFilename;
      cleaned = cleaned.replace(/^uploads[\\\/]/i, '');
      cleaned = cleaned.replace(/\\/g, '/');
      cleaned = cleaned.split('/').pop();
      
      console.log(`   Strategy 1 - Looking for exact match: ${cleaned}`);
      if (filesInUploads.includes(cleaned)) {
        targetFile = cleaned;
        console.log(`      ✅ Found exact match!`);
      }
    }
    
    // Strategy 2: Match by document ID
    if (!targetFile) {
      const docIdStr = documentId.toString();
      console.log(`   Strategy 2 - Looking for file containing ID: ${docIdStr}`);
      targetFile = filesInUploads.find(f => f.includes(docIdStr));
      if (targetFile) console.log(`      ✅ Found by ID!`);
    }
    
    // Strategy 3: Match by document name (without extension)
    if (!targetFile && document.document_name) {
      const docNameBase = document.document_name.replace(/\.[^/.]+$/, '').toLowerCase();
      console.log(`   Strategy 3 - Looking for file containing name: ${docNameBase}`);
      targetFile = filesInUploads.find(f => f.toLowerCase().includes(docNameBase));
      if (targetFile) console.log(`      ✅ Found by name!`);
    }
    
    // Strategy 4: If we have a stored filename that doesn't match exactly, try to find by timestamp prefix
    if (!targetFile && storedFilename) {
      const timestampMatch = storedFilename.match(/^(\d+)/);
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        console.log(`   Strategy 4 - Looking for file starting with timestamp: ${timestamp}`);
        targetFile = filesInUploads.find(f => f.startsWith(timestamp));
        if (targetFile) console.log(`      ✅ Found by timestamp!`);
      }
    }
    
    // Strategy 5: Try to find by upload date (if available)
    if (!targetFile && document.upload_date) {
      const uploadTimestamp = new Date(document.upload_date).getTime();
      console.log(`   Strategy 5 - Looking for file starting with upload timestamp: ${uploadTimestamp}`);
      targetFile = filesInUploads.find(f => f.startsWith(uploadTimestamp.toString()));
      if (targetFile) console.log(`      ✅ Found by upload date!`);
    }
    
    if (!targetFile) {
      console.log(`   ❌ No matching file found after all strategies`);
      return res.status(404).json({ 
        success: false, 
        message: 'File not found on server',
        searched_filename: storedFilename,
        available_files: filesInUploads.slice(0, 10)
      });
    }
    
    const filePath = path.join(uploadsDir, targetFile);
    
    // Verify file exists and is readable
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ File exists in list but not accessible: ${filePath}`);
      return res.status(404).json({ success: false, message: 'File cannot be read' });
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      console.log(`   ❌ Path is not a file: ${filePath}`);
      return res.status(404).json({ success: false, message: 'Path is not a file' });
    }
    
    console.log(`   ✅ File found: ${targetFile} (${stats.size} bytes)`);
    console.log('='.repeat(60));
    
    // Determine MIME type
    const fileExt = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain'
    };
    
    const mimeType = mimeTypes[fileExt] || 'application/octet-stream';
    
    // Set headers for download
    const encodedFileName = encodeURIComponent(document.document_name || targetFile);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (err) => {
      console.error('   File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error reading file' });
      }
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Download error:', error);
    console.log('='.repeat(60));
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Create a test document with a real file
app.post('/api/create-test-document', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Ensure uploads folder exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    
    // Create a test file
    const testFileName = `test-${Date.now()}.txt`;
    const testFilePath = path.join(uploadsDir, testFileName);
    const testContent = `This is a test document created at ${new Date().toISOString()}\n\nThis file is for testing the download functionality.`;
    fs.writeFileSync(testFilePath, testContent);
    
    // Get a project ID (use any existing project)
    const anyProject = await Project.findOne();
    if (!anyProject) {
      return res.json({ success: false, message: 'No projects found. Create a project first.' });
    }
    
    // Create document record
    const testDocument = await Document.create({
      project_id: anyProject._id,
      project_name: anyProject.project_name,
      document_name: `Test Document ${new Date().toLocaleDateString()}`,
      document_type: 'other',
      description: 'This is a test document created for debugging',
      file_url: testFileName,
      file_size: testContent.length + ' bytes',
      uploaded_by: req.body.user_id || new mongoose.Types.ObjectId(),
      uploaded_by_name: 'System Test',
      upload_date: new Date()
    });
    
    res.json({
      success: true,
      message: 'Test document created',
      document: {
        id: testDocument._id,
        name: testDocument.document_name,
        file_url: testDocument.file_url
      },
      download_url: `http://localhost:5000/api/download/${testDocument._id}`
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const document = await Document.create({
      ...req.body,
      upload_date: new Date(),
      is_link: true // Ensure this is set for all new documents
    });
    
    await createActivityLog(
      req.body.uploaded_by,
      req.body.uploaded_by_name,
      'admin',
      'CREATE',
      `Shared document link: ${req.body.document_name}`
    );
    
    res.status(201).json({ success: true, document_id: document._id });
  } catch (error) {
    logger.error('Error sharing document link:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { project_id, document_name, document_type, description, uploaded_by, uploaded_by_name, project_name } = req.body;
    
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    // IMPORTANT: Store ONLY the filename (what multer saved)
    const filename = file.filename;
    
    console.log('='.repeat(60));
    console.log('📤 UPLOAD DEBUG:');
    console.log(`   Original name: ${file.originalname}`);
    console.log(`   Saved as: ${filename}`);
    console.log(`   Size: ${file.size} bytes`);
    console.log(`   Project: ${project_name || project_id}`);
    console.log('='.repeat(60));
    
    const document = await Document.create({
      project_id,
      project_name: project_name || 'Unknown Project',
      document_name: document_name || file.originalname,
      document_type: document_type || 'other',
      description: description || '',
      file_url: filename, // Store ONLY the filename
      file_size: (file.size / 1024).toFixed(2) + ' KB',
      uploaded_by: uploaded_by,
      uploaded_by_name: uploaded_by_name || 'System',
      upload_date: new Date(),
      is_public: true
    });
    
    const project = await Project.findById(project_id);

    if (project && project.client_id) {
      const client = await User.findById(project.client_id);
      if (client) {
        await createNotification(
          client._id,
          client.full_name,
          'client',
          'project',
          'created',
          `📄 New Document: ${document_name || file.originalname}`,
          `A new ${document_type} document "${document_name || file.originalname}" has been uploaded for project "${project_name || project.project_name}".`,
          `/documents`,
          {
            project_id: project._id,
            project_name: project_name || project.project_name,
            document_id: document._id,
            document_name: document_name || file.originalname,
            document_type: document_type
          }
        );
      }
    }

    await createActivityLog(
      uploaded_by,
      uploaded_by_name,
      'admin',
      'CREATE',
      `Uploaded document: ${document_name || file.originalname}`
    );

    res.json({ success: true, document_id: document._id, filename: filename });
  } catch (error) {
    logger.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete document endpoint (allow clients to delete their project documents)
// Delete document endpoint
app.delete('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { user_id, user_role, username } = req.body;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Check if user has permission to delete
    if (user_role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    await Document.findByIdAndDelete(documentId);

    await createActivityLog(
      user_id,
      username,
      user_role,
      'DELETE',
      `Deleted document: ${document.document_name} from project: ${document.project_name}`
    );

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download document endpoint
app.get('/api/documents/download/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const filePath = path.join(__dirname, document.file_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.document_name)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    logger.error('Error downloading document:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Redirect alternate download endpoint to main endpoint
app.get('/api/download/document/:documentId', (req, res) => {
  res.redirect(303, `/api/download/${req.params.documentId}`);
});

app.get('/api/test-file/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const possiblePaths = [
      path.join(__dirname, 'uploads', filename),
      path.join(__dirname, filename),
      path.join(__dirname, 'uploads', filename.split('/').pop())
    ];

    const results = possiblePaths.map(filePath => ({
      path: filePath,
      exists: fs.existsSync(filePath)
    }));

    res.json({ success: true, filename, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/debug/documents', async (req, res) => {
  try {
    const documents = await Document.find().select('document_name file_url _id');
    const uploadsDir = path.join(__dirname, 'uploads');

    const fileStatuses = [];
    for (const doc of documents) {
      let fileExists = false;
      let foundPath = '';
      const possiblePaths = [
        path.join(__dirname, doc.file_url),
        path.join(uploadsDir, path.basename(doc.file_url)),
        path.join(__dirname, 'uploads', path.basename(doc.file_url)),
        path.join(__dirname, doc.file_url.replace('uploads/', '')),
        doc.file_url
      ];

      for (const testPath of possiblePaths) {
        try {
          if (fs.existsSync(testPath)) {
            fileExists = true;
            foundPath = testPath;
            break;
          }
        } catch (e) {
          // ignore invalid paths
        }
      }

      fileStatuses.push({
        id: doc._id,
        name: doc.document_name,
        stored_url: doc.file_url,
        file_exists: fileExists,
        found_path: foundPath
      });
    }

    res.json({
      success: true,
      documents: fileStatuses,
      uploads_dir: uploadsDir,
      files_in_uploads: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).filter(f => fs.statSync(path.join(uploadsDir, f)).isFile()) : []
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Check and clean up missing documents
app.get('/api/debug/clean-missing-documents', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const filesInUploads = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    
    const documents = await Document.find();
    const missingDocs = [];
    const existingDocs = [];
    
    for (const doc of documents) {
      // Extract filename from stored path
      let filename = doc.file_url;
      filename = filename.replace(/^uploads[\\\/]/, '');
      filename = filename.replace(/\\/g, '/');
      filename = filename.split('/').pop();
      
      if (filesInUploads.includes(filename)) {
        existingDocs.push(doc);
      } else {
        missingDocs.push({
          id: doc._id,
          name: doc.document_name,
          stored_filename: filename
        });
      }
    }
    
    res.json({
      success: true,
      summary: {
        total_documents: documents.length,
        existing_files: existingDocs.length,
        missing_files: missingDocs.length
      },
      existing_documents: existingDocs.map(d => ({
        id: d._id,
        name: d.document_name,
        file_url: d.file_url
      })),
      missing_documents: missingDocs
    });
    
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Delete all documents with missing files
app.delete('/api/debug/delete-missing-documents', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const filesInUploads = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    
    const documents = await Document.find();
    const deletedIds = [];
    
    for (const doc of documents) {
      let filename = doc.file_url;
      filename = filename.replace(/^uploads[\\\/]/, '');
      filename = filename.replace(/\\/g, '/');
      filename = filename.split('/').pop();
      
      if (!filesInUploads.includes(filename)) {
        await Document.findByIdAndDelete(doc._id);
        deletedIds.push({
          id: doc._id,
          name: doc.document_name,
          filename: filename
        });
      }
    }
    
    res.json({
      success: true,
      message: `Deleted ${deletedIds.length} documents without files`,
      deleted_documents: deletedIds
    });
    
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/document-types', async (req, res) => {
  const types = [
    { value: 'contract', label: 'Contract', icon: 'fa-file-signature' },
    { value: 'blueprint', label: 'Blueprint', icon: 'fa-draw-polygon' },
    { value: 'permit', label: 'Permit', icon: 'fa-file-alt' },
    { value: 'invoice', label: 'Invoice', icon: 'fa-file-invoice' },
    { value: 'report', label: 'Report', icon: 'fa-file-pdf' },
    { value: 'photo', label: 'Photo', icon: 'fa-file-image' },
    { value: 'other', label: 'Other', icon: 'fa-file' }
  ];
  
  res.json({ success: true, types });
});

// ==================== ACTIVITY LOGS ROUTES ====================
app.get('/api/logs', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const logs = await ActivityLog.find()
      .populate('user_id', 'username full_name role')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    const formattedLogs = logs.map(log => ({
      _id: log._id,
      user_id: log.user_id?._id || log.user_id,
      user_name: log.user_name || log.user_id?.full_name || 'Unknown',
      user_role: log.user_role || log.user_id?.role || 'unknown',
      action: log.action,
      description: log.description,
      ip_address: log.ip_address,
      timestamp: log.timestamp
    }));
    
    res.json({ success: true, logs: formattedLogs });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({ success: false, message: error.message, logs: [] });
  }
});

app.get('/api/logs/user/:userId', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const logs = await ActivityLog.find({ user_id: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({ success: true, logs });
  } catch (error) {
    logger.error('Error fetching user logs:', error);
    res.status(500).json({ success: false, message: error.message, logs: [] });
  }
});

// ==================== MESSAGES ROUTES ====================
app.get('/api/messages/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const conversations = await Conversation.find({
      $or: [
        { participant1_id: userId },
        { participant2_id: userId }
      ]
    }).sort({ last_message_date: -1 });
    
    const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
      const isUser1 = conv.participant1_id.toString() === userId;
      const participantId = isUser1 ? conv.participant2_id : conv.participant1_id;
      const participantName = isUser1 ? conv.participant2_name : conv.participant1_name;
      const participantRole = isUser1 ? conv.participant2_role : conv.participant1_role;
      
      const unreadCount = await Message.countDocuments({
        conversation_id: conv._id,
        sender_id: { $ne: userId },
        is_read: false
      });
      
      const messageCount = await Message.countDocuments({ conversation_id: conv._id });
      
      let projectName = null;
      if (conv.project_id) {
        const project = await Project.findById(conv.project_id);
        projectName = project?.project_name;
      }
      
      return {
        id: conv._id,
        participant_id: participantId,
        participant_name: participantName,
        participant_role: participantRole,
        project_id: conv.project_id,
        project_name: projectName,
        last_message: conv.last_message,
        last_message_date: conv.last_message_date,
        unread_count: unreadCount,
        message_count: messageCount,
        created_at: conv.created_at
      };
    }));
    
    res.json({ success: true, conversations: conversationsWithDetails });
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: error.message, conversations: [] });
  }
});

// ==================== GET UNREAD MESSAGES COUNT ====================
app.get('/api/messages/unread-count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const conversations = await Conversation.find({
      $or: [
        { participant1_id: userId },
        { participant2_id: userId }
      ]
    });
    
    const conversationIds = conversations.map(c => c._id);
    
    const unreadCount = await Message.countDocuments({
      conversation_id: { $in: conversationIds },
      sender_id: { $ne: userId },
      is_read: false
    });
    
    res.json({ success: true, unreadCount });
  } catch (error) {
    logger.error('Error fetching unread messages count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const messages = await Message.find({ conversation_id: conversationId })
      .sort({ timestamp: 1 });
    
    res.json({ success: true, messages });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: error.message, messages: [] });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { conversation_id, sender_id, sender_name, content, attachment } = req.body;
    
    const message = await Message.create({
      conversation_id,
      sender_id,
      sender_name,
      content,
      attachment,
      timestamp: new Date(),
      is_read: false
    });
    
    await Conversation.findByIdAndUpdate(conversation_id, {
      last_message: content,
      last_message_date: new Date()
    });
    
    res.status(201).json({ success: true, message_id: message._id });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/messages/conversations', async (req, res) => {
  try {
    const { participant1_id, participant1_name, participant2_id, participant2_name, project_id, user_role } = req.body;
    
    const participant1 = await User.findById(participant1_id);
    const participant2 = await User.findById(participant2_id);
    
    const existingConversation = await Conversation.findOne({
      $or: [
        { participant1_id, participant2_id },
        { participant1_id: participant2_id, participant2_id: participant1_id }
      ]
    });
    
    if (existingConversation) {
      return res.json({ success: true, conversation_id: existingConversation._id });
    }
    
    const conversation = await Conversation.create({
      participant1_id,
      participant1_name,
      participant1_role: participant1?.role,
      participant2_id,
      participant2_name,
      participant2_role: participant2?.role,
      project_id: project_id || null,
      created_at: new Date(),
      last_message_date: new Date()
    });
    
    res.status(201).json({ success: true, conversation_id: conversation._id });
  } catch (error) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/messages/:conversationId/read', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    
    await Message.updateMany(
      { 
        conversation_id: conversationId,
        sender_id: { $ne: userId },
        is_read: false 
      },
      { is_read: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PROJECT TEAM ROUTES ====================
app.get('/api/projects/client/:clientId/team', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const projects = await Project.find({ client_id: clientId })
      .populate('foreman_id', 'full_name email phone specialties');
    
    const teamMembers = [];
    const memberMap = new Map();
    
    for (const project of projects) {
      if (project.foreman_id) {
        const foremanId = project.foreman_id._id.toString();
        if (!memberMap.has(foremanId)) {
          memberMap.set(foremanId, {
            id: foremanId,
            name: project.foreman_id.full_name,
            role: 'foreman',
            roleLabel: 'Site Foreman',
            email: project.foreman_id.email || '',
            phone: project.foreman_id.phone || '',
            projects: [project.project_name],
            specialties: project.foreman_id.specialties && project.foreman_id.specialties.length > 0
              ? project.foreman_id.specialties
              : ['Site Management', 'Construction Oversight']
          });
        } else {
          const member = memberMap.get(foremanId);
          member.projects.push(project.project_name);
        }
      }
    }
    
    res.json({ success: true, team: Array.from(memberMap.values()) });
  } catch (error) {
    logger.error('Error fetching project team:', error);
    res.status(500).json({ success: false, message: error.message, team: [] });
  }
});

// ==================== EMAIL NOTIFICATION ROUTES ====================
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.json({ success: true, message: 'Email not configured' });
    }
    
    const info = await transporter.sendMail({
      from: `"ArCreate System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    
    logger.info('Email sent:', info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    logger.error('Error sending email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== NOTIFICATION ROUTES ====================
// Get unread notifications for a user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    const notifications = await Notification.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({ 
      user_id: userId, 
      is_read: false 
    });
    
    res.json({ 
      success: true, 
      notifications,
      unreadCount 
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Check if it's a valid ObjectId before trying to update
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      // If not a valid ObjectId, it might be a custom welcome notification
      // Just return success without trying to update
      logger.info(`Skipping read mark for non-ObjectId notification: ${notificationId}`);
      return res.json({ success: true, message: 'Notification ID is not a valid ObjectId' });
    }
    
    await Notification.findByIdAndUpdate(notificationId, { is_read: true });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all notifications as read for a user
app.put('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Notification.updateMany(
      { user_id: userId, is_read: false },
      { is_read: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clear all notifications for a user
app.delete('/api/notifications/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    await Notification.deleteMany({ user_id: userId });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== START SERVER ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Test: http://localhost:${PORT}/api/test\n`);
});