// backend/src/controllers/auth.controller.js
import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';

// Helper function to sign a secure JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: '30d', // Session remains valid for 30 days
  });
};

/**
 * @desc    Register a new operator node (User or Admin)
 * @route   POST /api/auth/signup
 */
export const registerUser = async (req, res) => {
  try {
    const { userName, email, password, role } = req.body;

    if (!userName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide all required credentials.' });
    }

    // Guard: Prevent duplicate accounts
    const userExists = await User.findOne({ $or: [{ email }, { userName }] });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'Operator handle or email already allocated.' });
    }

    // Secure password hashing happens automatically inside our User model pre-save hook!
    const user = await User.create({
      userName,
      email,
      password,
      role: role || 'user' // Default to 'user' unless explicitly provisioned as 'admin'
    });

    return res.status(201).json({
      success: true,
      token: generateToken(user._initId || user._id),
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Authenticate operator handle & verify security access key
 * @route   POST /api/auth/login
 */
export const loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res.status(400).json({ success: false, error: 'Missing handle or access key.' });
    }

    // Query database for user instance
    const user = await User.findOne({ userName });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid operator credentials.' });
    }

    // Call custom method on user schema to check password validity
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid operator credentials.' });
    }

    return res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};