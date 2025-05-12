import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scenarios',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Scenarios</h1>
      <p>Manage test scenarios and templates</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      margin-top: 60px;
    }
  `]
})
export class ScenariosComponent {} 