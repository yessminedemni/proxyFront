import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of, forkJoin } from "rxjs";
import { catchError, map, tap, switchMap } from "rxjs/operators";
import { AppScenarioService } from "./AppScenarioService.service";

export interface MetricData {
  timestamp: number;
  value: number;
}

export interface AppScenarioMetrics {
  packetLoss: MetricData[];
  latency: MetricData[];
  queryLoad: MetricData[];
  queryBlackhole: MetricData[];
  connectionKill: MetricData[];
  diskFault: MetricData[];
}

@Injectable({
  providedIn: "root",
})
export class AppMetricsService {
  private apiUrl = "http://localhost:8081/api/metrics";

  private scenarioStatuses = {
    packet_loss: false,
    latency_injection: false,
    stress_testing: false,
    query_blackhole: false,
    connection_kill: false,
    disk_fault: false,
  };

  constructor(
    private http: HttpClient,
    private scenarioService: AppScenarioService,
  ) {
    this.updateScenarioStatuses();
  }

  updateScenarioStatuses(): Observable<void> {
    const scenarios = [
      "packet_loss",
      "latency_injection",
      "stress_testing",
      "query_blackhole",
      "connection_kill",
      "disk_fault",
    ];

    return forkJoin(
      scenarios.map((scenario) =>
        this.scenarioService.getScenarioStatus(scenario).pipe(
          tap((status) => {
            this.scenarioStatuses[scenario as keyof typeof this.scenarioStatuses] = status.enabled;
            console.log(`Updated ${scenario} status: ${status.enabled}`);
          }),
          catchError((err) => {
            console.error(`Error updating status for ${scenario}:`, err);
            return of(null);
          })
        )
      )
    ).pipe(map(() => undefined));
  }

  getMetrics(): Observable<AppScenarioMetrics> {
    return this.updateScenarioStatuses().pipe(
      switchMap(() =>
        this.http.get<any>(this.apiUrl).pipe(
          tap((data) => {
            if (data.scenarioStates) {
              this.scenarioStatuses.packet_loss = data.scenarioStates.packetLoss || false;
              this.scenarioStatuses.latency_injection = data.scenarioStates.latencyInjection || false;
              this.scenarioStatuses.stress_testing = data.scenarioStates.stressTesting || false;
              this.scenarioStatuses.query_blackhole = data.scenarioStates.queryBlackhole || false;
              this.scenarioStatuses.connection_kill = data.scenarioStates.connectionKill || false;
              this.scenarioStatuses.disk_fault = data.scenarioStates.diskFault || false;
              console.log("Updated scenario statuses from metrics:", this.scenarioStatuses);
            }
          }),
          map((data) => {
            console.log("Raw metrics data from backend:", data);

            const metrics: AppScenarioMetrics = {
              packetLoss: (data.network?.packetLoss || data.packetLoss || []).map((item: any) => ({
                timestamp: item.timestamp || Date.now(),
                value: item.value || 0,
              })),
              latency: (data.network?.latency || data.latency || []).map((item: any) => ({
                timestamp: item.timestamp || Date.now(),
                value: item.value || 0,
              })),
              queryLoad: (data.database?.queryLoad || data.queryLoad || []).map((item: any) => ({
                timestamp: item.timestamp || Date.now(),
                value: item.value || 0,
              })),
              queryBlackhole: (data.database?.queryBlackhole || data.queryBlackhole || []).map((item: any) => ({
                timestamp: item.timestamp || Date.now(),
                value: item.value || 0,
              })),
              connectionKill: (data.service?.connectionKill || data.connectionKill || []).map((item: any) => ({
                timestamp: item.timestamp || Date.now(),
                value: item.value || 0,
              })),
              diskFault: (data.infrastructure?.diskFault || data.diskFault || []).map((item: any) => ({
                timestamp: item.timestamp || Date.now(),
                value: item.value || 0,
              })),
            };

            console.log("Processed metrics:", metrics);
            return metrics; 
          }),
          catchError((err) => {
            console.error("Error fetching metrics from backend, using mock data:", err);
            return of(this.generateMockMetrics());
          })
        )
      )
    );
  }

  getScenarioStatus(scenarioName: string): boolean {
    return this.scenarioStatuses[scenarioName as keyof typeof this.scenarioStatuses] || false;
  }

  generateMockMetrics(): AppScenarioMetrics {
    const now = Date.now();
    const packetLoss: MetricData[] = [];
    const latency: MetricData[] = [];
    const queryLoad: MetricData[] = [];
    const queryBlackhole: MetricData[] = [];
    const connectionKill: MetricData[] = [];
    const diskFault: MetricData[] = [];

    for (let i = 0; i < 10; i++) {
      const timestamp = now - (9 - i) * 1000;

      const packetLossValue = this.scenarioStatuses.packet_loss
        ? 10 + Math.random() * 10 // 10-20%
        : 0.1 + Math.random() * 0.5; // 0.1-0.6%

      const latencyValue = this.scenarioStatuses.latency_injection
        ? 4000 + (Math.random() * 400 - 200) // 3800-4200ms
        : 10 + Math.random() * 40; // 10-50ms

      const queryLoadValue = this.scenarioStatuses.stress_testing
        ? 200 + Math.random() * 100 // 200-300 q/s
        : 5 + Math.random() * 15; // 5-20 q/s

      const queryBlackholeValue = this.scenarioStatuses.query_blackhole
        ? 20 + Math.random() * 10 // 20-30%
        : 0 + Math.random() * 1; // 0-1%

      const connectionKillValue = this.scenarioStatuses.connection_kill
        ? 15 + Math.random() * 10 // 15-25%
        : 0 + Math.random() * 0.5; // 0-0.5%

      const diskFaultValue = this.scenarioStatuses.disk_fault
        ? 10 + Math.random() * 10 // 10-20%
        : 0 + Math.random() * 0.2; // 0-0.2%

      packetLoss.push({ timestamp, value: Math.round(packetLossValue * 100) / 100 });
      latency.push({ timestamp, value: Math.round(latencyValue * 100) / 100 });
      queryLoad.push({ timestamp, value: Math.round(queryLoadValue * 100) / 100 });
      queryBlackhole.push({ timestamp, value: Math.round(queryBlackholeValue * 100) / 100 });
      connectionKill.push({ timestamp, value: Math.round(connectionKillValue * 100) / 100 });
      diskFault.push({ timestamp, value: Math.round(diskFaultValue * 100) / 100 });
    }

    return { packetLoss, latency, queryLoad, queryBlackhole, connectionKill, diskFault };
  }

  pollScenarioStatus(scenarioName: string): Observable<{ enabled: boolean }> {
    return this.http.get<any>(`http://localhost:8081/api/scenarios/status/${scenarioName}`).pipe(
      map((response) => ({ enabled: response.enabled })),
      catchError((err) => {
        console.error(`Error getting status for scenario ${scenarioName}:`, err);
        return of({ enabled: false });
      })
    );
  }

  pollMetricsWhenScenarioEnabled(scenarioName: string, intervalMs = 2000): Observable<AppScenarioMetrics> {
    return this.pollScenarioStatus(scenarioName).pipe(
      switchMap((status) => {
        if (status.enabled) {
          return this.getMetrics();
        } else {
          return of({
            packetLoss: [],
            latency: [],
            queryLoad: [],
            queryBlackhole: [],
            connectionKill: [],
            diskFault: [],
          });
        }
      })
    );
  }
}