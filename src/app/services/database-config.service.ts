import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface ConfigPayload {
  databaseType: string;
  host: string;
  port: string;
  databaseName: string;
  useCustomUrl: boolean;
  customUrl: string;
  username: string;
  password: string;
  jdbcUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseConfigService {
  private apiUrl = 'http://localhost:8081/api/config'; // Base URL for config controller

  constructor(private http: HttpClient) {}

  saveConfig(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stress-test`, config);
  }

  testConnection(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-connection`, config);
  }

  stopStressTest(): Observable<any> {
    return this.http.post(`${this.apiUrl}/stop-stress-test`, {}); // Empty body for stop request
  }
  
  // Remove the enableStressTestScenario method as it's not needed
}