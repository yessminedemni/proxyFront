import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import { type Observable, of, throwError } from "rxjs"
import { catchError, delay, map, switchMap, tap } from "rxjs/operators"
import type { ChaosScenario } from "../models/chaos-scenario.model"

export interface MetricData {
  timestamp: number
  value: number
}

// Interface for ONLY the 6 DATABASE SCENARIOS
export interface DatabaseScenarioMetrics {
  // Database Scenarios metrics ONLY
  packetLoss: MetricData[]
  latency: MetricData[]
  queryLoad: MetricData[]
  queryBlackhole: MetricData[]
  connectionKill: MetricData[]
  diskFault: MetricData[]

  // Scenario states for DATABASE scenarios ONLY
  scenarioStates?: {
    packetLoss: boolean
    latencyInjection: boolean
    stressTesting: boolean
    queryBlackhole: boolean
    connectionKill: boolean
    diskFault: boolean
  }
}

@Injectable({
  providedIn: "root",
})
export class ChaosService {
  private apiUrl = "http://localhost:8081/api" // Your actual API endpoint
  private metricsUrl = "http://localhost:8081/api/metrics" // Metrics endpoint

  // Mapping between display names and backend scenario names for DATABASE scenarios
  private scenarioMapping = {
    "1": { name: "packet_loss", displayName: "Network Latency" },
    "2": { name: "latency_injection", displayName: "Database Latency" },
    "3": { name: "stress_testing", displayName: "Query Load Stress" },
    "4": { name: "query_blackhole", displayName: "Query Blackhole" },
    "5": { name: "connection_kill", displayName: "Connection Failures" },
    "6": { name: "disk_fault", displayName: "Disk Faults" },
  }

  // Track DATABASE scenario statuses locally for fallback
  private databaseScenarioStatuses = {
    packet_loss: false,
    latency_injection: false,
    stress_testing: false,
    query_blackhole: false,
    connection_kill: false,
    disk_fault: false,
  }

  // Use real data from backend
  private useRealData = true

  constructor(private http: HttpClient) {
    console.log("ChaosService initialized for DATABASE scenarios only")
  }

  // Get DATABASE scenario metrics from MetricsController
  getDatabaseMetrics(): Observable<DatabaseScenarioMetrics> {
    if (!this.useRealData) {
      return of(this.generateMockDatabaseMetrics())
    }

    return this.http.get<any>(this.metricsUrl).pipe(
      map((response) => {
        console.log("ChaosService - Full MetricsController response (12 metrics):", response)

        // Extract ONLY the 6 DATABASE SCENARIOS from the 12 metrics
        const databaseMetrics: DatabaseScenarioMetrics = {
          // Database Scenarios metrics ONLY
          packetLoss: response.packetLoss || [],
          latency: response.latency || [],
          queryLoad: response.queryLoad || [],
          queryBlackhole: response.queryBlackhole || [],
          connectionKill: response.connectionKill || [],
          diskFault: response.diskFault || [],

          // Scenario states for DATABASE scenarios ONLY
          scenarioStates: {
            packetLoss: response.scenarioStates?.packetLoss || false,
            latencyInjection: response.scenarioStates?.latencyInjection || false,
            stressTesting: response.scenarioStates?.stressTesting || false,
            queryBlackhole: response.scenarioStates?.queryBlackhole || false,
            connectionKill: response.scenarioStates?.connectionKill || false,
            diskFault: response.scenarioStates?.diskFault || false,
          },
        }

        console.log("ChaosService - Extracted DATABASE SCENARIOS (6 metrics only):", databaseMetrics)
        return databaseMetrics
      }),
      tap((metrics) => {
        console.log("ChaosService - Processed database metrics:", metrics)
        // Update local scenario statuses from backend response
        if (metrics.scenarioStates) {
          this.updateLocalDatabaseScenarioStatuses(metrics.scenarioStates)
        }
      }),
      catchError((error) => {
        console.error("ChaosService - Error fetching real database metrics, falling back to mock data:", error)
        return of(this.generateMockDatabaseMetrics())
      }),
    )
  }

  private updateLocalDatabaseScenarioStatuses(scenarioStates: any): void {
    this.databaseScenarioStatuses.packet_loss = scenarioStates.packetLoss || false
    this.databaseScenarioStatuses.latency_injection = scenarioStates.latencyInjection || false
    this.databaseScenarioStatuses.stress_testing = scenarioStates.stressTesting || false
    this.databaseScenarioStatuses.query_blackhole = scenarioStates.queryBlackhole || false
    this.databaseScenarioStatuses.connection_kill = scenarioStates.connectionKill || false
    this.databaseScenarioStatuses.disk_fault = scenarioStates.diskFault || false
  }

