import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  
  // Check karein ki kya ye External API hai?
  const isExternalApi = req.url.includes('randomuser.me');
  
  // Agar External API hai, toh Headers mat chhedo, bas Log karo
  if (isExternalApi) {
    console.log(`🌍 External API Call to: ${req.url} (Skipping Auth Headers)`);
    return next(req); // Request ko bina change kiye aage bhej diya
  }

  // --- Agar Hamara API hota toh ye code chalta ---
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake-token-signature';
  
  const clonedReq = req.clone({
    setHeaders: {
      'Authorization': `Bearer ${fakeToken}`,
      'X-App-Version': '1.0.0',
      'X-Source': 'LogStream-Web'
    }
  });

  console.log(`🔐 Attaching Token to: ${req.url}`);

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('🚨 Interceptor caught error:', error.message);
      return throwError(() => error);
    })
  );
};