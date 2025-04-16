import { Component, type OnInit, ViewChild, type ElementRef, type AfterViewInit } from "@angular/core"
import { type Observable, interval, of } from "rxjs"
import { switchMap, startWith, catchError } from "rxjs/operators"
import Chart from "chart.js/auto"
import {  HttpClient, HttpClientModule } from "@angular/common/http"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { RouterModule } from "@angular/router"

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
  imports: [CommonModule, HttpClientModule,FormsModule,RouterModule],
  standalone: true,
})
export class ScenariosDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild("packetLossChart") packetLossChartRef: ElementRef | undefined
  @ViewChild("latencyChart") latencyChartRef: ElementRef | undefined
  @ViewChild("queryLoadChart") queryLoadChartRef: ElementRef | undefined

  scenarios: Scenario[] = []
  loading = true
  error = ""
  refreshInterval = 1000 // 5 seconds
  activeTab = "metrics" //
  searchTerm: string = '';
  

  // Charts
  packetLossChart: Chart | undefined
  latencyChart: Chart | undefined
  queryLoadChart: Chart | undefined

  // Metrics data
  metrics: ScenarioMetrics = {
    packetLoss: [],
    latency: [],
    queryLoad: [],
  }
  

  // Thresholds for metrics
  thresholds = {
    packetLoss: 5, // 5% packet loss is concerning
    latency: 200, // 200ms latency threshold
    queryLoad: 50, // 50 queries/sec is high load
  }

  // Mock data for demonstration - in a real app, you'd get this from your backend
  mockMetricsEnabled = true

  // Descriptions for known scenarios
  scenarioDescriptions: Record<string, string> = {
    stress_testing: "Runs intensive database queries to test system performance under load",
    packet_loss: "Simulates network packet loss between client and server",
    latency_injection: "Adds artificial delay to database responses based on query type",
  }
  lastUpdated: Date | null = null; // Declare and initialize lastUpdated

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.updateLastUpdated();

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
  updateLastUpdated(): void {
    this.lastUpdated = new Date();
  }

  // You'll likely call this method whenever your data is refreshed
  refreshData(): void {
    this.loading = true;
    // ... your logic to fetch or update data
    setTimeout(() => {
      this.loading = false;
      this.updateLastUpdated(); // Update the timestamp after successful refresh
      // ... process your data
    }, 1500); // Example delay
  }

  ngAfterViewInit(): void {
    this.initializeCharts()
  }

  // Get the latest value for a specific metric
  getLatestMetricValue(metricName: keyof ScenarioMetrics): number {
    const metricData = this.metrics[metricName]
    if (metricData.length === 0) return 0
    return metricData[metricData.length - 1].value
  }
  
  matchesSearch(label: string): boolean {
    return label.toLowerCase().includes(this.searchTerm.toLowerCase());
  }
  
  

  initializeCharts(): void {
    // Initialize Packet Loss Chart with enhanced configuration
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
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: "rgb(255, 99, 132)",
              pointBorderColor: "#fff",
              pointHoverRadius: 6,
              pointHoverBackgroundColor: "rgb(255, 99, 132)",
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                boxWidth: 12,
                usePointStyle: true,
                pointStyle: "circle",
                font: {
                  size: 12,
                },
              },
            },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              titleColor: "#333",
              bodyColor: "#666",
              borderColor: "#e0e0e0",
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              callbacks: {
                label: (context) => `Packet Loss: ${context.parsed.y.toFixed(2)}%`,
                title: (context) => context[0].label,
                afterLabel: (context) => {
                  const isEnabled = this.scenarios.find((s) => s.name === "packet_loss")?.enabled
                  return `Scenario: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "Network Packet Loss",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 20, // More realistic max for packet loss percentage
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
              ticks: {
                color: "#666",
                font: {
                  size: 11,
                },
                callback: (value) => value + "%",
              },
              title: {
                display: true,
                text: "Loss Rate (%)",
                color: "#666",
                font: {
                  size: 12,
                  weight: "normal",
                },
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: "#666",
                font: {
                  size: 11,
                },
                maxRotation: 0,
              },
              title: {
                display: true,
                text: "Time",
                color: "#666",
                font: {
                  size: 12,
                  weight: "normal",
                },
              },
            },
          },
          interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
          },
          animations: {
            tension: {
              duration: 1000,
              easing: "linear",
            },
          },
          elements: {
            line: {
              borderWidth: 2,
            },
          },
        },
      })
    }

    // Initialize Latency Chart with enhanced configuration
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
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: "rgb(54, 162, 235)",
              pointBorderColor: "#fff",
              pointHoverRadius: 6,
              pointHoverBackgroundColor: "rgb(54, 162, 235)",
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                boxWidth: 12,
                usePointStyle: true,
                pointStyle: "circle",
                font: {
                  size: 12,
                },
              },
            },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              titleColor: "#333",
              bodyColor: "#666",
              borderColor: "#e0e0e0",
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              callbacks: {
                label: (context) => `Response Time: ${context.parsed.y.toFixed(0)} ms`,
                afterLabel: (context) => {
                  const isEnabled = this.scenarios.find((s) => s.name === "latency_injection")?.enabled
                  return `Scenario: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "Database Response Latency",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
              ticks: {
                color: "#666",
                font: {
                  size: 11,
                },
                callback: (value) => value + " ms",
              },
              title: {
                display: true,
                text: "Response Time (ms)",
                color: "#666",
                font: {
                  size: 12,
                  weight: "normal",
                },
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: "#666",
                font: {
                  size: 11,
                },
                maxRotation: 0,
              },
              title: {
                display: true,
                text: "Time",
                color: "#666",
                font: {
                  size: 12,
                  weight: "normal",
                },
              },
            },
          },
          interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
          },
          animations: {
            tension: {
              duration: 1000,
              easing: "linear",
            },
          },
          elements: {
            line: {
              borderWidth: 2,
            },
          },
        },
      })
    }

    // Initialize Query Load Chart with enhanced configuration
    if (this.queryLoadChartRef?.nativeElement) {
      this.queryLoadChart = new Chart(this.queryLoadChartRef.nativeElement, {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              label: "Query Load (queries/sec)",
              data: [],
              backgroundColor: (context) => {
                const value = context.raw as number
                return value > this.thresholds.queryLoad
                  ? "rgba(255, 99, 132, 0.7)"
                  : // Red for high load
                    "rgba(75, 192, 192, 0.7)" // Normal color
              },
              borderColor: (context) => {
                const value = context.raw as number
                return value > this.thresholds.queryLoad
                  ? "rgb(255, 99, 132)"
                  : // Red for high load
                    "rgb(75, 192, 192)" // Normal color
              },
              borderWidth: 1,
              borderRadius: 4,
              hoverBackgroundColor: "rgba(75, 192, 192, 0.9)",
              barThickness: "flex",
              maxBarThickness: 30,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: {
                boxWidth: 12,
                usePointStyle: true,
                pointStyle: "rect",
                font: {
                  size: 12,
                },
              },
            },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              titleColor: "#333",
              bodyColor: "#666",
              borderColor: "#e0e0e0",
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              callbacks: {
                label: (context) => `Queries: ${context.parsed.y.toFixed(0)}/sec`,
                afterLabel: (context) => {
                  const isEnabled = this.scenarios.find((s) => s.name === "stress_testing")?.enabled
                  return `Scenario: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "Database Query Load",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
              ticks: {
                color: "#666",
                font: {
                  size: 11,
                },
                callback: (value) => value + " q/s",
              },
              title: {
                display: true,
                text: "Queries per Second",
                color: "#666",
                font: {
                  size: 12,
                  weight: "normal",
                },
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: "#666",
                font: {
                  size: 11,
                },
                maxRotation: 0,
              },
              title: {
                display: true,
                text: "Time",
                color: "#666",
                font: {
                  size: 12,
                  weight: "normal",
                },
              },
            },
          },
          animation: {
            duration: 1000,
          },
        },
      })
    }
  }

  updateCharts(): void {
    if (!this.packetLossChart || !this.latencyChart || !this.queryLoadChart) return

    // Format time labels for better readability
    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    }

    // Update Packet Loss Chart
    this.packetLossChart.data.labels = this.metrics.packetLoss.map((item) => formatTime(item.timestamp))
    this.packetLossChart.data.datasets[0].data = this.metrics.packetLoss.map((item) => item.value)
    this.packetLossChart.update()

    // Update Latency Chart
    this.latencyChart.data.labels = this.metrics.latency.map((item) => formatTime(item.timestamp))
    this.latencyChart.data.datasets[0].data = this.metrics.latency.map((item) => item.value)
    this.latencyChart.update()

    // Update Query Load Chart
    this.queryLoadChart.data.labels = this.metrics.queryLoad.map((item) => formatTime(item.timestamp))
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
    // FIXED: Make the difference more pronounced between enabled and disabled states
    const packetLossValue = packetLossEnabled
      ? 3 + Math.random() * 12 // 3-15% when enabled
      : Math.random() * 0.5 // 0-0.5% when disabled (much lower)

    const latencyValue = latencyEnabled
      ? 150 + Math.random() * 450 // 150-600ms when enabled
      : 10 + Math.random() * 15 // 10-25ms when disabled (much lower)

    const queryLoadValue = stressTestEnabled
      ? 40 + Math.random() * 80 // 40-120 q/s when enabled
      : 2 + Math.random() * 8 // 2-10 q/s when disabled (much lower)

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