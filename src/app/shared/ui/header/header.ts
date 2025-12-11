import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@spartan-ng/helm/avatar';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ClockIcon } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service'; // [NEW] Import
import { LogService } from '../../../core/services/log';
import { Theme } from '../../../core/services/theme';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    LucideAngularModule,
    HlmInput,
    HlmAvatar,
    HlmAvatarImage,
    HlmAvatarFallback,
    ReactiveFormsModule
  ],
  templateUrl: './header.html', // File extension .component.html sahi rehta hai usually
})
export class Header {
  public logService = inject(LogService);
  public themeService = inject(Theme);
  public authService = inject(AuthService); // [NEW] Inject Auth Service

  searchControl = new FormControl('');

  ngOnInit() {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((query) => {
      this.logService.updateFilter(query || ''); 
    });
  }

  onDateChange(event: any) {
    const value = event.target.value;
    this.logService.filterByDate(value);
  }
  // [NEW] Logout Method
  logout() {
    this.authService.logout();
  }
}