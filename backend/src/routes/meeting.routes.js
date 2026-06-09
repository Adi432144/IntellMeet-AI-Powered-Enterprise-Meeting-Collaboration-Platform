// backend/src/routes/meeting.routes.js
import express from 'express';
import { createMeeting, completeMeetingPipeline } from '../controllers/meeting.controller.js';

const router = express.Router();

// Route to initialize a meeting
router.post('/create', createMeeting);

// Route to trigger the AI summary processing pipeline at the end of a call
router.post('/:meetingId/complete', completeMeetingPipeline);

export default router;