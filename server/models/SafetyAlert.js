import mongoose from 'mongoose';

const safetyAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['fraud', 'dispute', 'verification', 'payment', 'violation', 'safety'],
      default: 'safety',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    userRole: {
      type: String,
      enum: ['worker', 'employer', 'seeker', 'unknown'],
      default: 'worker',
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },
    transactionId: {
      type: String,
      default: '',
    },
    riskLevel: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    detectionReason: {
      type: String,
      required: true,
    },
    evidence: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    adminNotes: [
      {
        note: {
          type: String,
          required: true,
        },
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    sourceType: {
      type: String,
      default: 'system',
    },
    sourceId: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const SafetyAlert = mongoose.model('SafetyAlert', safetyAlertSchema);

export default SafetyAlert;
