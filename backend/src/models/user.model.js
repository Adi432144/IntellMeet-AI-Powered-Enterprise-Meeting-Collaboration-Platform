// backend/src/models/user.model.js
import mongoose from 'mongoose';

/**
 * MongoDB Schema defining an enterprise user account within IntellMeet.
 * Implements strict string sanitization and automated index tracking.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User legal name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Enterprise email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid enterprise email layout',
      ],
    },
    password: {
      type: String,
      required: [true, 'Authentication credentials are required'],
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['employee', 'manager', 'admin'],
      default: 'employee',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Optimize search speed for email lookups during authentication cycles
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);
export default User;
meetingSchema.index({ roomId: 1 });