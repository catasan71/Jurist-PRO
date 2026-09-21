import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private notificationService = inject(NotificationService);

  handleError(error: unknown): void {
    const err = error as { message?: string, error?: { message?: string } };
    
    // Extract a readable message
    let message = 'A apărut o eroare neașteptată.';
    if (typeof error === 'string') {
      message = error;
    } else if (err?.error?.message) {
      message = err.error.message;
    } else if (err?.message) {
      message = err.message;
    }

    // Console logging for developers
    console.error('Global Error Handler:', error);

    // Filter out some common benign errors if needed
    if (
      message.includes('ExpressionChangedAfterItHasBeenCheckedError') ||
      message === 'Script error.' ||
      message === 'Script error' ||
      message.toLowerCase().includes('script error')
    ) {
      return;
    }

    // Show toast to user
    this.notificationService.error(`Eroare: ${message}`);
  }
}
