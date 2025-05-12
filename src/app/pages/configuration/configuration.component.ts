import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Configuration</h1>
      <p>Configure database connections and settings</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      margin-top: 60px;
    }
  `]
})
export class ConfigurationComponent {} 