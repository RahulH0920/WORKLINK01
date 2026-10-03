import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['verification', 'fraud_safety', 'jobs', 'applications', 'payments', 'disputes', 'system'],
      default: 'system',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: '',
    },
    userRole: {
      type: String,
      default: '',
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    jobTitle: {
      type: String,
      default: '',
    },
    transactionId: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDismissed: {
      type: Boolean,
      default: false,
      index: true,
    },
    targetRoute: {
      type: String,
      default: '',
    },
    sourceType: {
      type: String,
      default: 'system',
    },
    sourceId: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

export default AdminNotification;
