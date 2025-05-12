import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>App Dashboard</h1>
      <p>Application monitoring dashboard</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      margin-top: 60px;
    }
  `]
})
export class AppDashboardComponent {} 