  generateMockDatabaseMetrics(): DatabaseScenarioMetrics {
    const now = Date.now()

    // Initialize DATABASE metric arrays ONLY
    const packetLoss: MetricData[] = []
    const latency: MetricData[] = []
    const queryLoad: MetricData[] = []
    const queryBlackhole: MetricData[] = []
    const connectionKill: MetricData[] = []
    const diskFault: MetricData[] = []

    // Generate 10 data points for each DATABASE metric
    for (let i = 0; i < 10; i++) {
      const timestamp = now - (9 - i) * 1000 // 1 second intervals

      // Database Scenarios metrics ONLY
      packetLoss.push({
        timestamp,
        value: this.databaseScenarioStatuses.packet_loss
          ? 5 + Math.random() * 10 // 5-15% when enabled
          : Math.random() * 0.5, // 0-0.5% when disabled
      })

      latency.push({
        timestamp,
        value: this.databaseScenarioStatuses.latency_injection
          ? 200 + Math.random() * 300 // 200-500ms when enabled
          : 20 + Math.random() * 50, // 20-70ms when disabled
      })

      queryLoad.push({
        timestamp,
        value: this.databaseScenarioStatuses.stress_testing
          ? 300 + Math.random() * 200 // 300-500 q/s when enabled
          : 50 + Math.random() * 100, // 50-150 q/s when disabled
      })

      queryBlackhole.push({
        timestamp,
        value: this.databaseScenarioStatuses.query_blackhole
          ? 20 + Math.random() * 30 // 20-50% when enabled
          : Math.random() * 0.5, // 0-0.5% when disabled
      })

      connectionKill.push({
        timestamp,
        value: this.databaseScenarioStatuses.connection_kill
          ? 15 + Math.random() * 25 // 15-40% when enabled
          : Math.random() * 0.5, // 0-0.5% when disabled
      })

      diskFault.push({
        timestamp,
        value: this.databaseScenarioStatuses.disk_fault
          ? 10 + Math.random() * 20 // 10-30% when enabled
          : Math.random() * 0.2, // 0-0.2% when disabled
      })
    }

    return {
      packetLoss,
      latency,
      queryLoad,
      queryBlackhole,
      connectionKill,
      diskFault,
      scenarioStates: {
        packetLoss: this.databaseScenarioStatuses.packet_loss,
        latencyInjection: this.databaseScenarioStatuses.latency_injection,
        stressTesting: this.databaseScenarioStatuses.stress_testing,
        queryBlackhole: this.databaseScenarioStatuses.query_blackhole,
        connectionKill: this.databaseScenarioStatuses.connection_kill,
        diskFault: this.databaseScenarioStatuses.disk_fault,
      },
    }
  }

  getScenarios(): Observable<ChaosScenario[]> {
    if (!this.useRealData) {
      return this.getMockScenarios()
    }

    // Get real scenario data from your backend
    return this.http.get<any[]>(`${this.apiUrl}/scenarios`).pipe(
      map((backendScenarios) => {
        // Transform backend data to ChaosScenario format
        return this.transformToDisplayFormat(backendScenarios)
      }),
      catchError((err) => {
        console.error("Error fetching real scenarios, falling back to mock:", err)
        return this.getMockScenarios()
      }),
    )
  }

  getScenarioById(id: string): Observable<ChaosScenario> {
    if (!this.useRealData) {
      return this.getMockScenarioById(id)
    }

    const mapping = this.scenarioMapping[id as keyof typeof this.scenarioMapping]
    if (!mapping) {
      return throwError(() => new Error("Scenario not found"))
    }

    return this.http.get<any>(`${this.apiUrl}/scenarios/status/${mapping.name}`).pipe(
      map((backendScenario) => this.transformSingleScenario(id, backendScenario)),
      catchError((err) => {
        console.error(`Error fetching scenario ${id}:`, err)
        return this.getMockScenarioById(id)
      }),
    )
  }

  updateScenario(scenario: ChaosScenario): Observable<ChaosScenario> {
    if (!this.useRealData) {
      return this.updateMockScenario(scenario)
    }

    const mapping = this.scenarioMapping[scenario.id as keyof typeof this.scenarioMapping]
    if (!mapping) {
      return throwError(() => new Error("Scenario not found"))
    }

    // Toggle the scenario on the backend
    const endpoint = scenario.enabled ? "enable" : "disable"
    return this.http.post<any>(`${this.apiUrl}/scenarios/${endpoint}/${mapping.name}`, {}).pipe(
      map(() => {
        // Return the updated scenario
        return { ...scenario, updatedAt: new Date() }
      }),
      catchError((err) => {
        console.error(`Error updating scenario ${scenario.id}:`, err)
        return throwError(() => new Error(`Failed to update scenario: ${err.message}`))
      }),
    )
  }

