import { Component, effect, inject, signal } from '@angular/core';
import { LogService } from '../../../core/services/log';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-log-detail',
  imports: [DatePipe, JsonPipe, CommonModule, ReactiveFormsModule],
  templateUrl: './log-detail.html',
  styleUrl: './log-detail.scss',
})
export class LogDetail {
  public logService = inject(LogService);
  public authService = inject(AuthService); // [NEW] Inject
  private fb = inject(FormBuilder);
  // Signal padhenge ki kaunsa log dikhana hai
  log = this.logService.selectedLog; 

  // [SIGNAL] Edit Mode Toggle ke liye
  isEditing = signal(false);

  // [FORM] Reactive Form Definition
  editForm = this.fb.group({
    message: ['', [Validators.required, Validators.minLength(5)]]
  });

  constructor() {
    // [EFFECT] Jab bhi naya log open ho, Form mein value set karo
    effect(() => {
      const currentLog = this.log();
      if (currentLog) {
        this.isEditing.set(false); // Reset edit mode
        this.editForm.patchValue({
          message: currentLog.message
        });
      }
    });
  }

  // Actions
  toggleEdit() {
    this.isEditing.update(v => !v);
  }

  onSave() {
    if (this.editForm.valid && this.log()) {
      const newMessage = this.editForm.value.message!;
      this.logService.updateLogItem(this.log()!.id, newMessage);
    }
  }

  onDelete() {
    if (confirm('Are you sure you want to delete this log?')) {
      this.logService.deleteLogItem(this.log()!.id);
    }
  }

  close() {
    this.logService.clearSelection();
  }
}
