import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  // Scenario 1: User pehle se loaded hai (e.g., Page navigation)
  if (authService.currentUser()) {
    return true;
  }

  // Scenario 2: Page Reload hua hai (User null hai, par cookie ho sakti hai)
  // Hum server ko call karte hain aur wait karte hain
  return authService.checkAuth().pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true; // ✅ Server ne bola user valid hai -> Jaane do
      } else {
        // ❌ Server ne bola kaun hai bhai? -> Login par bhejo
        return router.createUrlTree(['/login']);
      }
    })
  );
};
