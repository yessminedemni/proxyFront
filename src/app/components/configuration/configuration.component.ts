import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="configuration-container">
      <div class="config-header">
        <h1><i class="fas fa-cogs"></i> Configuration</h1>
        <p>Configure database connections and settings</p>
      </div>

      <div class="config-section">
        <h2>Database Connection</h2>
        <div class="config-form">
          <div class="form-group">
            <label for="host">Host</label>
            <input type="text" id="host" [(ngModel)]="config.host" placeholder="localhost">
          </div>
          <div class="form-group">
            <label for="port">Port</label>
            <input type="number" id="port" [(ngModel)]="config.port" placeholder="3306">
          </div>
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" [(ngModel)]="config.username" placeholder="root">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" [(ngModel)]="config.password" placeholder="••••••••">
          </div>
          <div class="form-group">
            <label for="database">Database</label>
            <input type="text" id="database" [(ngModel)]="config.database" placeholder="mysql_proxy">
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" (click)="saveConfig()">
              <i class="fas fa-save"></i> Save Configuration
            </button>
            <button class="btn btn-secondary" (click)="testConnection()">
              <i class="fas fa-plug"></i> Test Connection
            </button>
          </div>
        </div>
      </div>

      <div class="config-section">
        <h2>Proxy Settings</h2>
        <div class="config-form">
          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="enableLogging">
              Enable Detailed Logging
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="enableMetrics">
              Enable Metrics Collection
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="enableAlerts">
              Enable Alert Notifications
            </label>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .configuration-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .config-header {
      margin-bottom: 2rem;
      h1 {
        font-size: 2rem;
        font-weight: 600;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
        i {
          color: #4299e1;
        }
      }
      p {
        color: var(--text-secondary);
      }
    }

    .config-section {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 2rem;
      margin-bottom: 2rem;

      h2 {
        font-size: 1.5rem;
        font-weight: 500;
        margin-bottom: 1.5rem;
        color: var(--text-primary);
      }
    }

    .config-form {
      display: grid;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-weight: 500;
        color: var(--text-primary);
      }

      input[type="text"],
      input[type="number"],
      input[type="password"] {
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-size: 1rem;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
        }
      }

      input[type="checkbox"] {
        margin-right: 0.5rem;
      }
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;

      i {
        font-size: 1rem;
      }
    }

    .btn-primary {
      background: #4299e1;
      color: white;

      &:hover {
        background: #2b6cb0;
      }
    }

    .btn-secondary {
      background: #718096;
      color: white;

      &:hover {
        background: #4a5568;
      }
    }
  `]
})
export class ConfigurationComponent {
  config: DatabaseConfig = {
    host: '',
    port: 3306,
    username: '',
    password: '',
    database: ''
  };

  enableLogging = false;
  enableMetrics = true;
  enableAlerts = false;

  saveConfig() {
    console.log('Saving configuration:', this.config);
    // TODO: Implement actual save functionality
  }

  testConnection() {
    console.log('Testing connection with:', this.config);
    // TODO: Implement actual connection test
  }
} 