import { Component, type OnInit, ViewChild, type ElementRef, type AfterViewInit } from "@angular/core"
import { type Observable, interval, of } from "rxjs"
import { switchMap, startWith, catchError } from "rxjs/operators"
import Chart from "chart.js/auto"
import {  HttpClient, HttpClientModule } from "@angular/common/http"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { RouterModule } from "@angular/router"

interface AppScenario {
  id: number
  name: string
  enabled: boolean
  description?: string
  category?: string
  impact?: string
}

interface MetricData {
  timestamp: number
  value: number
}

interface AppScenarioMetrics {
  cpuLoad: MetricData[]
  trafficLoad: MetricData[]
  responseTime: MetricData[]
  scenarioStates?: {
    cpuLoad: boolean
    highLoad: boolean
    return404: boolean
  }
}

@Component({
  selector: 'app-app-scenarios-dashboard-component',
  imports: [CommonModule, HttpClientModule,FormsModule,RouterModule],
  templateUrl: './app-scenarios-dashboard-component.component.html',
  styleUrl: './app-scenarios-dashboard-component.component.scss'
})
export class AppScenariosDashboardComponentComponent {

  @ViewChild("cpuLoadChart") cpuLoadChartRef: ElementRef | undefined
  @ViewChild("trafficLoadChart") trafficLoadChartRef: ElementRef | undefined
  @ViewChild("responseTimeChart") responseTimeChartRef: ElementRef | undefined

  appScenarios: AppScenario[] = []
  loading = true
  error = ""
  refreshInterval = 1000 // 1 second
  searchTerm = ""

  // Charts
  cpuLoadChart: Chart | undefined
  trafficLoadChart: Chart | undefined
  responseTimeChart: Chart | undefined

  // Metrics data
  metrics: AppScenarioMetrics = {
    cpuLoad: [],
    trafficLoad: [],
    responseTime: [],
    scenarioStates: {
      cpuLoad: false,
      highLoad: false,
      return404: false,
    },
  }

  // Thresholds for metrics
  thresholds = {
    cpuLoad: 80, // 80% CPU load is concerning
    trafficLoad: 1000, // 1000 requests/sec is high load
    responseTime: 500, // 500ms response time threshold
  }

  // Mock data for demonstration - in a real app, you'd get this from your backend
  mockMetricsEnabled = false // Changed to false to use the backend API
  lastUpdated: Date | null = null

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.updateLastUpdated()

