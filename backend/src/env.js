// backend/src/env.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly target the root backend .env file location to avoid directory confusion
dotenv.config({ path: path.resolve(__dirname, '../.env') });