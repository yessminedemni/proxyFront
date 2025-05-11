import { Component, type OnInit, ViewChild, type ElementRef, type AfterViewInit } from "@angular/core"
import { type Observable, interval, of } from "rxjs"
import { switchMap, startWith, catchError } from "rxjs/operators"
import Chart from "chart.js/auto"
import {  HttpClient, HttpClientModule } from "@angular/common/http"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { RouterModule } from "@angular/router"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

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

interface ScenarioMetricInfo {
  id: string
  title: string
  description: string
  unit: string
  chartRef?: ElementRef
  chart?: Chart
  data: MetricData[]
  color: string
  detailedDescription?: string
  interpretation?: string
  recommendations?: string[]
  thresholds?: {
    warning: number
    critical: number
  }
  scenarioName: string
}

@Component({
  selector: "app-app-scenarios-dashboard-component",
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  templateUrl: "./app-scenarios-dashboard-component.component.html",
  styleUrl: "./app-scenarios-dashboard-component.component.scss",
})
export class AppScenariosDashboardComponentComponent implements OnInit, AfterViewInit {
getResponseTimeValue(): string|number {
throw new Error('Method not implemented.')
}
  @ViewChild("cpuLoadChart") cpuLoadChartRef: ElementRef | undefined
  @ViewChild("trafficLoadChart") trafficLoadChartRef: ElementRef | undefined
  @ViewChild("responseTimeChart") responseTimeChartRef: ElementRef | undefined

  appScenarios: AppScenario[] = []
  loading = true
  generatingPdf = false
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

  // Detailed metric information for PDF report
  scenarioMetricInfo: ScenarioMetricInfo[] = [
    {
      id: "cpuLoad",
      title: "CPU Load",
      description: "Current CPU utilization percentage",
      unit: "%",
      data: [],
      color: "rgb(255, 99, 132)",
      detailedDescription:
        "CPU Load represents the percentage of CPU resources being utilized by the application. High CPU load can indicate computation-intensive operations, inefficient code, or potential bottlenecks. The CPU Load scenario simulates high CPU utilization to test application behavior under stress.",
      interpretation:
        "CPU Load should generally stay below 70% for optimal performance. Sustained high CPU usage can lead to degraded application performance, increased response times, and potential system instability.",
      recommendations: [
        "Optimize CPU-intensive operations and algorithms",
        "Implement caching for frequently accessed data",
        "Consider asynchronous processing for CPU-bound tasks",
        "Scale horizontally by adding more instances if consistently high",
        "Implement rate limiting to prevent excessive CPU usage during peak times",
      ],
      thresholds: {
        warning: 70,
        critical: 90,
      },
      scenarioName: "cpu_load",
    },
    {
      id: "trafficLoad",
      title: "Traffic Load",
      description: "Number of requests per second",
      unit: " req/s",
      data: [],
      color: "rgb(75, 192, 192)",
      detailedDescription:
        "Traffic Load measures the number of requests processed by the application per second. The High Load scenario generates excessive traffic to test application resilience under high concurrency conditions. This metric helps identify potential bottlenecks in request handling and assess the application's capacity limits.",
      interpretation:
        "Traffic load capacity depends on your application's architecture and infrastructure. Consistently high traffic approaching your threshold may indicate the need for scaling or optimization. Sudden spikes can cause temporary degradation in performance.",
      recommendations: [
        "Implement proper load balancing across multiple instances",
        "Optimize database queries that might become bottlenecks under load",
        "Consider implementing a CDN for static content",
        "Use caching strategies to reduce backend load",
        "Set up auto-scaling based on traffic patterns",
      ],
      thresholds: {
        warning: 800,
        critical: 1200,
      },
      scenarioName: "high_load",
    },
    {
      id: "responseTime",
      title: "Response Time",
      description: "Average response time in milliseconds",
      unit: " ms",
      data: [],
      color: "rgb(54, 162, 235)",
      detailedDescription:
        "Response Time measures how long it takes for the application to process a request and return a response. The Return 404 scenario simulates error responses which can affect overall response times. This metric is critical for user experience as high response times directly impact perceived application performance.",
      interpretation:
        "Response times should ideally be below 200ms for optimal user experience. Times between 200-500ms are acceptable, while anything above 500ms may lead to user frustration. Response times over 1000ms significantly degrade user experience.",
      recommendations: [
        "Optimize slow database queries and add appropriate indexes",
        "Implement caching for frequently accessed data",
        "Consider using CDN for static assets",
        "Optimize server-side rendering or implement client-side rendering where appropriate",
        "Monitor and optimize third-party API calls that may impact response time",
      ],
      thresholds: {
        warning: 300,
        critical: 500,
      },
      scenarioName: "return_404",
    },
  ]

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
          this.updateLastUpdated()
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

