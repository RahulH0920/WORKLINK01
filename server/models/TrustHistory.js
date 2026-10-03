import mongoose from 'mongoose';

const trustHistorySchema = new mongoose.Schema(
  {
    targetRole: {
      type: String,
      enum: ['seeker', 'worker', 'employer'],
      default: 'seeker',
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'verification',
        'job_completion',
        'advance_payment',
        'remaining_payment',
        'settlement',
        'employer_rating',
        'admin_adjustment',
      ],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    change: {
      type: Number,
      required: true,
    },
    previousScore: {
      type: Number,
      required: true,
    },
    newScore: {
      type: Number,
      required: true,
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
    employerName: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      default: null,
    },
    review: {
      type: String,
      default: '',
    },
    source: {
      type: String,
      default: '',
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const TrustHistory = mongoose.model('TrustHistory', trustHistorySchema);

export default TrustHistory;
