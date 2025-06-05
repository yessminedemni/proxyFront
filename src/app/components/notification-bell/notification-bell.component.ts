import { Component, OnInit, OnDestroy, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScenarioNotificationService, ScenarioNotification } from '../../services/ScenarioNotification.service';

@Component({
  selector: 'notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-bell" [class.has-notifications]="hasNotifications()">
      <button 
        class="bell-button" 
        (click)="toggleDropdown()"
        [attr.aria-label]="'Notifications (' + totalCount() + ')'"
      >
        <i class="fas fa-bell"></i>
        <span 
          *ngIf="totalCount() > 0" 
          class="notification-badge"
          [class.critical]="criticalCount() > 0"
        >
          {{ totalCount() }}
        </span>
      </button>

      <div 
        class="notification-dropdown" 
        [class.open]="isDropdownOpen"
        *ngIf="isDropdownOpen"
      >
        <div class="dropdown-header">
          <h3>Active Scenarios</h3>
          <button class="close-btn" (click)="closeDropdown()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="notification-list" *ngIf="enabledNotifications().length > 0; else noNotifications">
          <div 
            *ngFor="let notification of enabledNotifications(); trackBy: trackByNotificationId"
            class="notification-item"
            [class]="'severity-' + notification.severity"
          >
            <div class="notification-icon">
              <i class="fas {{ notification.icon }}"></i>
            </div>
            
            <div class="notification-content">
              <div class="notification-title">
                {{ notification.scenarioName }}
                <span class="status-badge status-enabled">
                  active
                </span>
              </div>
              
              <div class="notification-meta">
                <span class="duration">
                  <i class="fas fa-clock"></i>
                  {{ formatDuration(notification.duration) }}
                </span>
                <span class="severity" [class]="'severity-' + notification.severity">
                  <i class="fas fa-exclamation-triangle" *ngIf="notification.severity === 'critical'"></i>
                  <i class="fas fa-exclamation-circle" *ngIf="notification.severity === 'warning'"></i>
                  {{ notification.severity }}
                </span>
              </div>
              
              <div class="notification-description">
                {{ notification.description }}
              </div>
            </div>
          </div>
        </div>

        <ng-template #noNotifications>
          <div class="no-notifications">
            <i class="fas fa-check-circle"></i>
            <p>No active scenarios</p>
          </div>
        </ng-template>

        <div class="dropdown-footer" *ngIf="enabledNotifications().length > 0">
          <button class="clear-all-btn" (click)="clearAllNotifications()">
            <i class="fas fa-trash"></i>
            Clear All
          </button>
        </div>
      </div>
    </div>

    <!-- Backdrop to close dropdown when clicking outside -->
    <div 
      class="notification-backdrop" 
      *ngIf="isDropdownOpen"
      (click)="closeDropdown()"
    ></div>
  `,
  styleUrl: './notification-bell.component.scss'
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  isDropdownOpen = false;
  private updateInterval: any;

  // Computed signals for reactive updates - only show enabled notifications
  notifications = computed(() => this.notificationService.notifications());
  enabledNotifications = computed(() => this.notificationService.getEnabledNotifications());
  totalCount = computed(() => this.notificationService.getEnabledCount());
  criticalCount = computed(() => this.notificationService.getCriticalCount());
  warningCount = computed(() => this.notificationService.getWarningCount());
  hasNotifications = computed(() => this.totalCount() > 0);

  constructor(private notificationService: ScenarioNotificationService) {
    // Effect to update durations periodically - only when there are enabled notifications
    effect(() => {
      if (this.hasNotifications()) {
        this.startDurationUpdates();
      } else {
        this.stopDurationUpdates();
      }
    });
  }

  ngOnInit() {
    console.log('NotificationBell component initialized');
  }

  ngOnDestroy() {
    this.stopDurationUpdates();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }

  clearAllNotifications() {
    this.notificationService.clearAllNotifications();
    this.closeDropdown();
  }

  trackByNotificationId(index: number, notification: ScenarioNotification): string {
    return notification.id;
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  private startDurationUpdates() {
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => {
        this.notificationService.updateDurations();
      }, 1000);
    }
  }

  private stopDurationUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}