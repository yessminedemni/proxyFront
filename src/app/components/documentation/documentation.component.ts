import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <div class="page-container">
      <h1>Documentation</h1>
      <p>View guides and API references</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      margin-top: 60px;
    }
  `]
})
export class DocumentationComponent {}
