import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hello-page',
  templateUrl: './hello-page.component.html',
  styleUrls: ['./hello-page.component.scss'],
})
export class HelloPageComponent {
  constructor(private router: Router) {}

  goToConfiguration(): void {
    this.router.navigate(['/configuration']);
  }

  viewDocumentation(): void {
    // Add your documentation navigation logic here
    // For example: window.open('/docs', '_blank');
    console.log('Opening documentation');
  }
}