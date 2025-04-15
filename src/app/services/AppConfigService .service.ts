import { Injectable } from "@angular/core"
import  { HttpClient, HttpErrorResponse } from "@angular/common/http"
import { type Observable, throwError } from "rxjs"
import { catchError, retry } from "rxjs/operators"

@Injectable({
  providedIn: "root",
})
export class AppConfigService {
  private apiUrl = "http://localhost:8081/api/configuration"

  constructor(private http: HttpClient) {}

  // Database configuration methods
  getDbConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/db-config`).pipe(retry(1), catchError(this.handleError))
  }

  saveDbConfig(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/db-config`, config).pipe(catchError(this.handleError))
  }

  testDbConnection(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-db-connection`, config).pipe(catchError(this.handleError))
  }

  testDbProxyConnection(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-db-proxy`, config).pipe(catchError(this.handleError))
  }

  stopDbProxy(): Observable<any> {
    return this.http.post(`${this.apiUrl}/stop-db-proxy`, {}).pipe(catchError(this.handleError))
  }

  // Application configuration methods
  getAppConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/app-config`).pipe(retry(1), catchError(this.handleError))
  }

  saveAppConfig(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/app-config`, config).pipe(catchError(this.handleError))
  }

  testAppConnection(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-app-connection`, config).pipe(catchError(this.handleError))
  }

  testAppProxyConnection(config: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/test-app-proxy`, config).pipe(catchError(this.handleError))
  }

  stopAppProxy(): Observable<any> {
    return this.http.post(`${this.apiUrl}/stop-app-proxy`, {}).pipe(catchError(this.handleError))
  }

  // Chaos configuration methods
  getScenarios(): Observable<any> {
    return this.http.get(`${this.apiUrl}/scenarios`).pipe(retry(1), catchError(this.handleError))
  }

  setScenario(scenarioName: string, enabled: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/set-scenario`, { scenarioName, enabled }).pipe(catchError(this.handleError))
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    let errorMessage = ""
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`
    } else {
      // Server-side error
      errorMessage = `Server Error Code: ${error.status}\nMessage: ${error.message}`
    }
    console.error(errorMessage)
    return throwError(() => new Error(errorMessage))
  }
}
