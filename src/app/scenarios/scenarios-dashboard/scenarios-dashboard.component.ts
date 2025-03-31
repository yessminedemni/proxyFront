import { Component, type OnInit, ViewChild, type ElementRef, type AfterViewInit } from "@angular/core"
import { type Observable, interval, of } from "rxjs"
import { switchMap, startWith, catchError } from "rxjs/operators"
import Chart from "chart.js/auto"
import { HttpClient } from '@angular/common/http';
import { CommonModule } from "@angular/common";


interface Scenario {
  name: string
  enabled: boolean
  description?: string
}

interface MetricData {
  timestamp: number
  value: number
}

interface ScenarioMetrics {
  packetLoss: MetricData[]
  latency: MetricData[]
  queryLoad: MetricData[]
}

@Component({
  selector: "app-scenarios-dashboard",
  templateUrl: "./scenarios-dashboard.component.html",
  styleUrls: ["./scenarios-dashboard.component.scss"],
  imports: [CommonModule],  // ✅ Add this

})
export class ScenariosDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild("packetLossChart") packetLossChartRef: ElementRef | undefined
  @ViewChild("latencyChart") latencyChartRef: ElementRef | undefined
  @ViewChild("queryLoadChart") queryLoadChartRef: ElementRef | undefined

  scenarios: Scenario[] = []
  loading = true
  error = ""
  refreshInterval = 5000 // 5 seconds

  // Charts
  packetLossChart: Chart | undefined
  latencyChart: Chart | undefined
  queryLoadChart: Chart
  // Metrics data
  | undefined

  // Metrics data
  metrics: ScenarioMetrics = {
    packetLoss: [],
    latency: [],
    queryLoad: [],
  }

  // Mock data for demonstration - in a real app, you'd get this from your backend
  mockMetricsEnabled = true

  // Descriptions for known scenarios
  scenarioDescriptions: Record<string, string> = {
    stress_testing: "Runs intensive database queries to test system performance under load",
    packet_loss: "Simulates network packet loss between client and server",
    latency_injection: "Adds artificial delay to database responses based on query type",
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Set up automatic refresh for scenarios
    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchScenarios()),
      )
      .subscribe({
        next: (data) => {
          this.scenarios = data.map((scenario) => ({
            ...scenario,
            description: this.scenarioDescriptions[scenario.name] || "No description available",
          }))
          this.loading = false
        },
        error: (err) => {
          this.error = "Failed to load scenarios: " + err.message
          this.loading = false
        },
      })

    // Set up automatic refresh for metrics
    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchMetrics()),
      )
      .subscribe({
        next: (data) => {
          this.updateMetrics(data)
          this.updateCharts()
        },
        error: (err) => {
          console.error("Failed to load metrics:", err)
        },
      })
  }

  ngAfterViewInit(): void {
    this.initializeCharts()
  }

  initializeCharts(): void {
    // Initialize Packet Loss Chart
    if (this.packetLossChartRef?.nativeElement) {
      this.packetLossChart = new Chart(this.packetLossChartRef.nativeElement, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Packet Loss Rate (%)",
              data: [],
              borderColor: "rgb(255, 99, 132)",
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
            },
          },
        },
      });
    }
  
    // Initialize Latency Chart
    if (this.latencyChartRef?.nativeElement) {
      this.latencyChart = new Chart(this.latencyChartRef.nativeElement, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Latency (ms)",
              data: [],
              borderColor: "rgb(54, 162, 235)",
              backgroundColor: "rgba(54, 162, 235, 0.2)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  
    // Initialize Query Load Chart
    if (this.queryLoadChartRef?.nativeElement) {
      this.queryLoadChart = new Chart(this.queryLoadChartRef.nativeElement, {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              label: "Query Load (queries/sec)",
              data: [],
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgb(75, 192, 192)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }
  

  updateCharts(): void {
    if (!this.packetLossChart || !this.latencyChart || !this.queryLoadChart) return

    // Update Packet Loss Chart
    this.packetLossChart.data.labels = this.metrics.packetLoss.map((item) =>
      new Date(item.timestamp).toLocaleTimeString(),
    )
    this.packetLossChart.data.datasets[0].data = this.metrics.packetLoss.map((item) => item.value)
    this.packetLossChart.update()

    // Update Latency Chart
    this.latencyChart.data.labels = this.metrics.latency.map((item) => new Date(item.timestamp).toLocaleTimeString())
    this.latencyChart.data.datasets[0].data = this.metrics.latency.map((item) => item.value)
    this.latencyChart.update()

    // Update Query Load Chart
    this.queryLoadChart.data.labels = this.metrics.queryLoad.map((item) =>
      new Date(item.timestamp).toLocaleTimeString(),
    )
    this.queryLoadChart.data.datasets[0].data = this.metrics.queryLoad.map((item) => item.value)
    this.queryLoadChart.update()
  }

  fetchScenarios(): Observable<Scenario[]> {
    return this.http.get<Scenario[]>("http://localhost:8081/api/scenarios").pipe(
      catchError((err) => {
        console.error("Error fetching scenarios:", err)
        return of([])
      }),
    )
  }

  fetchMetrics(): Observable<ScenarioMetrics> {
    // In a real application, you would fetch this data from your backend
    // For demonstration, we'll generate mock data
    if (this.mockMetricsEnabled) {
      return of(this.generateMockMetrics())
    }

    // Replace with actual API call when available
    return this.http.get<ScenarioMetrics>("http://localhost:8081/api/metrics").pipe(
      catchError((err) => {
        console.error("Error fetching metrics:", err)
        return of(this.generateEmptyMetrics())
      }),
    )
  }

  generateMockMetrics(): ScenarioMetrics {
    const now = Date.now()

    // Find if scenarios are enabled
    const packetLossEnabled = this.scenarios.find((s) => s.name === "packet_loss")?.enabled || false
    const latencyEnabled = this.scenarios.find((s) => s.name === "latency_injection")?.enabled || false
    const stressTestEnabled = this.scenarios.find((s) => s.name === "stress_testing")?.enabled || false

    // Generate realistic values based on scenario status
    const packetLossValue = packetLossEnabled ? Math.random() * 15 : 0
    const latencyValue = latencyEnabled ? 100 + Math.random() * 500 : 20 + Math.random() * 30
    const queryLoadValue = stressTestEnabled ? 50 + Math.random() * 100 : 5 + Math.random() * 15

    // Add new data points
    this.metrics.packetLoss.push({ timestamp: now, value: packetLossValue })
    this.metrics.latency.push({ timestamp: now, value: latencyValue })
    this.metrics.queryLoad.push({ timestamp: now, value: queryLoadValue })

    // Keep only the last 10 data points
    if (this.metrics.packetLoss.length > 10) {
      this.metrics.packetLoss.shift()
      this.metrics.latency.shift()
      this.metrics.queryLoad.shift()
    }

    return this.metrics
  }

  generateEmptyMetrics(): ScenarioMetrics {
    return {
      packetLoss: [],
      latency: [],
      queryLoad: [],
    }
  }

  updateMetrics(newMetrics: ScenarioMetrics): void {
    this.metrics = newMetrics
  }

  toggleScenario(scenario: Scenario): void {
    this.loading = true

    this.http.put<any>(`http://localhost:8081/api/scenarios/toggle/${scenario.name}`, {}).subscribe({
      next: (response) => {
        if (response.success) {
          scenario.enabled = response.enabled
        }
        this.loading = false
      },
      error: (err) => {
        this.error = `Failed to toggle scenario ${scenario.name}: ${err.message}`
        this.loading = false
      },
    })
  }

  enableScenario(scenario: Scenario): void {
    if (scenario.enabled) return

    this.loading = true
    this.http
      .post(`http://localhost:8081/api/scenarios/enable/${scenario.name}`, {}, { responseType: "text" })
      .subscribe({
        next: () => {
          scenario.enabled = true
          this.loading = false
        },
        error: (err) => {
          this.error = `Failed to enable scenario ${scenario.name}: ${err.message}`
          this.loading = false
        },
      })
  }

  disableScenario(scenario: Scenario): void {
    if (!scenario.enabled) return

    this.loading = true
    this.http
      .post(`http://localhost:8081/api/scenarios/disable/${scenario.name}`, {}, { responseType: "text" })
      .subscribe({
        next: () => {
          scenario.enabled = false
          this.loading = false
        },
        error: (err) => {
          this.error = `Failed to disable scenario ${scenario.name}: ${err.message}`
          this.loading = false
        },
      })
  }
}

