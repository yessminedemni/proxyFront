import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable, of } from "rxjs"
import { catchError, tap } from "rxjs/operators"
import { AppScenarioService } from "./AppScenarioService.service"

export interface MetricData {
  timestamp: number
  value: number
}

export interface AppScenarioMetrics {
  cpuLoad: MetricData[]
  trafficLoad: MetricData[]
  responseTime: MetricData[]
}

@Injectable({
  providedIn: "root",
})
export class AppMetricsService {
  private apiUrl = "http://localhost:8081/api/metrics"
  
  // Track scenario statuses
  private scenarioStatuses = {
    cpu_load: false,
    high_load: false,
    return_404: false
  }

  constructor(
    private http: HttpClient,
    private scenarioService: AppScenarioService
  ) {
    // Initialize scenario statuses
    this.updateScenarioStatuses()
  }

  updateScenarioStatuses(): void {
    // Update CPU Load status
    this.scenarioService.getScenarioStatus("cpu_load").subscribe(status => {
      this.scenarioStatuses.cpu_load = status.enabled
      console.log("Updated CPU Load status:", status.enabled)
    })

    // Update High Load status
    this.scenarioService.getScenarioStatus("high_load").subscribe(status => {
      this.scenarioStatuses.high_load = status.enabled
      console.log("Updated High Load status:", status.enabled)
    })

    // Update Return 404 status
    this.scenarioService.getScenarioStatus("return_404").subscribe(status => {
      this.scenarioStatuses.return_404 = status.enabled
      console.log("Updated Return 404 status:", status.enabled)
    })
  }

  getMetrics(): Observable<AppScenarioMetrics> {
    // Always use mock data for demonstration
    return of(this.generateMockMetrics())
  }

  getScenarioStatus(scenarioName: string): boolean {
    return this.scenarioStatuses[scenarioName as keyof typeof this.scenarioStatuses] || false
  }

  generateMockMetrics(): AppScenarioMetrics {
    const now = Date.now()
    const cpuLoad: MetricData[] = []
    const trafficLoad: MetricData[] = []
    const responseTime: MetricData[] = []

    // Generate 10 data points for each metric
    for (let i = 0; i < 10; i++) {
      const timestamp = now - (9 - i) * 1000 // 1 second intervals

      // Generate values based on scenario statuses
      const cpuLoadValue = this.scenarioStatuses.cpu_load
        ? 70 + Math.random() * 25 // 70-95% when enabled
        : 10 + Math.random() * 20 // 10-30% when disabled

      const trafficLoadValue = this.scenarioStatuses.high_load
        ? 800 + Math.random() * 600 // 800-1400 req/s when enabled
        : 100 + Math.random() * 200 // 100-300 req/s when disabled

      const responseTimeValue = this.scenarioStatuses.return_404
        ? 400 + Math.random() * 300 // 400-700ms when enabled
        : 50 + Math.random() * 100 // 50-150ms when disabled

      cpuLoad.push({ timestamp, value: cpuLoadValue })
      trafficLoad.push({ timestamp, value: trafficLoadValue })
      responseTime.push({ timestamp, value: responseTimeValue })
    }

    return { cpuLoad, trafficLoad, responseTime }
  }
}