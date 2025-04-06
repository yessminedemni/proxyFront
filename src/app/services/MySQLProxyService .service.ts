import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders } from "@angular/common/http"
import type { Observable } from "rxjs"
import { tap, catchError } from "rxjs/operators"
import { throwError } from "rxjs"

export interface MySQLProxyConfig {
  id?: number
  host: string
  port: number
}

@Injectable({
  providedIn: "root",
})
export class MySQLProxyService {
  private apiUrl = "http://localhost:8081/api/proxy"

  constructor(private http: HttpClient) {}

  getProxyConfig(): Observable<MySQLProxyConfig> {
    return this.http.get<MySQLProxyConfig>(`${this.apiUrl}/config`)
  }

  saveProxyConfig(config: MySQLProxyConfig): Observable<MySQLProxyConfig> {
    // Ensure port is a number
    const payload = {
      ...config,
      port: typeof config.port === "string" ? Number.parseInt(config.port, 10) : config.port,
    }

    console.log("Saving proxy config:", payload)
    return this.http.post<MySQLProxyConfig>(`${this.apiUrl}/config`, payload)
  }

  startProxy(): Observable<string> {
    console.log("Sending start proxy request")

    // Changed to GET request to avoid empty body issues
    return this.http
      .get(`${this.apiUrl}/start`, {
        responseType: "text",
      })
      .pipe(
        tap((response) => console.log("Start proxy response:", response)),
        catchError((error) => {
          console.error("Start proxy error:", error)
          if (error.error) {
            console.error("Error details:", typeof error.error === "string" ? error.error : JSON.stringify(error.error))
          }
          return throwError(() => error)
        }),
      )
  }

  stopProxy(): Observable<string> {
    console.log("Sending stop proxy request")

    // Changed to GET request to avoid empty body issues
    return this.http
      .get(`${this.apiUrl}/stop`, {
        responseType: "text",
      })
      .pipe(
        tap((response) => console.log("Stop proxy response:", response)),
        catchError((error) => {
          console.error("Stop proxy error:", error)
          if (error.error) {
            console.error("Error details:", typeof error.error === "string" ? error.error : JSON.stringify(error.error))
          }
          return throwError(() => error)
        }),
      )
  }

  testConnection(config: any): Observable<any> {
    // Create a simple object with just host and port
    const payload = {
      host: config.host,
      port: typeof config.port === "string" ? Number.parseInt(config.port, 10) : config.port,
    }

    // Convert to JSON string and back to ensure it's a plain object
    const cleanPayload = JSON.parse(JSON.stringify(payload))

    console.log("Testing connection with payload:", cleanPayload)
    console.log("Payload type:", typeof cleanPayload)
    console.log("Port type:", typeof cleanPayload.port)

    // Set explicit headers to ensure proper content type
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
    })

    // Use the responseType: 'text' option to get the raw response
    return this.http
      .post(`${this.apiUrl}/test-connection`, cleanPayload, {
        headers,
        responseType: "text",
      })
      .pipe(
        tap(
          (response) => console.log("Connection test response:", response),
          (error) => {
            console.error("Connection test error:", error)
            if (error.error) {
              console.error(
                "Error details:",
                typeof error.error === "string" ? error.error : JSON.stringify(error.error),
              )
            }
          },
        ),
      )
  }

  getProxyStatus(): Observable<{ running: boolean; config: MySQLProxyConfig }> {
    return this.http.get<{ running: boolean; config: MySQLProxyConfig }>(`${this.apiUrl}/status`)
  }
}

