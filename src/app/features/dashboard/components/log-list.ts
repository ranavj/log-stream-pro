import { Component, inject, ViewChild } from '@angular/core';
import { LogLevel } from '../../../core/models/log.model';
import { LogService } from '../../../core/services/log';
import { CommonModule, DatePipe } from '@angular/common';
// 1. IMPORT CDK MODULE
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
@Component({
  selector: 'app-log-list',
  imports: [CommonModule, DatePipe, ScrollingModule], // DatePipe date format karne ke liye
  templateUrl: './log-list.html',
  styleUrl: './log-list.scss',
})
export class LogList {
  public logService = inject(LogService);

  // Service se logs ka Signal read kar rahe hain
  logs = this.logService.logs;
  // Viewport ko access karne ke liye
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  // Scroll Event Handler
  onScrollIndexChange() {
    if (!this.viewport) return;

    const end = this.viewport.getRenderedRange().end;
    const total = this.viewport.getDataLength();

    // Agar user bottom ke kareeb hai (e.g., last 5 items bache hain)
    if (end >= total - 5) {
      console.log('📜 Loading more logs...');
      this.logService.loadMoreLogs();
    }
  }
  // Helper function: Log Level ke hisab se color return karega
  getBadgeClass(level: LogLevel): string {
    switch (level) {
      case 'ERROR': return 'bg-red-100 text-red-700 border-red-200';
      case 'WARN':  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'SUCCESS': return 'bg-green-100 text-green-700 border-green-200';
      default:      return 'bg-blue-100 text-blue-700 border-blue-200'; // INFO
    }
  }
}
