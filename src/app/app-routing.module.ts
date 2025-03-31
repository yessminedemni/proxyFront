import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScenariosDashboardComponent } from './scenarios/scenarios-dashboard/scenarios-dashboard.component';

export const routes: Routes = [  // ✅ Add 'export' here
  { path: '', redirectTo: '/SCENARIOS', pathMatch: 'full' },
  { path: 'SCENARIOS', component: DashboardComponent },
  { path: 'dashbord', component: ScenariosDashboardComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
