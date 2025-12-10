import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // RouterLink zaroori hai Register page jane ke liye
  templateUrl: './login.html'
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Loading state taaki user double click na kare
  isLoading = signal(false);
  // Error message dikhane ke liye (e.g., "Invalid Password")
  errorMsg = signal('');

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  onLogin() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMsg.set('');

      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          // Success hone par AuthService token save karega aur redirect karega
          this.isLoading.set(false);
          // Optional: Aap chaho toh yahan toast notification dikha sakte ho
        },
        error: (err) => {
          console.error('Login Failed', err);
          // Backend se agar message aaye toh wo dikhao, nahi toh generic message
          this.errorMsg.set(err.message || 'Invalid email or password');
          this.isLoading.set(false);
        }
      });
    }
  }
}