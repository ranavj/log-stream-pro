"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Log = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// 1. Schema Define karein (Rules)
const logSchema = new mongoose_1.default.Schema({
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
exports.Log = mongoose_1.default.model('Log', logSchema);
