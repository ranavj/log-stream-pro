import mongoose from 'mongoose';

// 1. Schema Define karein (Rules)
const logSchema = new mongoose.Schema({
  level: {
    type: String,
    required: true,
    enum: ['INFO', 'WARN', 'ERROR', 'SUCCESS'] // Sirf ye allowed hain
  },
  message: { type: String, required: true },
  source: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: Object }, // JSON Data ke liye
  avatar: { type: String }
});

// 2. Model Export karein
export const Log = mongoose.model('Log', logSchema);