import { BehaviorSubject, type Observable, of, timer } from "rxjs"
import { catchError, switchMap, tap } from "rxjs/operators"
import type { Scenario, StressTestStatus } from "../models/scenario.model"
import { HttpClient } from '@angular/common/http';
import { Injectable } from "@angular/core";


@Injectable({
  providedIn: 'root' // ✅ Global singleton
})
export class ScenarioService {
// scenario.service.ts
private apiUrl = "http://localhost:8081/api/scenarios"; 
private refreshInterval = 5000; // 5 seconds
private scenariosSubject = new BehaviorSubject<Scenario[]>([]);
  scenarios$ = this.scenariosSubject.asObservable();

  startPolling() {
    timer(0, this.refreshInterval).pipe(
      switchMap(() => this.fetchAllScenarios())
    ).subscribe();
  }

  fetchAllScenarios(): Observable<Scenario[]> {
    return this.http.get<Scenario[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching scenarios:', error);
        return [];
      }),
      switchMap(scenarios => {
        this.scenariosSubject.next(scenarios);
        return [scenarios];
      })
    );
  }



  private scenarioDetails: { [key: string]: Partial<Scenario> } = {
    latency_injection: {
      description: "Adds artificial delay to database responses based on query type",
      category: "Performance",
      impact: "medium",
    },
    packet_loss: {
      description: "Simulates network packet loss during database communication",
      category: "Network",
      impact: "high",
    },
    stress_testing: {
      description: "Runs intensive queries to stress test the database",
      category: "Load",
      impact: "critical",
    },
  }

  constructor(private http: HttpClient) {}

  getAllScenarios(): Observable<Scenario[]> {
    return this.http.get<Scenario[]>(this.apiUrl).pipe(
      tap((scenarios) => {
        // Enrich scenarios with additional metadata
        scenarios.forEach((scenario) => {
          const details = this.scenarioDetails[scenario.name]
          if (details) {
            scenario.description = details.description
            scenario.category = details.category
            scenario.impact = details.impact
          }
        })
      }),
      catchError(this.handleError<Scenario[]>("getAllScenarios", [])),
    )
  }

  enableScenario(name: string): Observable<string> {
    return this.http
      .post<string>(`${this.apiUrl}/enable/${name}`, {})
      .pipe(catchError(this.handleError<string>(`enableScenario ${name}`)))
  }

  disableScenario(name: string): Observable<string> {
    return this.http
      .post<string>(`${this.apiUrl}/disable/${name}`, {})
      .pipe(catchError(this.handleError<string>(`disableScenario ${name}`)))
  }

  toggleScenario(name: string): Observable<string> {
    return this.http
      .put<string>(`${this.apiUrl}/toggle/${name}`, {})  // ✅ Change to PUT
      .pipe(
        tap(response => console.log(`Toggle response for ${name}:`, response)),
        catchError(this.handleError<string>(`toggleScenario ${name}`))
      );
  }
  

  getScenarioStatus(name: string): Observable<boolean> {
    return this.http
      .get<boolean>(`${this.apiUrl}/status/${name}`)
      .pipe(catchError(this.handleError<boolean>(`getScenarioStatus ${name}`, false)))
  }

  private handleError<T>(operation = "operation", result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`)
      return of(result as T)
    }
  }

  getStressTestStatus(): Observable<StressTestStatus> {
    return this.http.get<StressTestStatus>(`${this.apiUrl}/stress-test-status`);
  }
  
}