import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { DatabaseConfigService } from '../services/database-config.service';

@Component({
  selector: 'app-databaseconfig',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './databaseconfig.component.html',
  styleUrls: ['./databaseconfig.component.scss']
})
export class DatabaseconfigComponent implements OnInit {
  dbConfigForm!: FormGroup;
  isLoading = false;
  message = '';
  isError = false;

  dbTypes = [
    { name: 'mysql' },
    { name: 'postgresql' },
    { name: 'mariadb' }
  ];

  constructor(
    private fb: FormBuilder,
    private databaseConfigService: DatabaseConfigService
  ) {}

  ngOnInit(): void {
    this.dbConfigForm = this.fb.group({
      databaseType: ['mysql', Validators.required],
      host: ['localhost', Validators.required],
      port: ['3306', Validators.required],
      databaseName: ['', Validators.required],
      useCustomUrl: [false],
      customUrl: [''],
      username: ['', Validators.required],
      password: ['', Validators.required],
      generatedUrl: ['']
    });

    // Update validators based on useCustomUrl
    this.dbConfigForm.get('useCustomUrl')?.valueChanges.subscribe(useCustom => {
      const customUrlControl = this.dbConfigForm.get('customUrl');
      const hostControl = this.dbConfigForm.get('host');
      const portControl = this.dbConfigForm.get('port');
      const dbNameControl = this.dbConfigForm.get('databaseName');
      
      if (useCustom) {
        customUrlControl?.setValidators([Validators.required]);
        hostControl?.clearValidators();
        portControl?.clearValidators();
        dbNameControl?.clearValidators();
      } else {
        customUrlControl?.clearValidators();
        hostControl?.setValidators([Validators.required]);
        portControl?.setValidators([Validators.required]);
        dbNameControl?.setValidators([Validators.required]);
      }
      
      customUrlControl?.updateValueAndValidity();
      hostControl?.updateValueAndValidity();
      portControl?.updateValueAndValidity();
      dbNameControl?.updateValueAndValidity();
    });

    // Generate JDBC URL when form values change
    this.dbConfigForm.valueChanges.subscribe(val => {
      if (!val.useCustomUrl) {
        const url = `jdbc:${val.databaseType}://${val.host}:${val.port}/${val.databaseName}`;
        this.dbConfigForm.get('generatedUrl')?.setValue(url, { emitEvent: false });
      }
    });
  }

  onSubmit() {
    if (this.dbConfigForm.valid) {
      this.isLoading = true;
      const payload = this.buildPayload();
      
      console.log('Submitting configuration:', payload);
      
      this.databaseConfigService.saveConfig(payload).subscribe({
        next: (response) => {
          console.log('Configuration saved successfully:', response);
          this.message = 'Configuration saved successfully!';
          this.isError = false;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error saving configuration:', err);
          this.message = 'Error: ' + (err.error?.message || err.message || 'Unknown error');
          this.isError = true;
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched(this.dbConfigForm);
    }
  }

  testConnection() {
    if (this.dbConfigForm.valid) {
      this.isLoading = true;
      const payload = this.buildPayload();
      
      console.log('Testing connection with:', payload);
      
      this.databaseConfigService.testConnection(payload).subscribe({
        next: (response) => {
          console.log('Connection test successful:', response);
          this.message = 'Connection successful! Configuration stored.';
          this.isError = false;
          this.isLoading = false;
          // Removed the enableStressTestScenario call
        },
        error: (err) => {
          console.error('Connection test failed:', err);
          this.message = 'Connection failed: ' + (err.error?.message || err.message || 'Unknown error');
          this.isError = true;
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched(this.dbConfigForm);
    }
  }

  stopStressTest() {
    this.isLoading = true;
    this.databaseConfigService.stopStressTest().subscribe({
      next: (response) => {
        console.log('Stress test stopped:', response);
        this.message = 'Stress test stopped successfully.';
        this.isError = false;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to stop stress test:', err);
        this.message = 'Failed to stop stress test: ' + (err.error?.message || err.message || 'Unknown error');
        this.isError = true;
        this.isLoading = false;
      }
    });
  }

  private buildPayload() {
    const form = this.dbConfigForm.value;
    return {
      databaseType: form.databaseType,
      host: form.host,
      port: form.port,
      databaseName: form.databaseName,
      useCustomUrl: form.useCustomUrl,
      customUrl: form.customUrl,
      username: form.username,
      password: form.password,
      jdbcUrl: form.useCustomUrl ? form.customUrl : this.dbConfigForm.get('generatedUrl')?.value
    };
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as FormGroup).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
}