  // Toggle a specific scenario
  toggleScenario(scenarioId: string): Observable<ChaosScenario> {
    return this.getScenarioById(scenarioId).pipe(
      switchMap((scenario) => {
        const updatedScenario = { ...scenario, enabled: !scenario.enabled }
        return this.updateScenario(updatedScenario)
      }),
    )
  }

  // Get scenario status from backend
  getScenarioStatus(scenarioName: string): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>(`${this.apiUrl}/scenarios/status/${scenarioName}`).pipe(
      catchError((err) => {
        console.error(`Error getting scenario status for ${scenarioName}:`, err)
        return of({ enabled: false })
      }),
    )
  }

  private transformToDisplayFormat(backendScenarios: any[]): ChaosScenario[] {
    const displayScenarios: ChaosScenario[] = []

    // Create display scenarios based on mapping
    Object.entries(this.scenarioMapping).forEach(([id, mapping]) => {
      const backendScenario = backendScenarios.find((s) => s.name === mapping.name)
      const scenario = this.createDisplayScenario(id, mapping.displayName, backendScenario?.enabled || false)
      displayScenarios.push(scenario)
    })

    return displayScenarios
  }

  private transformSingleScenario(id: string, backendScenario: any): ChaosScenario {
    const mapping = this.scenarioMapping[id as keyof typeof this.scenarioMapping]
    return this.createDisplayScenario(id, mapping.displayName, backendScenario?.enabled || false)
  }

  private createDisplayScenario(id: string, displayName: string, enabled: boolean): ChaosScenario {
    const scenarioDetails = this.getScenarioDetails(id)

    return {
      id,
      name: displayName,
      description: scenarioDetails.description,
      category: scenarioDetails.category,
      enabled,
      details: scenarioDetails.details,
      severity: scenarioDetails.severity,
      updatedAt: new Date(),
    }
  }

  private getScenarioDetails(id: string) {
    const details = {
      "1": {
        description: "Introduces random network packet loss to simulate network issues",
        category: "Network",
        details: { "Loss Rate": "5-15%", "Affected Routes": "All database connections" },
        severity: "medium" as const,
      },
      "2": {
        description: "Adds artificial delay to database responses",
        category: "Database",
        details: { "Min Delay": "200ms", "Max Delay": "500ms", "Affected Queries": "All" },
        severity: "medium" as const,
      },
      "3": {
        description: "Runs intensive database queries to test system performance under load",
        category: "Database",
        details: { "Query Rate": "300-500 q/s", Duration: "Continuous" },
        severity: "high" as const,
      },
      "4": {
        description: "Simulates scenarios where queries are dropped or not processed",
        category: "Database",
        details: { "Drop Rate": "20-50%", "Affected Queries": "Random selection" },
        severity: "high" as const,
      },
      "5": {
        description: "Simulates database connection failures and terminations",
        category: "Database",
        details: { "Kill Rate": "15-40%", Recovery: "Automatic retry" },
        severity: "critical" as const,
      },
      "6": {
        description: "Simulates disk I/O errors and storage failures",
        category: "Storage",
        details: { "Fault Rate": "10-30%", "Affected Operations": "Read/Write" },
        severity: "high" as const,
      },
    }

    return (
      details[id as keyof typeof details] || {
        description: "Unknown database scenario",
        category: "Unknown",
        details: {},
        severity: "low" as const,
      }
    )
  }

  // Fallback mock methods
  private getMockScenarios(): Observable<ChaosScenario[]> {
    const mockScenarios: ChaosScenario[] = Object.entries(this.scenarioMapping).map(([id, mapping]) =>
      this.createDisplayScenario(id, mapping.displayName, false),
    )

    return of(mockScenarios).pipe(delay(800))
  }

  private getMockScenarioById(id: string): Observable<ChaosScenario> {
    const mapping = this.scenarioMapping[id as keyof typeof this.scenarioMapping]
    if (!mapping) {
      return throwError(() => new Error("Scenario not found"))
    }

    const scenario = this.createDisplayScenario(id, mapping.displayName, false)
    return of(scenario).pipe(delay(500))
  }

  private updateMockScenario(scenario: ChaosScenario): Observable<ChaosScenario> {
    return of({ ...scenario, updatedAt: new Date() }).pipe(delay(700))
  }

  // Control real/mock data mode
  setUseRealData(useReal: boolean): void {
    this.useRealData = useReal
    console.log(`ChaosService now using ${useReal ? "real" : "mock"} data`)
  }

  isUsingRealData(): boolean {
    return this.useRealData
  }

  private handleError(error: any) {
    console.error("ChaosService API error:", error)
    return throwError(() => new Error("Something went wrong. Please try again later."))
  }
}
