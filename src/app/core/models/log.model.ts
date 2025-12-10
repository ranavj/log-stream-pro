// src/app/core/models/log.model.ts

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string; // e.g., "AuthService", "Database"
  // [NEW] Avatar field add kiya display ke liye
  avatar?: string; 
  details?: any; // JSON details ke liye
}