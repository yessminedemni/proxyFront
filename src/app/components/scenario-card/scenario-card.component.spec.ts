import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioCardComponent } from './scenario-card.component';

describe('ScenarioCardComponent', () => {
  let component: ScenarioCardComponent;
  let fixture: ComponentFixture<ScenarioCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScenarioCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScenarioCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