      // Store chart reference in scenarioMetricInfo
      this.scenarioMetricInfo[0].chart = this.cpuLoadChart
      this.scenarioMetricInfo[0].chartRef = this.cpuLoadChartRef
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

      // Store chart reference in scenarioMetricInfo
      this.scenarioMetricInfo[1].chart = this.trafficLoadChart
      this.scenarioMetricInfo[1].chartRef = this.trafficLoadChartRef
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

      // Store chart reference in scenarioMetricInfo
      this.scenarioMetricInfo[2].chart = this.responseTimeChart
      this.scenarioMetricInfo[2].chartRef = this.responseTimeChartRef
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

    // Update scenarioMetricInfo data
    this.scenarioMetricInfo[0].data = this.metrics.cpuLoad

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

    // Update scenarioMetricInfo data
    this.scenarioMetricInfo[1].data = this.metrics.trafficLoad

    this.trafficLoadChart.update()

    // Update Response Time Chart
    this.responseTimeChart.data.labels = this.metrics.responseTime.map((item) => formatTime(item.timestamp))
    this.responseTimeChart.data.datasets[0].data = this.metrics.responseTime.map((item) => item.value)

    // Update scenarioMetricInfo data
    this.scenarioMetricInfo[2].data = this.metrics.responseTime

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
  }

  // Get the current value of a metric
  getCurrentMetricValue(metricInfo: ScenarioMetricInfo): number {
    if (metricInfo.data.length === 0) return 0
    return metricInfo.data[metricInfo.data.length - 1].value
  }

  // Get the trend of a metric
  getMetricTrend(metricInfo: ScenarioMetricInfo): string {
    const values = metricInfo.data.map((item) => item.value)
    if (values.length < 2) return "No trend data available"

    const lastFive = values.slice(-5)
    if (lastFive.length < 2) return "Insufficient data for trend analysis"

    // Calculate trend direction
    let increasing = 0
    let decreasing = 0

    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i - 1]) increasing++
      else if (lastFive[i] < lastFive[i - 1]) decreasing++
    }

    // Calculate average change
    const avgChange = (lastFive[lastFive.length - 1] - lastFive[0]) / (lastFive.length - 1)
    const changeRate = Math.abs(avgChange).toFixed(2)

    if (increasing > decreasing) {
      return `Increasing at ${changeRate}${metricInfo.unit} per interval`
    } else if (decreasing > increasing) {
      return `Decreasing at ${changeRate}${metricInfo.unit} per interval`
    } else {
      return "Stable - No significant change"
    }
  }

  // Get the status of a metric based on thresholds
  getMetricStatus(metricInfo: ScenarioMetricInfo): { status: string; color: number[] } {
    if (!metricInfo.thresholds) return { status: "Unknown", color: [128, 128, 128] }

    const currentValue = this.getCurrentMetricValue(metricInfo)

    if (currentValue >= metricInfo.thresholds.critical) {
      return { status: "Critical", color: [231, 76, 60] } // Red
    } else if (currentValue >= metricInfo.thresholds.warning) {
      return { status: "Warning", color: [243, 156, 18] } // Orange
    } else {
      return { status: "Normal", color: [46, 204, 113] } // Green
    }
  }

  // Get recommendations based on current status
  getMetricRecommendations(metricInfo: ScenarioMetricInfo): string[] {
    if (!metricInfo.recommendations) return ["No recommendations available"]

    const { status } = this.getMetricStatus(metricInfo)

    if (status === "Critical") {
      return metricInfo.recommendations
    } else if (status === "Warning") {
      return metricInfo.recommendations.slice(0, 3) // Return first three recommendations for warning state
    } else {
      return metricInfo.recommendations.slice(0, 2) // Return first two recommendations for normal state
    }
  }

  // Get scenario description by name
  getScenarioDescription(scenarioName: string): string {
    const scenario = this.appScenarios.find((s) => s.name === scenarioName)
    return scenario?.description || "No description available"
  }

  // Export PDF report
  exportPDF(): void {
    this.loading = true
    this.generatingPdf = true

    // Create a new jsPDF instance with professional settings
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    })

    // Add metadata to make the PDF more professional
    pdf.setProperties({
      title: "App Scenarios Report",
      subject: "Application Scenarios Performance Analysis",
      author: "App Scenarios Dashboard",
      keywords: "scenarios, performance, monitoring, analysis, testing",
      creator: "App Scenarios Dashboard Application",
    })

    // Set up page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15 // 15mm margins
    const contentWidth = pageWidth - margin * 2

    // Function to add a page header
    const addPageHeader = (pageNumber: number, totalPages: number) => {
      pdf.setFontSize(8)
      pdf.setTextColor(127, 140, 141) // Gray color
      pdf.text(`App Scenarios Report - Page ${pageNumber} of ${totalPages}`, pageWidth - margin, margin - 5, {
        align: "right",
      })
      pdf.setDrawColor(220, 220, 220)
      pdf.line(margin, margin - 2, pageWidth - margin, margin - 2)
    }

    // Function to add a page footer
    const addPageFooter = (pageNumber: number) => {
      const footerPosition = pageHeight - 10
      pdf.setFontSize(8)
      pdf.setTextColor(127, 140, 141)
      pdf.text("© App Scenarios Dashboard - For internal use only", margin, footerPosition)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerPosition, { align: "right" })
    }

    // Start with page 1
    let pageNumber = 1
    let totalPages = 1 // We'll update this later

    // Add cover page
    pdf.setFontSize(24)
    pdf.setTextColor(44, 62, 80)
    pdf.text("App Scenarios Dashboard", pageWidth / 2, 60, { align: "center" })
    pdf.setFontSize(16)
    pdf.text("Detailed Performance Report", pageWidth / 2, 70, { align: "center" })

    pdf.setFontSize(12)
    pdf.setTextColor(100, 100, 100)
    pdf.text(
      `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      pageWidth / 2,
      85,
      { align: "center" },
    )

    pdf.setFontSize(10)
    pdf.setTextColor(120, 120, 120)
    pdf.text("This report provides a comprehensive analysis of application scenarios", pageWidth / 2, 100, {
      align: "center",
    })
    pdf.text("including CPU load, traffic load, and response time metrics.", pageWidth / 2, 106, {
      align: "center",
    })

    // Add footer to cover page
    addPageFooter(pageNumber)

    // Add a new page for the executive summary
    pdf.addPage()
    pageNumber++
    addPageHeader(pageNumber, totalPages)

    // Executive Summary
    let yPosition = margin + 5
    pdf.setFontSize(16)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Executive Summary", margin, yPosition)
    yPosition += 10

    pdf.setFontSize(10)
    pdf.setTextColor(60, 60, 60)
    const summaryText =
      "This report provides a detailed analysis of application scenarios and their impact on system performance. The data presented here reflects the current state of your application under various test scenarios and highlights potential areas of concern or improvement. Regular monitoring of these metrics helps ensure optimal application performance and stability."

    // Split text into multiple lines
    const splitSummary = pdf.splitTextToSize(summaryText, contentWidth)
    pdf.text(splitSummary, margin, yPosition)
    yPosition += splitSummary.length * 5 + 5

    // Active Scenarios Overview
    pdf.setFontSize(14)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Active Scenarios Overview", margin, yPosition)
    yPosition += 8

    pdf.setFontSize(10)
    pdf.setTextColor(60, 60, 60)

    const cpuLoadActive = this.getScenarioState("cpu_load")
    const highLoadActive = this.getScenarioState("high_load")
    const return404Active = this.getScenarioState("return_404")

    pdf.text(`• CPU Load Scenario: ${cpuLoadActive ? "Active" : "Inactive"}`, margin + 3, yPosition)
    yPosition += 5
    pdf.text(`• High Traffic Load Scenario: ${highLoadActive ? "Active" : "Inactive"}`, margin + 3, yPosition)
    yPosition += 5
    pdf.text(`• Return 404 Scenario: ${return404Active ? "Active" : "Inactive"}`, margin + 3, yPosition)
    yPosition += 10

    // Key Metrics Overview
    pdf.setFontSize(14)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Key Metrics Overview", margin, yPosition)
    yPosition += 8

    // Create metric summary boxes
    const boxWidth = contentWidth / 3 - 4
    const boxHeight = 30

    // Draw metric boxes in a row
    this.scenarioMetricInfo.forEach((metricInfo, index) => {
      const currentValue = this.getCurrentMetricValue(metricInfo)
      const { status, color } = this.getMetricStatus(metricInfo)

      // Calculate box position
      const boxX = margin + index * (boxWidth + 4)

      // Draw box
      pdf.setFillColor(250, 250, 250)
      pdf.setDrawColor(220, 220, 220)
      pdf.roundedRect(boxX, yPosition, boxWidth, boxHeight, 2, 2, "FD")

      // Add metric title
      pdf.setFontSize(10)
      pdf.setTextColor(80, 80, 80)
      pdf.text(metricInfo.title, boxX + 5, yPosition + 8)

      // Add current value
      pdf.setFontSize(14)
      pdf.setTextColor(color[0], color[1], color[2])
      pdf.text(`${currentValue.toFixed(2)}${metricInfo.unit}`, boxX + 5, yPosition + 20)

      // Add status
      pdf.setFontSize(8)
      pdf.text(`Status: ${status}`, boxX + boxWidth - 40, yPosition + 20)
    })

    yPosition += boxHeight + 15

    // Add footer
    addPageFooter(pageNumber)

    // Process each metric with detailed information
    const processMetrics = async () => {
      for (const metricInfo of this.scenarioMetricInfo) {
        // Add a new page for each metric
        pdf.addPage()
        pageNumber++
        addPageHeader(pageNumber, totalPages)

        yPosition = margin + 5

        // Metric Title
        pdf.setFontSize(16)
        pdf.setTextColor(44, 62, 80)
        pdf.text(`${metricInfo.title} Analysis`, margin, yPosition)
        yPosition += 10

        // Current Value and Status
        const currentValue = this.getCurrentMetricValue(metricInfo)
        const { status, color } = this.getMetricStatus(metricInfo)

        pdf.setFontSize(12)
        pdf.setTextColor(80, 80, 80)
        pdf.text(`Current Value: ${currentValue.toFixed(2)}${metricInfo.unit} (Status: ${status})`, margin, yPosition)
        yPosition += 7

        // Scenario Status
        const scenarioActive = this.getScenarioState(metricInfo.scenarioName)
        pdf.text(`Scenario Status: ${scenarioActive ? "Active" : "Inactive"}`, margin, yPosition)
        yPosition += 7

        // Trend
        const trend = this.getMetricTrend(metricInfo)
        pdf.text(`Trend: ${trend}`, margin, yPosition)
        yPosition += 10

        // Description
        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        pdf.text("Description:", margin, yPosition)
        yPosition += 5

        const descriptionLines = pdf.splitTextToSize(
          metricInfo.detailedDescription || metricInfo.description,
          contentWidth,
        )
        pdf.text(descriptionLines, margin, yPosition)
        yPosition += descriptionLines.length * 5 + 5

        // Scenario Description
        const scenarioDescription = this.getScenarioDescription(metricInfo.scenarioName)
        pdf.text("Scenario Description:", margin, yPosition)
        yPosition += 5

        const scenarioDescLines = pdf.splitTextToSize(scenarioDescription, contentWidth)
        pdf.text(scenarioDescLines, margin, yPosition)
        yPosition += scenarioDescLines.length * 5 + 5

        // Interpretation
        if (metricInfo.interpretation) {
          pdf.setFontSize(10)
          pdf.setTextColor(60, 60, 60)
          pdf.text("Interpretation:", margin, yPosition)
          yPosition += 5

          const interpretationLines = pdf.splitTextToSize(metricInfo.interpretation, contentWidth)
          pdf.text(interpretationLines, margin, yPosition)
          yPosition += interpretationLines.length * 5 + 5
        }

        // Chart
        if (metricInfo.chart) {
          try {
            const chartRef = metricInfo.chart.canvas
            if (chartRef) {
              // Capture chart with proper scaling
              const canvas = await html2canvas(chartRef, {
                scale: 2, // Higher quality
                backgroundColor: "#ffffff",
                logging: false,
                useCORS: true,
                allowTaint: true,
              })

              // Calculate dimensions to fit on page while maintaining aspect ratio
              const imgWidth = contentWidth
              const ratio = canvas.height / canvas.width
              // Control the height to prevent overly large charts
              const imgHeight = Math.min(imgWidth * ratio, 60) // Max height of 60mm

              // Add chart image
              const imgData = canvas.toDataURL("image/png")
              pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight)

              // Update position for next section
              yPosition += imgHeight + 10
            }
          } catch (error) {
            console.error(`Error capturing ${metricInfo.title} chart:`, error)
            pdf.text(`Error rendering ${metricInfo.title} chart`, margin, yPosition)
            yPosition += 10
          }
        }

        // Thresholds
        if (metricInfo.thresholds) {
          pdf.setFontSize(12)
          pdf.setTextColor(44, 62, 80)
          pdf.text("Thresholds", margin, yPosition)
          yPosition += 7

          pdf.setFontSize(10)
          pdf.setTextColor(60, 60, 60)

          pdf.text(`• Warning: ${metricInfo.thresholds.warning}${metricInfo.unit}`, margin + 3, yPosition)
          yPosition += 5
          pdf.text(`• Critical: ${metricInfo.thresholds.critical}${metricInfo.unit}`, margin + 3, yPosition)
          yPosition += 10
        }

        // Impact Analysis
        pdf.setFontSize(12)
        pdf.setTextColor(44, 62, 80)
        pdf.text("Impact Analysis", margin, yPosition)
        yPosition += 7

        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)

        let impactText = ""
        if (metricInfo.id === "cpuLoad") {
          impactText =
            "High CPU load can lead to degraded application performance, increased response times, and potential system instability. It may affect all users of the application and can lead to service disruptions if not addressed."
        } else if (metricInfo.id === "trafficLoad") {
          impactText =
            "Excessive traffic load can overwhelm application resources, leading to increased response times, potential timeouts, and service degradation. It affects scalability and may require infrastructure adjustments."
        } else if (metricInfo.id === "responseTime") {
          impactText =
            "Increased response times directly impact user experience and satisfaction. Slow responses can lead to abandoned transactions, reduced user engagement, and potential business impact."
        }

        const impactLines = pdf.splitTextToSize(impactText, contentWidth)
        pdf.text(impactLines, margin, yPosition)
        yPosition += impactLines.length * 5 + 5

        // Recommendations
        if (metricInfo.recommendations && metricInfo.recommendations.length > 0) {
          pdf.setFontSize(12)
          pdf.setTextColor(44, 62, 80)
          pdf.text("Recommendations", margin, yPosition)
          yPosition += 7

          pdf.setFontSize(10)
          pdf.setTextColor(60, 60, 60)

          for (const recommendation of metricInfo.recommendations) {
            pdf.text(`• ${recommendation}`, margin + 3, yPosition)
            yPosition += 5
          }
        }

        // Add footer
        addPageFooter(pageNumber)
      }

      // Add a conclusion page
      pdf.addPage()
      pageNumber++
      addPageHeader(pageNumber, totalPages)

      yPosition = margin + 5

      // Conclusion
      pdf.setFontSize(16)
      pdf.setTextColor(44, 62, 80)
      pdf.text("Conclusion and Next Steps", margin, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      pdf.setTextColor(60, 60, 60)

      const conclusionText =
        "Based on the analysis of the current application scenarios and metrics, the system is performing within expected parameters. Regular monitoring and proactive testing are recommended to ensure optimal performance and prevent potential issues in production environments."

      const conclusionLines = pdf.splitTextToSize(conclusionText, contentWidth)
      pdf.text(conclusionLines, margin, yPosition)
      yPosition += conclusionLines.length * 5 + 10

      // Next Steps
      pdf.setFontSize(12)
      pdf.setTextColor(44, 62, 80)
      pdf.text("Recommended Next Steps", margin, yPosition)
      yPosition += 7

      pdf.setFontSize(10)
      pdf.setTextColor(60, 60, 60)

      const nextSteps = [
        "Schedule regular scenario testing to validate application resilience",
        "Implement automated alerting for critical metric thresholds",
        "Optimize application code based on the observed metrics",
        "Consider infrastructure scaling options for high traffic scenarios",
        "Establish regular performance testing and monitoring schedules",
        "Document baseline performance metrics for future comparison",
      ]

      for (const step of nextSteps) {
        pdf.text(`• ${step}`, margin + 3, yPosition)
        yPosition += 5
      }

      // Add footer
      addPageFooter(pageNumber)

      // Update total pages
      totalPages = pageNumber

      // Re-add headers with correct total pages
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        if (i > 1) {
          // Skip cover page
          addPageHeader(i, totalPages)
        }
      }

      // Save the PDF
      pdf.save("app-scenarios-detailed-report.pdf")
      this.loading = false
      this.generatingPdf = false
    }

    // Execute metric processing
    processMetrics()
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
