import mongoose from 'mongoose';

/**
 * DocumentRecord — stores original Aadhaar/PAN entries in MongoDB.
 * Each document can only be used by one user (usedBy field).
 * If usedBy is set, no other user can verify with the same document.
 */
const documentRecordSchema = new mongoose.Schema({
  docType: {
    type: String,
    enum: ['aadhaar', 'pan'],
    required: true,
  },
  docNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  holderName: {
    type: String,
    required: true,
    trim: true,
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true });

export default mongoose.model('DocumentRecord', documentRecordSchema);
