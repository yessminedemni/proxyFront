import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatabaseconfigComponent } from './databaseconfig.component';

describe('DatabaseconfigComponent', () => {
  let component: DatabaseconfigComponent;
  let fixture: ComponentFixture<DatabaseconfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatabaseconfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatabaseconfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
