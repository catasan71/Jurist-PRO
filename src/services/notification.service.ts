import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: number;
  message: string;
  type: NotificationType;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notifications = signal<AppNotification[]>([]);
  notifications = this._notifications.asReadonly();
  private _counter = 0;

  show(message: string, type: NotificationType = 'info', duration = 12000) {
    const id = ++this._counter;
    const notification: AppNotification = { id, message, type };
    
    this._notifications.update(n => [...n, notification]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string) {
    this.show(message, 'success', 8000);
  }

  info(message: string) {
    this.show(message, 'info', 10000);
  }

  error(message: string) {
    // Erorile raman 25 de secunde pentru a putea fi citite integral sau pot fi inchise manual cu butonul X
    this.show(message, 'error', 25000);
  }

  warning(message: string) {
    this.show(message, 'warning', 12000);
  }

  remove(id: number) {
    this._notifications.update(n => n.filter(item => item.id !== id));
  }
}
