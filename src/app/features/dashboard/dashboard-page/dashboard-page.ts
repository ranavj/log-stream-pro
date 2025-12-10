import { Component, inject } from '@angular/core';
import { LogService } from '../../../core/services/log';
import { CommonModule } from '@angular/common';
import { LogList } from '../components/log-list';
import { LogDetail } from '../components/log-detail';
import { LogChart } from '../components/log-chart';
import { StatsCard } from '../components/stats-card';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, LogList, LogDetail, LogChart, StatsCard],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  // Service Injection
  public logService = inject(LogService);

  // Signals ko access karna
  totalLogs = this.logService.totalLogs;
  errorCount = this.logService.errorCount;
  warnCount = this.logService.warnCount;
}
