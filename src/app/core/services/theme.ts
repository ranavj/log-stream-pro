import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Theme {
  // Signal state ('dark' ya 'light')
  theme = signal<string>('light');

  constructor() {
    // 1. App start hote hi check karo purani setting
    const savedTheme = localStorage.getItem('app-theme');
    
    if (savedTheme) {
      this.theme.set(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Agar user ke laptop ki setting Dark hai
      this.theme.set('dark');
    }

    // 2. Effect: Jab bhi signal change ho, HTML class aur LocalStorage update karo
    effect(() => {
      const currentTheme = this.theme();
      
      // HTML tag par class lagao/hatao
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Save to LocalStorage
      localStorage.setItem('app-theme', currentTheme);
    });
  }

  toggleTheme() {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }
}