    // Set up automatic refresh for app scenarios
    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchAppScenarios()),
      )
      .subscribe({
        next: (data) => {
          this.appScenarios = data
          this.loading = false
        },
        error: (err) => {
          this.error = "Failed to load app scenarios: " + err.message
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
    this.lastUpdated = new Date()
  }

  refreshData(): void {
    this.loading = true
    setTimeout(() => {
      this.loading = false
      this.updateLastUpdated()
    }, 1500)
  }

  ngAfterViewInit(): void {
    this.initializeCharts()
  }

  // Get the latest value for a specific metric
  getLatestMetricValue(metricName: keyof AppScenarioMetrics): number {
    const metricData = this.metrics[metricName] as MetricData[]
    if (!metricData || metricData.length === 0) return 0
    return metricData[metricData.length - 1].value
  }

  // Get scenario state directly from metrics data
  getScenarioState(scenarioType: string): boolean {
    if (!this.metrics.scenarioStates) return false

    switch (scenarioType) {
      case "cpu_load":
        return this.metrics.scenarioStates.cpuLoad
      case "high_load":
        return this.metrics.scenarioStates.highLoad
      case "return_404":
        return this.metrics.scenarioStates.return404
      default:
        return false
    }
  }

  matchesSearch(label: string): boolean {
    return label.toLowerCase().includes(this.searchTerm.toLowerCase())
  }

  initializeCharts(): void {
    // Initialize CPU Load Chart
    if (this.cpuLoadChartRef?.nativeElement) {
      this.cpuLoadChart = new Chart(this.cpuLoadChartRef.nativeElement, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "CPU Load (%)",
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
                label: (context) => `CPU Load: ${context.parsed.y.toFixed(2)}%`,
                title: (context) => context[0].label,
                afterLabel: (context) => {
                  // Use the scenario state from metrics data
                  const isEnabled = this.getScenarioState("cpu_load")
                  return `Scenario: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "CPU Load",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100, // CPU load percentage
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
                text: "CPU Load (%)",
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

    // Initialize Traffic Load Chart
    if (this.trafficLoadChartRef?.nativeElement) {
      this.trafficLoadChart = new Chart(this.trafficLoadChartRef.nativeElement, {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              label: "Traffic Load (requests/sec)",
              data: [],
              backgroundColor: (context) => {
                const value = context.raw as number
                return value > this.thresholds.trafficLoad ? "rgba(255, 99, 132, 0.7)" : "rgba(75, 192, 192, 0.7)"
              },
              borderColor: (context) => {
                const value = context.raw as number
                return value > this.thresholds.trafficLoad ? "rgb(255, 99, 132)" : "rgb(75, 192, 192)"
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
                label: (context) => `Requests: ${context.parsed.y.toFixed(0)}/sec`,
                afterLabel: (context) => {
                  // Use the scenario state from metrics data
                  const isEnabled = this.getScenarioState("high_load")
                  return `Scenario: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "Traffic Load",
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
                callback: (value) => value + " req/s",
              },
              title: {
                display: true,
                text: "Requests per Second",
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

    // Initialize Response Time Chart
    if (this.responseTimeChartRef?.nativeElement) {
      this.responseTimeChart = new Chart(this.responseTimeChartRef.nativeElement, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Response Time (ms)",
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
                  // Use the scenario state from metrics data
                  const isEnabled = this.getScenarioState("return_404")
                  return `Scenario: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "Response Time",
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
  }

  updateCharts(): void {
    if (!this.cpuLoadChart || !this.trafficLoadChart || !this.responseTimeChart) return

    // Format time labels for better readability
    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    }

    // Update CPU Load Chart
    this.cpuLoadChart.data.labels = this.metrics.cpuLoad.map((item) => formatTime(item.timestamp))
    this.cpuLoadChart.data.datasets[0].data = this.metrics.cpuLoad.map((item) => item.value)

    // Update chart colors based on scenario state
    const cpuLoadEnabled = this.getScenarioState("cpu_load")
    if (cpuLoadEnabled) {
      this.cpuLoadChart.data.datasets[0].borderColor = "rgb(255, 99, 132)"
      this.cpuLoadChart.data.datasets[0].backgroundColor = "rgba(255, 99, 132, 0.2)"
    } else {
      this.cpuLoadChart.data.datasets[0].borderColor = "rgb(75, 192, 192)"
      this.cpuLoadChart.data.datasets[0].backgroundColor = "rgba(75, 192, 192, 0.2)"
    }
    this.cpuLoadChart.update()

    // Update Traffic Load Chart
    this.trafficLoadChart.data.labels = this.metrics.trafficLoad.map((item) => formatTime(item.timestamp))
    this.trafficLoadChart.data.datasets[0].data = this.metrics.trafficLoad.map((item) => item.value)
    this.trafficLoadChart.update()

    // Update Response Time Chart
    this.responseTimeChart.data.labels = this.metrics.responseTime.map((item) => formatTime(item.timestamp))
    this.responseTimeChart.data.datasets[0].data = this.metrics.responseTime.map((item) => item.value)

    // Update chart colors based on scenario state
    const return404Enabled = this.getScenarioState("return_404")
    if (return404Enabled) {
      this.responseTimeChart.data.datasets[0].borderColor = "rgb(255, 159, 64)"
      this.responseTimeChart.data.datasets[0].backgroundColor = "rgba(255, 159, 64, 0.2)"
    } else {
      this.responseTimeChart.data.datasets[0].borderColor = "rgb(54, 162, 235)"
      this.responseTimeChart.data.datasets[0].backgroundColor = "rgba(54, 162, 235, 0.2)"
    }
    this.responseTimeChart.update()
  }

  fetchAppScenarios(): Observable<AppScenario[]> {
    return this.http.get<AppScenario[]>("http://localhost:8081/api/appscenarios").pipe(
      catchError((err) => {
        console.error("Error fetching app scenarios:", err)
        return of([
          {
            id: 1,
            name: "return_404",
            enabled: false,
            description: "Returns HTTP 404 status code for configured endpoints",
            category: "Network",
            impact: "High",
          },
          {
            id: 2,
            name: "cpu_load",
            enabled: false,
            description: "Simulates high CPU load for stress testing",
            category: "Performance",
            impact: "High",
          },
          {
            id: 3,
            name: "high_load",
            enabled: false,
            description: "Generates excessive traffic to test application resilience",
            category: "Performance",
            impact: "Critical",
          },
        ])
      }),
    )
  }

  fetchMetrics(): Observable<AppScenarioMetrics> {
    // In a real application, you would fetch this data from your backend
    if (this.mockMetricsEnabled) {
      return of(this.generateMockMetrics())
    }

    // Use the actual API call
    return this.http.get<AppScenarioMetrics>("http://localhost:8081/api/metrics").pipe(
      catchError((err) => {
        console.error("Error fetching metrics:", err)
        return of(this.generateEmptyMetrics())
      }),
    )
  }

  generateMockMetrics(): AppScenarioMetrics {
    const now = Date.now()

    // Find if scenarios are enabled
    const cpuLoadEnabled = this.appScenarios.find((s) => s.name === "cpu_load")?.enabled || false
    const highLoadEnabled = this.appScenarios.find((s) => s.name === "high_load")?.enabled || false
    const return404Enabled = this.appScenarios.find((s) => s.name === "return_404")?.enabled || false

    // Generate realistic values based on scenario status
    const cpuLoadValue = cpuLoadEnabled
      ? 70 + Math.random() * 25 // 70-95% when enabled
      : 10 + Math.random() * 20 // 10-30% when disabled

    const trafficLoadValue = highLoadEnabled
      ? 800 + Math.random() * 600 // 800-1400 req/s when enabled
      : 100 + Math.random() * 200 // 100-300 req/s when disabled

    const responseTimeValue = return404Enabled
      ? 400 + Math.random() * 300 // 400-700ms when enabled
      : 50 + Math.random() * 100 // 50-150ms when disabled

    // Add new data points
    this.metrics.cpuLoad.push({ timestamp: now, value: cpuLoadValue })
    this.metrics.trafficLoad.push({ timestamp: now, value: trafficLoadValue })
    this.metrics.responseTime.push({ timestamp: now, value: responseTimeValue })

    // Keep only the last 10 data points
    if (this.metrics.cpuLoad.length > 10) {
      this.metrics.cpuLoad.shift()
      this.metrics.trafficLoad.shift()
      this.metrics.responseTime.shift()
    }

    // Update scenario states
    this.metrics.scenarioStates = {
      cpuLoad: cpuLoadEnabled,
      highLoad: highLoadEnabled,
      return404: return404Enabled,
    }

    return this.metrics
  }

  generateEmptyMetrics(): AppScenarioMetrics {
    return {
      cpuLoad: [],
      trafficLoad: [],
      responseTime: [],
      scenarioStates: {
        cpuLoad: false,
        highLoad: false,
        return404: false,
      },
    }
  }

  updateMetrics(newMetrics: AppScenarioMetrics): void {
    this.metrics = newMetrics

    // If we received metrics but no scenario states, try to get them from appScenarios
    if (!this.metrics.scenarioStates) {
      this.metrics.scenarioStates = {
        cpuLoad: this.appScenarios.find((s) => s.name === "cpu_load")?.enabled || false,
        highLoad: this.appScenarios.find((s) => s.name === "high_load")?.enabled || false,
        return404: this.appScenarios.find((s) => s.name === "return_404")?.enabled || false,
      }
    }

    console.log("Updated metrics with scenario states:", this.metrics.scenarioStates)
  }

  /**
   * Returns the appropriate Font Awesome icon class based on scenario type
   */
  getScenarioIcon(scenario: AppScenario | null = null): string {
    // If no scenario is provided, use the first one in appScenarios
    const targetScenario = scenario || (this.appScenarios && this.appScenarios.length > 0 ? this.appScenarios[0] : null)

    if (!targetScenario) return "fa-cogs" // Default fallback icon

    // Determine icon based on scenario name/type
    switch (targetScenario.name) {
      case "return_404":
        return "fa-exclamation-circle"
      case "cpu_load":
        return "fa-microchip"
      case "high_load":
        return "fa-server"
      default:
        // If no specific match, try to determine by category
        return this.getCategoryIconByName(targetScenario.category)
    }
  }

  /**
   * Returns the appropriate Font Awesome icon class based on category
   */
  getCategoryIcon(scenario: AppScenario | null = null): string {
    // If no scenario is provided, use the first one in appScenarios
    const targetScenario = scenario || (this.appScenarios && this.appScenarios.length > 0 ? this.appScenarios[0] : null)

    if (!targetScenario) return "fa-folder" // Default fallback icon

    return this.getCategoryIconByName(targetScenario.category)
  }

  /**
   * Helper method to get icon by category name
   */
  private getCategoryIconByName(category?: string): string {
    if (!category) return "fa-folder"

    switch (category.toLowerCase()) {
      case "network":
        return "fa-network-wired"
      case "performance":
        return "fa-tachometer-alt"
      case "database":
        return "fa-database"
      case "security":
        return "fa-shield-alt"
      case "resilience":
        return "fa-bomb"
      default:
        return "fa-folder"
    }
  }

  /**
   * Returns the appropriate CSS class for impact level
   */
  getImpactClass(scenario: AppScenario | null = null): string {
    // If no scenario is provided, use the first one in appScenarios
    const targetScenario = scenario || (this.appScenarios && this.appScenarios.length > 0 ? this.appScenarios[0] : null)

    if (!targetScenario || !targetScenario.impact) return ""

    switch (targetScenario.impact.toLowerCase()) {
      case "low":
        return "impact-low"
      case "medium":
        return "impact-medium"
      case "high":
        return "impact-high"
      case "critical":
        return "impact-critical"
      default:
        return ""
    }
  }
}
