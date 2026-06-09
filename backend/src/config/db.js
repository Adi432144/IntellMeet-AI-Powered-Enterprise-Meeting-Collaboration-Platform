// backend/src/config/db.js
import mongoose from 'mongoose';

/**
 * Initializes a connection to the MongoDB database using environmental configuration.
 * Implements robust error handling and self-termination on connection failure.
 */
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, 
    });

    console.log(`📡 MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Critical Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// CRITICAL LINE: Make sure this exact default statement is present!
export default connectDB;