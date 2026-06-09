// backend/src/controllers/meeting.controller.js
import Meeting from '../models/meeting.model.js';
import Transcript from '../models/transcript.model.js';
import { OpenAIService } from '../services/openai.service.js';

/**
 * Creates a brand new meeting session in the database
 */
export const createMeeting = async (req, res) => {
  try {
    const { title, roomId, hostId } = req.body;

    const newMeeting = await Meeting.create({
      title,
      roomId,
      host: hostId,
      status: 'active',
      startTime: new Date()
    });

    res.status(201).json({ success: true, data: newMeeting });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Pipeline triggered when a meeting ends. 
 * Process audio file -> Transcription -> AI Summary -> Save to MongoDB
 */
export const completeMeetingPipeline = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { filePath } = req.body; // Path to the recorded audio file on your server/cloud

    // 1. Verify the meeting exists
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting target not found' });
    }

    // 2. Convert meeting audio recording into raw text lines using Whisper
    const rawText = await OpenAIService.transcribeAudio(filePath);
    
    // 3. Extrapolate context summaries and extract clear deliverables using GPT-4o
    const { aiSummary, actionItems } = await OpenAIService.generateMeetingInsights(rawText);
    
    // 4. Save directly into MongoDB via the Transcript Model
    const updatedTranscript = await Transcript.findOneAndUpdate(
      { meetingId },
      { rawText, aiSummary, actionItems },
      { upsert: true, new: true }
    );

    // 5. Update meeting status to completed
    meeting.status = 'completed';
    meeting.endTime = new Date();
    await meeting.save();

    res.status(200).json({
      success: true,
      message: 'Meeting processed and insights generated cleanly',
      data: updatedTranscript
    });

  } catch (error) {
    console.error(`💥 Pipeline Error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to process AI meeting insights' });
  }
};