import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DatabaseconfigComponent } from './databaseconfig/databaseconfig.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScenariosDashboardComponent } from './scenarios/scenarios-dashboard/scenarios-dashboard.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { GrafanadashboardComponent } from './grafanadashboard/grafanadashboard.component';
import { AppScenariosComponent } from './app-scenarios-component/app-scenarios-component.component';
import { AppScenariosDashboardComponentComponent } from './app-scenarios-dashboard-component/app-scenarios-dashboard-component.component';

export const routes: Routes = [
  { path: 'dashboard', component: ScenariosDashboardComponent },
  { path: 'SCENARIOS', component: DashboardComponent },
  { path: 'databse-config', component: DatabaseconfigComponent },
  { path: '', redirectTo: '/databse-config', pathMatch: 'full' },
  { path: 'documentation', component: DocumentationComponent },
    { path: 'metrics', component: GrafanadashboardComponent },
    { path: 'app-scenarios', component: AppScenariosComponent },
    { path: 'app-dashboard', component: AppScenariosDashboardComponentComponent },



  

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }