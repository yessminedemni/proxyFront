import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DatabaseconfigComponent } from './databaseconfig/databaseconfig.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScenariosDashboardComponent } from './scenarios/scenarios-dashboard/scenarios-dashboard.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { GrafanadashboardComponent } from './grafanadashboard/grafanadashboard.component';

export const routes: Routes = [
  { path: 'dashboard', component: ScenariosDashboardComponent },
  { path: 'SCENARIOS', component: DashboardComponent },
  { path: 'databse-config', component: DatabaseconfigComponent },
  { path: '', redirectTo: '/databse-config', pathMatch: 'full' },
  { path: 'documentation', component: DocumentationComponent },
    { path: 'metrics', component: GrafanadashboardComponent },
  

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }