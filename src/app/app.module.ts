// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

// Import standalone components
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScenariosDashboardComponent } from './scenarios/scenarios-dashboard/scenarios-dashboard.component';

// Routes
const routes = [
  { path: 'dashboard', component: DashboardComponent }
];

@NgModule({
  // Import standalone components as Angular v15+ requires
  declarations: [], // Only needed if AppComponent isn't standalone
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    // Standalone components
    HeaderComponent,
    FooterComponent,
    DashboardComponent,
    ScenariosDashboardComponent
  ],
  providers: [],
  bootstrap: [] // Must match your root component
})
export class AppModule {}