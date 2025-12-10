import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { HlmSeparator } from '@spartan-ng/helm/separator'
import { LogLevel } from '../../../core/models/log.model';
import { LogService } from '../../../core/services/log';
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  imports: [LucideAngularModule, HlmSeparator],
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private logService = inject(LogService);
  private router = inject(Router);
  // HTML mein use karne ke liye Signal read karein
  activeLevel = this.logService.activeLevel;

  // Click hone par service call karein
  setFilter(level: LogLevel | 'ALL') {
    this.logService.filterByLevel(level);
  }

  logout() {
    // 1. Token delete karein
    localStorage.removeItem('auth_token');
    // 2. Login page par bhejein
    this.router.navigate(['/login']);
  }
}
