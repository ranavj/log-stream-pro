import { ApplicationConfig, provideZonelessChangeDetection, importProvidersFrom, inject, isDevMode, APP_INITIALIZER, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'; // ✅ Best for Performance
import { LucideAngularModule, LayoutDashboard, AlertCircle, Info, ShieldAlert, LogOut, Search, X, Moon, Play, Square, Sun } from 'lucide-angular';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'; // Import karein
// APOLLO IMPORTS
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, split } from '@apollo/client/core';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptor/auth.interceptor';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'; // WS Link
import { AuthService } from './core/services/auth.service';
import { firstValueFrom } from 'rxjs';
// Agar Dev mode hai (npm start) -> Localhost
// Agar Prod mode hai (Vercel) -> Render URL
const API_URL = isDevMode() 
  ? 'http://localhost:4000/graphql' 
  : '/graphql';

const WS_URL = isDevMode()
  ? 'ws://localhost:4000/graphql'
  : 'wss://log-stream-pro.onrender.com/graphql';

  // Factory function: Ye app start hone se pehle chalega
function initializeApp(authService: AuthService) {
  return () => firstValueFrom(authService.checkAuth()); // Promise mein convert karke wait karega
}
export const appConfig: ApplicationConfig = {
  providers: [
    // 1. ⚡ ZONELESS MODE: App ko super fast banata hai (No Zone.js)
    provideZonelessChangeDetection(),

    // 2. 🛣️ ROUTER UPGRADES:
    // withComponentInputBinding: URL params ko @Input banata hai
    // withViewTransitions: Page change hone par smooth animation deta hai (Native Browser feature)
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),

    // 3. 🎨 Animations (Lazy Loaded - Best for startup time)
    provideAnimationsAsync(),

    // 4. 🌐 HTTP Client (Fake Backend ke liye zaroori hai)
    // Yahan humne Interceptor jod diya
    provideHttpClient(withInterceptors([
      authInterceptor
    ])),

    // 4. 🖼️ GLOBAL ICONS: Baar-baar import na karna pade isliye yahan register kar rahe hain
    importProvidersFrom(LucideAngularModule.pick({
      LayoutDashboard, AlertCircle, Info, ShieldAlert, LogOut, Search, X,
        Moon, 
        Sun, 
        Play, 
        Square
    })),
    provideCharts(withDefaultRegisterables()), // Ye line add karein
    // [NEW] Apollo Configuration
   provideApollo(() => {
      const httpLink = inject(HttpLink);

      // 1. HTTP Link (Normal kaam ke liye)
      const http = httpLink.create({ 
        uri: API_URL, //'http://localhost:4000/graphql',
        withCredentials: true // 👈 YE SABSE IMPORTANT HAI (Cookie bhejne ke liye)
      });

      // 2. WebSocket Link (Real-time ke liye)
      const ws = new GraphQLWsLink(
        createClient({
          url: WS_URL, //'ws://localhost:4000/graphql',
        })
      );

      // 3. SPLIT LINK (Traffic Police) 🚦
      // Agar operation "Subscription" hai toh WS par bhejo, nahi toh HTTP par
      const link = split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
          );
        },
        ws,   // True: Use WS
        http  // False: Use HTTP
      );

      return {
        link: link, // Ab 'link' use hoga direct http ki jagah
        cache: new InMemoryCache(),
      };
    }),
    provideAppInitializer(() => {
        const authService = inject(AuthService); // 'deps' ki zaroorat nahi, direct inject karo
        return firstValueFrom(authService.checkAuth());
    })
  ]
};