import { Routes } from '@angular/router';
import { DatabaseconfigComponent } from './databaseconfig/databaseconfig.component';
import { ScenariosDashboardComponent } from './scenarios/scenarios-dashboard/scenarios-dashboard.component';
import { DocumentationComponent } from './components/documentation/documentation.component';
import { GrafanadashboardComponent } from './grafanadashboard/grafanadashboard.component';
import { AppScenariosComponent } from './app-scenarios-component/app-scenarios-component.component';
import { AppScenariosDashboardComponentComponent } from './app-scenarios-dashboard-component/app-scenarios-dashboard-component.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScenarioCardComponent } from './components/scenario-card/scenario-card.component';
import { HelloPageComponent } from './hello-page/hello-page.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { showScenarios: false }
  },
  {
    path: 'metrics',
    component: GrafanadashboardComponent
  },
  {
    path: 'documentation',
    component: DocumentationComponent
  },
  {
    path: 'app-scenarios',
    component: AppScenariosComponent
  },
  {
    path: 'app-dashboard',
    component: AppScenariosDashboardComponentComponent
  },
  {
    path: 'configuration',
    component: DatabaseconfigComponent
  },
  {
    path: 'database-config',
    component: DatabaseconfigComponent
  },
  {
    path: 'chaosdash',
    component: ScenariosDashboardComponent,
    data: { showScenarios: true }
  },
  {
    path: 'scenarios',
    component: ScenarioCardComponent,
    data: { showScenarios: true }
  },
  
  {
    path: 'hello',
    component: HelloPageComponent,
    data: { showScenarios: true }
  },
  {
    path: '**',
    redirectTo: 'hello'
  }

];