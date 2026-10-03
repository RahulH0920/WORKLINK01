import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobTitle: {
      type: String,
      default: '',
    },
    jobAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    employerFee: {
      type: Number,
      required: true,
      min: 0,
    },
    employerTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    advanceAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    advancePaid: {
      type: Number,
      default: 0,
    },
    advancePaidAt: {
      type: Date,
      default: null,
    },
    remainingPaid: {
      type: Number,
      default: 0,
    },
    remainingPaidAt: {
      type: Date,
      default: null,
    },
    workerFee: {
      type: Number,
      required: true,
      min: 0,
    },
    workerNetEarning: {
      type: Number,
      required: true,
      min: 0,
    },
    platformRevenue: {
      type: Number,
      required: true,
      min: 0,
    },
    completionStatus: {
      type: String,
      enum: ['in_progress', 'waiting_employer_confirmation', 'completed', 'disputed'],
      default: 'in_progress',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'advance_paid', 'fully_paid', 'completed'],
      default: 'pending',
    },
    settlementStatus: {
      type: String,
      enum: ['pending', 'settled'],
      default: 'pending',
    },
    settledAt: {
      type: Date,
      default: null,
    },
    disputeReason: {
      type: String,
      default: '',
    },
    disputedAt: {
      type: Date,
      default: null,
    },
    disputedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
