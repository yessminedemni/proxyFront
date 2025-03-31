import { Component } from '@angular/core';
import { FooterComponent } from "./components/footer/footer.component";
import { HeaderComponent } from "./components/header/header.component";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [FooterComponent, HeaderComponent,RouterModule]

})
export class AppComponent {
  title = 'my-app';
}
