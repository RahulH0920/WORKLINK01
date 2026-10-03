import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'shortlisted', 'hired', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
});

const jobSchema = new mongoose.Schema({
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hiredWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    enum: ['Catering', 'Driving', 'Cleaning', 'Delivery'],
  },
  type: {
    type: String,
    enum: ['Part-time', 'Short-term', 'Freelance', 'Full-time'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  pay: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  completionStatus: {
    type: String,
    enum: ['in_progress', 'waiting_employer_confirmation', 'completed', 'disputed'],
    default: 'in_progress'
  },
  workerCompletedAt: {
    type: Date,
    default: null
  },
  employerConfirmedAt: {
    type: Date,
    default: null
  },
  disputeReason: {
    type: String,
    default: ''
  },
  disputedAt: {
    type: Date,
    default: null
  },
  disputedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  remainingPaymentReady: {
    type: Boolean,
    default: false
  },
  remainingPaymentPaid: {
    type: Boolean,
    default: false
  },
  remainingPaidAt: {
    type: Date,
    default: null
  },
  workerSettled: {
    type: Boolean,
    default: false
  },
  workerSettledAt: {
    type: Date,
    default: null
  },
  transactionId: {
    type: String,
    default: null
  },
  applications: [applicationSchema]
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);
