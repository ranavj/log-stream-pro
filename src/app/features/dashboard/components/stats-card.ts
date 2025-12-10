import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { ChartConfiguration, ChartType, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { LogService } from '../../../core/services/log';

@Component({
  selector: 'app-stats-card',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './stats-card.html',
  styleUrl: './stats-card.scss',
})
export class StatsCard {
  logService = inject(LogService);

  // Chart Config
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } }
  };
  public pieChartType: ChartType = 'doughnut';
  public pieChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };

  constructor() {
    // Effect: Jab stats aayein, chart update karo
    effect(() => {
      const stats = this.logService.logStats();
      
      const labels = stats.map(s => s.level);
      const data = stats.map(s => s.count);
      
      // Dynamic Colors
      const colors = stats.map(s => {
        switch(s.level) {
          case 'ERROR': return '#ef4444'; // Red-500
          case 'WARN': return '#eab308';  // Yellow-500
          case 'SUCCESS': return '#22c55e'; // Green-500
          default: return '#3b82f6';      // Blue-500
        }
      });

      this.pieChartData = {
        labels: labels,
        datasets: [{ data: data, backgroundColor: colors }]
      };
    });
  }
}
