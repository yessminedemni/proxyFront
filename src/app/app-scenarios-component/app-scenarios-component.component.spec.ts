import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppScenariosComponent } from './app-scenarios-component.component';
import { AppScenarioService } from '../services/AppScenarioService.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';

describe('AppScenariosComponent', () => {
  let component: AppScenariosComponent;
  let fixture: ComponentFixture<AppScenariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppScenariosComponent],
      imports: [HttpClientTestingModule, CommonModule, FormsModule, RouterTestingModule],
      providers: [AppScenarioService],
      schemas: [CUSTOM_ELEMENTS_SCHEMA] // Si tu utilises des composants personnalisés dans le HTML
    }).compileComponents();

    fixture = TestBed.createComponent(AppScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
