import { Component, computed, inject } from '@angular/core';
import { ChartConfiguration, ChartType, ChartData } from 'chart.js';
import { LogService } from '../../../core/services/log';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-log-chart',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './log-chart.html',
  styleUrl: './log-chart.scss',
})
export class LogChart {
 private logService = inject(LogService);

  // 1. DOUGHNUT CHART CONFIG (Existing)
  public doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };
  public doughnutChartType: ChartType = 'doughnut';

  public doughnutChartData = computed(() => {
    const logs = this.logService.logs();
    return {
      labels: ['Errors', 'Warnings', 'Success/Info'],
      datasets: [{
        data: [
          logs.filter(l => l.level === 'ERROR').length,
          logs.filter(l => l.level === 'WARN').length,
          logs.filter(l => ['INFO', 'SUCCESS'].includes(l.level)).length
        ],
        backgroundColor: ['#ef4444', '#eab308', '#22c55e'],
        borderWidth: 0
      }]
    };
  });

  // --- [NEW] 2. BAR CHART CONFIG (Source Distribution) ---
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false, // Taaki container me fit ho
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } }
    },
    plugins: { legend: { display: false } } // Bar chart me legend zaroori nahi
  };
  public barChartType: ChartType = 'bar';

  // Computed Signal for Bar Chart
  public barChartData = computed(() => {
    const logs = this.logService.logs();
    
    // Grouping Logic: Kaunse Source se kitne logs hain?
    // Map banayenge: { 'Server-India': 5, 'Server-USA': 3 }
    const sourceMap = logs.reduce((acc, log) => {
      acc[log.source] = (acc[log.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top 5 Sources nikalenge (Taaki chart crowded na ho)
    const sortedSources = Object.entries(sourceMap)
      .sort((a, b) => b[1] - a[1]) // Zyaada logs pehle
      .slice(0, 5); // Sirf top 5

    return {
      labels: sortedSources.map(entry => entry[0]), // Names (e.g. Server-India)
      datasets: [{
        label: 'Log Count',
        data: sortedSources.map(entry => entry[1]), // Counts
        backgroundColor: '#6366f1', // Indigo Color
        borderRadius: 4,
        barThickness: 20
      }]
    };
  });
}
