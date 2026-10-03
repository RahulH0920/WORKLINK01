import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name as in Aadhaar Card is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    firstName: {
      type: String,
      trim: true,
      default: '',
    },

    lastName: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    role: {
      type: String,
      enum: ['seeker', 'employer', 'admin'],
      default: 'seeker',
    },

    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: [
        'not_submitted',
        'pending',
        'under_review',
        'approved',
        'rejected',
      ],
      default: 'not_submitted',
    },

    verificationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    faceMatchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    documentMatchScore: {
      type: Number,
      default: 0,
      max: 100,
    },

    ocrResult: {
      aadhaar: {
        name: {
          type: String,
          default: '',
        },

        documentNumber: {
          type: String,
          default: '',
        },

        dateOfBirth: {
          type: String,
          default: '',
        },

        gender: {
          type: String,
          default: '',
        },

        extracted: {
          type: Boolean,
          default: false,
        },
      },

      pan: {
        name: {
          type: String,
          default: '',
        },

        documentNumber: {
          type: String,
          default: '',
        },

        dateOfBirth: {
          type: String,
          default: '',
        },

        extracted: {
          type: Boolean,
          default: false,
        },
      },
    },

    verificationChecks: {
      aadhaarValid: {
        type: Boolean,
        default: false,
      },

      panValid: {
        type: Boolean,
        default: false,
      },

      ocrCompleted: {
        type: Boolean,
        default: false,
      },

      crossDocumentMatch: {
        type: Boolean,
        default: false,
      },

      faceMatchCompleted: {
        type: Boolean,
        default: false,
      },

      livenessCompleted: {
        type: Boolean,
        default: false,
      },
    },

    adminDecision: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    adminReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    adminReviewedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: '',
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },

    photoUrl: {
      type: String,
      default: '',
    },

    languages: {
      type: [String],
      default: ['English', 'Kannada', 'Hindi'],
    },

    workCategories: {
      type: [String],
      default: ['Catering', 'Cleaning', 'Delivery'],
    },

    experience: {
      type: String,
      default: '2+ years',
    },

    preferredJobType: {
      type: String,
      default: 'Part-time',
    },

    availability: {
      type: String,
      default: 'Monday – Saturday',
    },

    preferredHours: {
      type: String,
      default: 'Flexible Hours (Morning / Evening)',
    },

    maxDistance: {
      type: Number,
      default: 15,
    },

    notificationPreferences: {
      newJobs: { type: Boolean, default: true },
      applicationUpdates: { type: Boolean, default: true },
      jobStatus: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      trustScore: { type: Boolean, default: true },
      reviews: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
    },

    accountStatus: {
      type: String,
      enum: ['active', 'deactivated'],
      default: 'active',
    },

    skills: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        level: {
          type: Number,
          min: 0,
          max: 100,
          default: 50,
        },
      },
    ],

    location: {
      type: String,
      default: '',
      trim: true,
    },

    profileComplete: {
      type: Boolean,
      default: false,
    },

    documents: [
      {
        docType: {
          type: String,
          enum: ['aadhaar', 'pan', 'photo'],
          required: true,
        },

        fileName: {
          type: String,
          required: true,
        },

        filePath: {
          type: String,
          required: true,
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },

        status: {
          type: String,
          enum: ['pending', 'verified', 'rejected'],
          default: 'pending',
        },

        verificationMessage: {
          type: String,
          default: '',
        },
      },
    ],

    documentsUploaded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('validate', function (next) {
  if (!this.name && (this.firstName || this.lastName)) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  if (this.name && (!this.firstName && !this.lastName)) {
    const parts = this.name.split(' ');
    this.firstName = parts[0] || '';
    this.lastName = parts.slice(1).join(' ') || '';
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  if (!obj.name && (obj.firstName || obj.lastName)) {
    obj.name = `${obj.firstName || ''} ${obj.lastName || ''}`.trim();
  }
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;