// backend/src/models/transcript.model.js
import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: [true, 'Transcript must map directly to a parent meeting object'],
      unique: true, // Mongoose handles the index automatically here
    },
    rawText: {
      type: String,
      default: '',
    },
    utterances: [
      {
        speaker: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    aiSummary: {
      type: String,
      default: 'AI Processing waiting execution window...',
    },
    actionItems: [
      {
        task: {
          type: String,
          required: true,
        },
        assignee: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'completed'],
          default: 'pending',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Transcript = mongoose.model('Transcript', transcriptSchema);
export default Transcript;