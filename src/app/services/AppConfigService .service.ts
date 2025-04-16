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

  // Application configuration methods
  getAppConfig(): Observable<any> {
    return this.http.get(`${this.apiUrl}/app-config`).pipe(retry(1), catchError(this.handleError))
  }

  saveAppConfig(config: any): Observable<any> {
    // Ensure all values have the correct types before sending
    const payload = {
      ...config,
      // Ensure port is sent as a string to match backend expectations
      port: config.port ? config.port.toString() : null,
      // Include other fields that might need type conversion
    }

    console.log("Sending app config:", payload)
    return this.http.post(`${this.apiUrl}/app-config`, payload).pipe(catchError(this.handleError))
  }

  testAppConnection(config: any): Observable<any> {
    // Ensure all values have the correct types before sending
    const payload = {
      ...config,
      // Ensure port is sent as a string to match backend expectations
      port: config.port ? config.port.toString() : null,
      // Include other fields that might need type conversion
    }

    console.log("Testing app connection with:", payload)
    return this.http.post(`${this.apiUrl}/test-app-connection`, payload).pipe(catchError(this.handleError))
  }

  testAppProxyConnection(config: any): Observable<any> {
    // Ensure all values have the correct types before sending
    const payload = {
      targetHost: config.targetHost,
      targetPort: config.targetPort.toString(), // Convert to string as expected by backend
      proxyPort: config.proxyPort.toString(), // Use the provided proxyPort value
    }

    console.log("Testing app proxy connection with:", payload)
    return this.http.post(`${this.apiUrl}/test-app-proxy`, payload).pipe(catchError(this.handleError))
  }

  stopAppProxy(): Observable<any> {
    return this.http.post(`${this.apiUrl}/stop-app-proxy`, {}).pipe(catchError(this.handleError))
  }

  // Enhanced error handling with more details
  private handleError(error: HttpErrorResponse) {
    let errorMessage = ""
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`
    } else {
      // Server-side error
      errorMessage = `Server Error Code: ${error.status}\nMessage: ${error.message}`

      // Add more details if available
      if (error.error) {
        if (typeof error.error === "string") {
          errorMessage += `\nDetails: ${error.error}`
        } else if (error.error.message) {
          errorMessage += `\nDetails: ${error.error.message}`
        }
      }
    }

    console.error("API Error:", errorMessage, error)
    return throwError(() => new Error(errorMessage))
  }
  updateScenarioState(name: string, enabled: boolean): Observable<any> {
    const config = { name, enabled };
    return this.http.post(`${this.apiUrl}/update-scenario`, config).pipe(catchError(this.handleError));
  }
  
  
}
