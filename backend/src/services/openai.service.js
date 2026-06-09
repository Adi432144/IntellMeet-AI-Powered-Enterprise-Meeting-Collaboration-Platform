// backend/src/services/openai.service.js
import { OpenAI } from 'openai';
import fs from 'fs';

// Initialize the OpenAI client with configuration safe guards
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Service class handling all interactions with enterprise AI model engines.
 */
export class OpenAIService {
  
  /**
   * Transcribes a raw meeting audio file using OpenAI's Whisper model.
   * * @async
   * @param {string} audioFilePath - Local path to the recorded meeting audio file (.mp3, .wav, .m4a)
   * @returns {Promise<string>} The parsed, timestamped plain text transcript
   */
  static async transcribeAudio(audioFilePath) {
    try {
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Target audio file not found at path: ${audioFilePath}`);
      }

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
        response_format: 'text', // Returns a streamlined clean string block
      });

      return transcription;
    } catch (error) {
      console.error(`💥 Whisper Transcription Service Failure: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates a structured executive summary and extracts specific action items 
   * from a raw conversation transcript text block.
   * * @async
   * @param {string} transcriptText - The complete raw narrative text of a meeting
   * @returns {Promise<Object>} An object containing an executive summary string and an array of action items
   */
  static async generateMeetingInsights(transcriptText) {
    try {
      if (!transcriptText || transcriptText.trim() === '') {
        throw new Error('Cannot process an empty meeting transcript.');
      }

      const systemPrompt = `
        You are an advanced corporate enterprise AI assistant specialized in workflow extraction and summary analytics.
        Analyze the provided raw meeting transcript and return a precise JSON response with the following keys:
        
        1. "aiSummary": A 3-4 sentence comprehensive executive summary written in a high-level corporate tone.
        2. "actionItems": An array of objects, where each object has:
           - "task": A clear, action-oriented description of what needs to be done.
           - "assigneeName": The literal name of the person assigned to the task (or "Unassigned" if unclear).

        Strict constraint: Your output must be nothing but pure, unformatted JSON. Do not include markdown wraps like \`\`\`json.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' }, // Hard-enforces a structural JSON parse guarantee
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this transcript: \n\n${transcriptText}` },
        ],
        temperature: 0.3, // Lower temperature enforces programmatic accuracy and consistency
      });

      // Safely parse the structural response payload from the LLM engine
      const insights = JSON.parse(response.choices[0].message.content);
      return insights;
    } catch (error) {
      console.error(`💥 OpenAI Analysis Engine Failure: ${error.message}`);
      throw error;
    }
  }
}