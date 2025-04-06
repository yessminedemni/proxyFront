import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DatabaseconfigComponent } from './databaseconfig/databaseconfig.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScenariosDashboardComponent } from './scenarios/scenarios-dashboard/scenarios-dashboard.component';

export const routes: Routes = [
  { path: 'dashboard', component: ScenariosDashboardComponent },
  { path: 'SCENARIOS', component: DashboardComponent },
  { path: 'databse-config', component: DatabaseconfigComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }