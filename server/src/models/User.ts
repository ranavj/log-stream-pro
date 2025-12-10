import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // Email unique hona chahiye
  password: { type: String, required: true }, // Hashed password store hoga
  avatar: { type: String },
  // [NEW] Role Field
  role: { 
    type: String, 
    enum: ['USER', 'ADMIN'], 
    default: 'USER' 
  }
});

export const User = mongoose.model('User', userSchema);