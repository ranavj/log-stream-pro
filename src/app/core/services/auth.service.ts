import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

const ME_QUERY = gql`
  query Me {
    me { id, username, email, role } # [NEW] role manga
  }
`;
// GraphQL Mutations
const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $email: String!, $password: String!, $role: String) { # [NEW] role variable
    registerUser(username: $username, email: $email, password: $password, role: $role) {
      user { id, username, email, role }
    }
  }
`;

// Mutations update karein (Token field hata dein response se)
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      user { id, username, email, role, avatar } # [NEW]
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout {
    logoutUser
  }
`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apollo = inject(Apollo);
  private router = inject(Router);

  // User State
  currentUser = signal<any>(this.getUserFromStorage());
  isLoading = signal<boolean>(true); // App load hote waqt true rahega
  // [UPDATED] Initialize signal from LocalStorage directly!
  // Isse reload par "Blank" hone wala issue solve ho jayega
  // Constructor se checkAuthStatus() hata diya hai
  // Kyunki ab Guard isse call karega
  constructor() {} 

  // Helper to read storage safely
  private getUserFromStorage() {
    const userStr = localStorage.getItem('user_data');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Helper to save storage
  private saveUserToStorage(user: any) {
    localStorage.setItem('user_data', JSON.stringify(user));
    this.currentUser.set(user);
  }
  // [UPDATED] Ab ye Observable return karega (Guard ke liye)
  checkAuth(): Observable<boolean> {
    return this.apollo.query({
      query: ME_QUERY,
      fetchPolicy: 'network-only'
    }).pipe(
      map((result: any) => {
        const user = result.data?.me;
        if (user) {
         // Server data se storage update karo (e.g. agar avatar change hua ho)
          this.saveUserToStorage(user); 
          return true;
        } else {
          this.logoutLocal(); // Invalid session
          return false;
        }
      }),
      catchError((err) => {
        console.error('Auth Check Failed', err);
        this.currentUser.set(null);
        return of(false); // ❌ Error aaya toh bhi false
      })
    );
  }

  // 1. CHECK AUTH STATUS (On Page Refresh) 🔄
  checkAuthStatus() {
    this.apollo.query({
      query: ME_QUERY,
      fetchPolicy: 'network-only' // Cache se mat uthao, server se poocho
    }).subscribe({
      next: (result: any) => {
        const user = result.data?.me;
        if (user) {
          this.currentUser.set(user); // Logged In
        } else {
          this.currentUser.set(null); // Not Logged In
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.currentUser.set(null);
        this.isLoading.set(false);
      }
    });
  }

 // 2. LOGIN (No Token Storage) 🔑
  login(data: any) {
    return this.apollo.mutate({
      mutation: LOGIN_MUTATION,
      variables: data
    }).pipe(
      tap((result: any) => {
        const user = result.data.loginUser.user;
        this.currentUser.set(user); // State update
        this.router.navigate(['/dashboard']);
      })
    );
  }

  // 3. REGISTER 📝
  register(data: any) {
    return this.apollo.mutate({
      mutation: REGISTER_MUTATION,
      variables: data
    }).pipe(
      tap((result: any) => {
        const user = result.data.registerUser.user;
        this.currentUser.set(user);
        this.router.navigate(['/dashboard']);
      })
    );
  }

  // 4. LOGOUT (Server Call) 🚪
  logout() {
    this.apollo.mutate({ mutation: LOGOUT_MUTATION }).subscribe(() => {
      this.currentUser.set(null);
      
      // Apollo Store Clear karna achi practice hai
      this.apollo.client.resetStore(); 
      
      this.router.navigate(['/login']);
    });
  }

  // Local Cleanup Helper
  private logoutLocal() {
    localStorage.removeItem('user_data'); // ✅ Remove from Storage
    this.currentUser.set(null);
  }
  

  // Guard ke liye check
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  // Helper: Kya current user Admin hai?
  isAdmin(): boolean {
    return this.currentUser()?.role === 'ADMIN';
  }
}