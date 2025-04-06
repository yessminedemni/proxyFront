import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import type { Observable } from "rxjs"

@Injectable({
  providedIn: "root",
})
export class DatabaseConfigService {
  private apiUrl = "http://localhost:8081/api/stress-test"

  constructor(private http: HttpClient) {}

  testConnection(config: any): Observable<any> {
    console.log("Testing connection with config:", config)
    // Map username to user if needed
    const payload = {
      ...config,
      user: config.user || config.username,
    }
    // Remove username if it exists to avoid confusion
    if (payload.username) delete payload.username

    return this.http.post(`${this.apiUrl}/test-connection`, payload)
  }

  configureDatabase(config: any): Observable<any> {
    console.log("Configuring database with config:", config)
    // Map username to user if needed
    const payload = {
      ...config,
      user: config.user || config.username,
    }
    // Remove username if it exists to avoid confusion
    if (payload.username) delete payload.username

    return this.http.post(`${this.apiUrl}/config`, payload)
  }

  getCurrentConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/config`)
  }
}

