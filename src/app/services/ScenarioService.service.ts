import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, of, timer, forkJoin } from "rxjs";
import { catchError, tap, switchMap, map } from "rxjs/operators";
import { ScenarioNotificationService } from "./ScenarioNotification.service";
import type { Scenario, StressTestStatus } from "../models/scenario.model";
import { AppScenarioService } from "./AppScenarioService.service";

@Injectable({ providedIn: 'root' })
export class ScenarioService {
  private dbApiUrl = "http://localhost:8081/api/scenarios";
  private refreshInterval = 1000;
  private scenariosSubject = new BehaviorSubject<Scenario[]>([]);
  scenarios$ = this.scenariosSubject.asObservable();

  private scenarioDetails: { [key: string]: Partial<Scenario> } = {
    latency_injection: { description: "Adds artificial delay", category: "Performance", impact: "medium" },
    packet_loss: { description: "Simulates packet loss", category: "Network", impact: "high" },
    stress_testing: { description: "Stresses DB", category: "Load", impact: "critical" },
    cpu_load: { description: "High CPU usage", category: "Performance", impact: "warning" },
    memory_load: { description: "Memory pressure", category: "Performance", impact: "warning" },
    high_load: { description: "App load", category: "Performance", impact: "warning" },
    return404: { description: "Return 404 errors", category: "Application", impact: "warning" },
    service_down: { description: "Service unavailable", category: "Application", impact: "critical" },
    db_down: { description: "DB unavailable", category: "Database", impact: "critical" },
    query_blackhole: { description: "Query blackhole", category: "Database", impact: "critical" },
    connection_kill: { description: "Kill DB connections", category: "Database", impact: "critical" },
    disk_fault: { description: "Disk failure", category: "Infrastructure", impact: "critical" }
  };

  constructor(
    private http: HttpClient,
    private notificationService: ScenarioNotificationService,
    private appScenarioService: AppScenarioService
  ) {
    this.startPolling();
  }

  startPolling() {
    timer(0, this.refreshInterval).pipe(
      switchMap(() =>
        forkJoin([
          this.fetchDbScenarios(),
          this.fetchAppScenarios()
        ])
      )
    ).subscribe(([dbScenarios, appScenarios]) => {
      const combined = [...dbScenarios, ...appScenarios];
      this.scenariosSubject.next(combined);
    });
  }

  private fetchDbScenarios(): Observable<Scenario[]> {
    return this.http.get<Scenario[]>(this.dbApiUrl).pipe(
      catchError(error => {
        console.error('Error fetching DB scenarios:', error);
        return of([]);
      }),
      tap((scenarios) => {
        scenarios.forEach((scenario) => {
          const details = this.scenarioDetails[scenario.name];
          if (details) {
            scenario.category = details.category;
            scenario.impact = details.impact;
          }
          const normalized = this.normalizeScenarioName(scenario.name);
          this.notificationService.addNotification(normalized, scenario.enabled);
        });
      })
    );
  }

 private fetchAppScenarios(): Observable<Scenario[]> {
  return this.appScenarioService.getAllScenarios().pipe(
    map((scenarios) =>
      scenarios.map((s) => {
        const normalized = this.normalizeScenarioName(s.name);
        const details = this.scenarioDetails[normalized] || {};

        return {
          id: s.id,
          name: normalized,
          originalName: s.name,
          enabled: s.enabled,
          description: details.description || "No description provided",
          category: details.category || "App",
          impact: details.impact || "normal",
          error: null,
          isToggling: false,
        } as Scenario;
      })
    ),
    tap((scenarios) => {
      scenarios.forEach((scenario) => {
        this.notificationService.addNotification(scenario.name, scenario.enabled);
      });
    }),
    catchError((error) => {
      console.error("❌ Error fetching App scenarios:", error);
      return of([]);
    })
  );
}



  toggleScenario(name: string): Observable<string> {
    return this.http.put<string>(`${this.dbApiUrl}/toggle/${name}`, {}).pipe(
      tap(() => {
        this.getScenarioStatus(name).subscribe((enabled) => {
          const normalized = this.normalizeScenarioName(name);
          this.notificationService.addNotification(normalized, enabled);
        });
      }),
      catchError(this.handleError<string>(`toggleScenario ${name}`))
    );
  }

  enableScenario(name: string): Observable<string> {
    return this.http.post<string>(`${this.dbApiUrl}/enable/${name}`, {}).pipe(
      tap(() => {
        const normalized = this.normalizeScenarioName(name);
        this.notificationService.addNotification(normalized, true);
      }),
      catchError(this.handleError<string>(`enableScenario ${name}`))
    );
  }

  disableScenario(name: string): Observable<string> {
    return this.http.post<string>(`${this.dbApiUrl}/disable/${name}`, {}).pipe(
      tap(() => {
        const normalized = this.normalizeScenarioName(name);
        this.notificationService.addNotification(normalized, false);
      }),
      catchError(this.handleError<string>(`disableScenario ${name}`))
    );
  }

  getScenarioStatus(name: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.dbApiUrl}/status/${name}`).pipe(
      catchError(this.handleError<boolean>(`getScenarioStatus ${name}`, false))
    );
  }

  getStressTestStatus(): Observable<StressTestStatus> {
    return this.http.get<StressTestStatus>(`${this.dbApiUrl}/stress-test-status`);
  }

  private handleError<T>(operation = "operation", result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      return of(result as T);
    };
  }

  private normalizeScenarioName(name: string): string {
    return name.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
  }
}
