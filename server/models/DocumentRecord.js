import mongoose from 'mongoose';

const documentRecordSchema = new mongoose.Schema(
  {
    docType: {
      type: String,
      enum: ['aadhaar', 'pan'],
      required: true,
      index: true,
    },
    docNumber: {
      type: String,
      required: true,
      index: true,
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
  },
  {
    collection: 'documentrecords',
    timestamps: true,
  }
);

const DocumentRecord = mongoose.model('DocumentRecord', documentRecordSchema);

export default DocumentRecord;
