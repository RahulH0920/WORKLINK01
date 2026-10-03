import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    transactionId: {
      type: String,
      default: '',
    },
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    employerName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      default: '',
      trim: true,
    },
    trustScoreChange: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce 1 review per completed job per worker + employer at database level
reviewSchema.index({ workerId: 1, employerId: 1, jobId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
