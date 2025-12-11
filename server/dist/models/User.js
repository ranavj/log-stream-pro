"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
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
exports.User = mongoose_1.default.model('User', userSchema);
