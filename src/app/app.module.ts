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
import { DatabaseconfigComponent } from './databaseconfig/databaseconfig.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { AppRoutingModule } from './app-routing.module';
import { GrafanadashboardComponent } from './grafanadashboard/grafanadashboard.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppScenariosComponent } from './app-scenarios-component/app-scenarios-component.component';
import { AppScenariosDashboardComponentComponent } from './app-scenarios-dashboard-component/app-scenarios-dashboard-component.component';

// Routes
const routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'SCENARIOS', component: ScenariosDashboardComponent },
  { path: 'databse-config', component: DatabaseconfigComponent },
  { path: 'documentation', component: DocumentationComponent },
  { path: 'metrics', component: GrafanadashboardComponent },
  { path: 'app-scenarios', component: AppScenariosComponent },
  { path: 'app-dashboard', component: AppScenariosDashboardComponentComponent },

  

  

  



];

@NgModule({
  // Import standalone components as Angular v15+ requires
  declarations: [], // Only needed if AppComponent isn't standalone
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
    FormsModule,  // Add this for ngModel

    // Standalone components
    HeaderComponent,
    FooterComponent,
    DashboardComponent,
    ReactiveFormsModule ,
    ScenariosDashboardComponent,
    RouterModule,
    AppRoutingModule,
    AppScenariosComponent,
    AppScenariosComponent,
    DocumentationComponent ,
    GrafanadashboardComponent,

  ],
  providers: [],
  bootstrap: [] // Must match your root component
})
export class AppModule {}