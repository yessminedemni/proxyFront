import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppScenariosDashboardComponentComponent } from './app-scenarios-dashboard-component.component';

describe('AppScenariosDashboardComponentComponent', () => {
  let component: AppScenariosDashboardComponentComponent;
  let fixture: ComponentFixture<AppScenariosDashboardComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppScenariosDashboardComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppScenariosDashboardComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
