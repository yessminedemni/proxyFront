import { Injectable } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import type { Observable } from "rxjs"
import { tap } from "rxjs/operators"

interface Scenario {
  id: number
  name: string
  enabled: boolean
  details?: Record<string, string>
}

interface ScenarioResponse {
  success: boolean
  enabled: boolean
  message?: string
}

@Injectable({
  providedIn: "root",
})
export class AppScenarioService {
  private baseUrl = "http://localhost:8081/api/appscenarios"

  constructor(private http: HttpClient) {}

  getAllScenarios(): Observable<Scenario[]> {
    console.log("Getting all scenarios")
    return this.http
      .get<Scenario[]>(`${this.baseUrl}`)
      .pipe(tap((scenarios) => console.log("Received scenarios:", scenarios)))
  }

  toggleScenario(scenarioName: string): Observable<ScenarioResponse> {
    console.log(`Toggling scenario: ${scenarioName}`)
    return this.http
      .put<ScenarioResponse>(`${this.baseUrl}/toggle/${scenarioName}`, {})
      .pipe(tap((response) => console.log(`Toggle response for ${scenarioName}:`, response)))
  }

  getScenarioStatus(scenarioName: string): Observable<{ enabled: boolean }> {
    console.log(`Getting status for scenario: ${scenarioName}`)
    return this.http
      .get<{ enabled: boolean }>(`${this.baseUrl}/status/${scenarioName}`)
      .pipe(tap((status) => console.log(`Status for ${scenarioName}:`, status)))
  }

  configureReturn404(endpoint: string, enabled: boolean): Observable<any> {
    console.log(`Configuring Return404 for endpoint: ${endpoint}, enabled: ${enabled}`)
    const body = { endpoint: endpoint, enabled: enabled }
    return this.http
      .post(`${this.baseUrl}/return404`, body)
      .pipe(tap((response) => console.log(`Return404 configuration response:`, response)))
  }

  enableScenario(scenarioName: string): Observable<ScenarioResponse> {
    console.log(`Enabling scenario: ${scenarioName}`)
    return this.http
      .post<ScenarioResponse>(`${this.baseUrl}/enable/${scenarioName}`, {})
      .pipe(tap((response) => console.log(`Enable response for ${scenarioName}:`, response)))
  }

  disableScenario(scenarioName: string): Observable<ScenarioResponse> {
    console.log(`Disabling scenario: ${scenarioName}`)
    return this.http
      .post<ScenarioResponse>(`${this.baseUrl}/disable/${scenarioName}`, {})
      .pipe(tap((response) => console.log(`Disable response for ${scenarioName}:`, response)))
  }
}
