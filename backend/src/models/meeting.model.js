// backend/src/models/meeting.model.js
import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title configuration is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    roomId: {
      type: String,
      required: [true, 'Unique WebRTC room identifier is required'],
      unique: true, // Mongoose handles the index automatically here
      trim: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Meeting orchestration requires a designated host ID'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed'],
      default: 'scheduled',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;