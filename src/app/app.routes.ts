import { Routes } from '@angular/router';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';
import { MainLayout } from './features/layout/main-layout/main-layout';
import { authGuard } from './core/guards/auth-guard';
import { Login } from './features/auth/login'
import { Register } from './features/auth/register';
export const routes: Routes = [
  // 1. Login Route (Public)
  { path: 'login', component: Login },
  { path: 'register', component: Register }, // [NEW]
  // 2. Protected Routes (Jo Layout ke andar hain)
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard], // <--- YAHAN GUARD LAGAYA
    children: [
      { path: 'dashboard', component: DashboardPage },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' } // Default to dashboard
    ]
  },

  // 3. Catch All
  { path: '**', redirectTo: 'login' }
];
// const routes: Routes = [
//   {
//     path: '',
//     canActivate: [AuthGuard],
//     resolve: { user: UserResolver },
//     children: [
//       {
//         path: 'products',
//         loadChildren: () =>
//           import('./products/products.module').then(m => m.ProductsModule),
//         canActivateChild: [ProductsGuard],
//       },
//       {
//         path: 'products/:id',
//         component: ProductDetailsComponent,
//         runGuardsAndResolvers: 'paramsOrQueryParamsChange',
//         resolve: { product: ProductResolver }
//       },
//     ]
//   }
//  /products/10?view=full
// /products/10?view=summary
// /products/11?view=summary
// ];