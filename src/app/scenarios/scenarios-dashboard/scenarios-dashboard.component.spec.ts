import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenariosDashboardComponent } from './scenarios-dashboard.component';

describe('ScenariosDashboardComponent', () => {
  let component: ScenariosDashboardComponent;
  let fixture: ComponentFixture<ScenariosDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenariosDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScenariosDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}
);
