import { Injectable } from "@angular/core"
import { type Observable, of, throwError } from "rxjs"
import { catchError, delay } from "rxjs/operators"
import { HttpClient } from '@angular/common/http';
import { ChaosScenario } from "../models/chaos-scenario.model";



@Injectable({
  providedIn: "root",
})
export class ChaosService {
  private apiUrl = "/api/chaos-scenarios" // Replace with your actual API endpoint

  // For demo purposes - remove in production
  private mockScenarios: ChaosScenario[] = [
    {
      id: "1",
      name: "Network Latency",
      description: "Introduces random network latency to simulate slow connections",
      category: "Network",
      enabled: false,
      details: {
        "Min Delay": "100ms",
        "Max Delay": "2000ms",
        "Affected Routes": "All",
      },
      severity: "medium",
    },
    {
      id: "2",
      name: "Service Outage",
      description: "Simulates complete service unavailability",
      category: "Availability",
      enabled: false,
      details: {
        Duration: "30s",
        "Affected Services": "Payment API",
      },
      severity: "critical",
    },
    {
      id: "3",
      name: "Random 500 Errors",
      description: "Randomly returns 500 Internal Server Error responses",
      category: "Error Handling",
      enabled: false,
      details: {
        "Error Rate": "25%",
        "Affected Routes": "/api/users, /api/products",
      },
      severity: "high",
    },
    {
      id: "4",
      name: "Memory Leak",
      description: "Simulates a memory leak in the application",
      category: "Resource",
      enabled: false,
      details: {
        "Growth Rate": "10MB/min",
        "Max Size": "500MB",
      },
      severity: "high",
    },
    {
      id: "5",
      name: "Database Connection Failure",
      description: "Simulates database connection issues",
      category: "Database",
      enabled: false,
      details: {
        "Failure Type": "Connection Timeout",
        Recovery: "Automatic after 30s",
      },
      severity: "critical",
    },
    {
      id: "6",
      name: "Slow Database Queries",
      description: "Makes database queries take longer than usual",
      category: "Database",
      enabled: false,
      details: {
        Delay: "2-5s per query",
        "Affected Queries": "SELECT operations",
      },
      severity: "medium",
    },
    {
      id: "7",
      name: "CPU Spike",
      description: "Causes CPU usage to spike temporarily",
      category: "Resource",
      enabled: false,
      details: {
        "CPU Usage": "90-100%",
        Duration: "45s",
      },
      severity: "medium",
    },
    {
      id: "8",
      name: "Request Throttling",
      description: "Limits the number of requests that can be processed",
      category: "Network",
      enabled: false,
      details: {
        "Rate Limit": "10 req/min",
        "Affected Routes": "API endpoints",
      },
      severity: "low",
    },
    {
      id: "9",
      name: "Data Corruption",
      description: "Randomly corrupts data in responses",
      category: "Data Integrity",
      enabled: false,
      details: {
        "Corruption Rate": "5%",
        "Fields Affected": "Random JSON fields",
      },
      severity: "high",
    },
  ]

  constructor(private http: HttpClient) {}

  getScenarios(): Observable<ChaosScenario[]> {
    // For demo purposes - replace with actual API call in production
    if (this.useMockData) {
      return of([...this.mockScenarios]).pipe(
        delay(800), // Simulate network delay
      )
    }

    return this.http.get<ChaosScenario[]>(this.apiUrl).pipe(catchError(this.handleError))
  }

  getScenarioById(id: string): Observable<ChaosScenario> {
    // For demo purposes - replace with actual API call in production
    if (this.useMockData) {
      const scenario = this.mockScenarios.find((s) => s.id === id)
      if (scenario) {
        return of({ ...scenario }).pipe(delay(500))
      }
      return throwError(() => new Error("Scenario not found"))
    }

    return this.http.get<ChaosScenario>(`${this.apiUrl}/${id}`).pipe(catchError(this.handleError))
  }

  updateScenario(scenario: ChaosScenario): Observable<ChaosScenario> {
    // For demo purposes - replace with actual API call in production
    if (this.useMockData) {
      const index = this.mockScenarios.findIndex((s) => s.id === scenario.id)
      if (index !== -1) {
        this.mockScenarios[index] = { ...scenario, updatedAt: new Date() }
        return of({ ...this.mockScenarios[index] }).pipe(delay(700))
      }
      return throwError(() => new Error("Scenario not found"))
    }

    return this.http.put<ChaosScenario>(`${this.apiUrl}/${scenario.id}`, scenario).pipe(catchError(this.handleError))
  }

  // Helper method to determine if we should use mock data
  private get useMockData(): boolean {
    // You can set this based on environment or configuration
    return true // For demo purposes
  }

  private handleError(error: any) {
    console.error("API error:", error)
    return throwError(() => new Error("Something went wrong. Please try again later."))
  }
}

