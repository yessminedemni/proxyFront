import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrafanadashboardComponent } from './grafanadashboard.component';

describe('GrafanadashboardComponent', () => {
  let component: GrafanadashboardComponent;
  let fixture: ComponentFixture<GrafanadashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrafanadashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GrafanadashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
