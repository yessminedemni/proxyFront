import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Metrics</h1>
      <p>Monitor system metrics and analytics</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      margin-top: 60px;
    }
  `]
})
export class MetricsComponent {} 