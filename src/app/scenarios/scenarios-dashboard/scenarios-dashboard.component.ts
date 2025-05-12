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

interface Scenario {
  id: number
  name: string
  originalName: string
  enabled: boolean
  description: string
}

interface MetricData {
  timestamp: number
  value: number
}

interface ScenarioMetrics {
  packetLoss: MetricData[]
  latency: MetricData[]
  queryLoad: MetricData[]
  queryBlackhole: MetricData[]
  connectionKill: MetricData[]
  diskFault: MetricData[]
}

@Component({
  selector: "app-scenarios-dashboard",
  templateUrl: "./scenarios-dashboard.component.html",
  styleUrls: ["./scenarios-dashboard.component.scss"],
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  standalone: true,
})
export class ScenariosDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild("packetLossChart") packetLossChartRef: ElementRef | undefined
  @ViewChild("latencyChart") latencyChartRef: ElementRef | undefined
  @ViewChild("queryLoadChart") queryLoadChartRef: ElementRef | undefined
  @ViewChild("queryBlackholeChart") queryBlackholeChartRef: ElementRef | undefined
  @ViewChild("connectionKillChart") connectionKillChartRef: ElementRef | undefined
  @ViewChild("diskFaultChart") diskFaultChartRef: ElementRef | undefined

  scenarios: Scenario[] = []
  loading = true
  error = ""
  refreshInterval = 1000 // 1 second
  activeTab = "metrics"
  searchTerm = ""

  // Charts
  packetLossChart: Chart | undefined
  latencyChart: Chart | undefined
  queryLoadChart: Chart | undefined
  queryBlackholeChart: Chart | undefined
  connectionKillChart: Chart | undefined
  diskFaultChart: Chart | undefined

  // Metrics data
  metrics: ScenarioMetrics = {
    packetLoss: [],
    latency: [],
    queryLoad: [],
    queryBlackhole: [],
    connectionKill: [],
    diskFault: []
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
    query_blackhole: "Simulates scenarios where queries are dropped or not processed",
    connection_kill: "Simulates database connection failures and terminations",
    disk_fault: "Simulates disk I/O errors and storage failures"
  }
  lastUpdated: Date | null = null

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Initialize scenarios array with proper mapping
    this.scenarios = [
      {
        id: 1,
        name: "Packet Loss",
        originalName: "packet_loss",
        enabled: false,
        description: "Simulates network packet loss between client and server"
      },
      {
        id: 2,
        name: "Latency",
        originalName: "latency_injection",
        enabled: false,
        description: "Adds artificial delay to database responses"
      },
      {
        id: 3,
        name: "Query Load",
        originalName: "stress_testing",
        enabled: false,
        description: "Runs intensive database queries to test system performance"
      },
      {
        id: 4,
        name: "Query Blackhole",
        originalName: "query_blackhole",
        enabled: false,
        description: "Simulates scenarios where queries are dropped or not processed"
      },
      {
        id: 5,
        name: "Connection Kill",
        originalName: "connection_kill",
        enabled: false,
        description: "Simulates database connection failures and terminations"
      },
      {
        id: 6,
        name: "Disk Fault",
        originalName: "disk_fault",
        enabled: false,
        description: "Simulates disk I/O errors and storage failures"
      }
    ];

    // Start polling for metrics and scenario states
    this.startPolling();
  }

  updateLastUpdated(): void {
    this.lastUpdated = new Date()
  }

  refreshData(): void {
    this.loading = true
    console.log('Refreshing data...')
    
    // Fetch scenarios and metrics
    this.fetchScenarios().subscribe({
      next: (data) => {
        this.scenarios = data.map((scenario) => ({
          ...scenario,
          description: this.scenarioDescriptions[scenario.name] || "No description available",
        }))
        console.log('Updated scenarios:', this.scenarios)

        // Check states of new scenarios
        this.checkScenarioState('disk_fault')
        this.checkScenarioState('query_blackhole')
        this.checkScenarioState('connection_kill')

        // After scenarios are loaded, fetch metrics
        this.fetchMetrics().subscribe({
          next: (metricsData) => {
            this.updateMetrics(metricsData)
            this.updateCharts()
            this.loading = false
            this.updateLastUpdated()
          },
          error: (err) => {
            console.error("Failed to load metrics:", err)
            this.loading = false
          },
        })
      },
      error: (err) => {
        this.error = "Failed to load scenarios: " + err.message
        this.loading = false
      },
    })
  }

  ngAfterViewInit(): void {
    this.initializeCharts()
  }

  getLatestMetricValue(metricName: keyof ScenarioMetrics): number {
    const metricData = this.metrics[metricName]
    if (metricData.length === 0) return 0
    return metricData[metricData.length - 1].value
  }

  matchesSearch(label: string): boolean {
    return label.toLowerCase().includes(this.searchTerm.toLowerCase())
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "packet_loss")?.enabled
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "latency_injection")?.enabled
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`
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
              backgroundColor: (context) => {
                const value = context.raw as number
                return value > this.thresholds.queryLoad ? "rgba(255, 99, 132, 0.7)" : "rgba(75, 192, 192, 0.7)"
              },
              borderColor: (context) => {
                const value = context.raw as number
                return value > this.thresholds.queryLoad ? "rgb(255, 99, 132)" : "rgb(75, 192, 192)"
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "stress_testing")?.enabled
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`
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

    // Initialize Query Blackhole Chart
    if (this.queryBlackholeChartRef?.nativeElement) {
      this.queryBlackholeChart = new Chart(this.queryBlackholeChartRef.nativeElement, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Query Blackhole Rate (%)",
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
                label: (context) => `Query Blackhole: ${context.parsed.y.toFixed(2)}%`,
                title: (context) => context[0].label,
                afterLabel: (context) => {
                  const isEnabled = this.scenarios.find((s) => s.originalName === "query_blackhole")?.enabled
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "Query Blackhole Rate",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
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
                text: "Query Blackhole Rate (%)",
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

    // Initialize Connection Kill Chart
    if (this.connectionKillChartRef?.nativeElement) {
      this.connectionKillChart = new Chart(this.connectionKillChartRef.nativeElement, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Connection Kill Rate (%)",
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
                label: (context) => `Connection Kill: ${context.parsed.y.toFixed(2)}%`,
                title: (context) => context[0].label,
                afterLabel: (context) => {
                  const isEnabled = this.scenarios.find((s) => s.originalName === "connection_kill")?.enabled
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "Connection Kill Rate",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
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
                text: "Connection Kill Rate (%)",
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

    // Initialize Disk Fault Chart
    if (this.diskFaultChartRef?.nativeElement) {
      this.diskFaultChart = new Chart(this.diskFaultChartRef.nativeElement, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Disk Fault Rate (%)",
              data: [],
              borderColor: "rgb(75, 192, 192)",
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              tension: 0.4,
              fill: true,
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: "rgb(75, 192, 192)",
              pointBorderColor: "#fff",
              pointHoverRadius: 6,
              pointHoverBackgroundColor: "rgb(75, 192, 192)",
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
                label: (context) => `Disk Fault: ${context.parsed.y.toFixed(2)}%`,
                title: (context) => context[0].label,
                afterLabel: (context) => {
                  const isEnabled = this.scenarios.find((s) => s.originalName === "disk_fault")?.enabled
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`
                },
              },
            },
            title: {
              display: false,
              text: "Disk Fault Rate",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
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
                text: "Disk Fault Rate (%)",
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
    if (!this.packetLossChart || !this.latencyChart || !this.queryLoadChart || !this.queryBlackholeChart || !this.connectionKillChart || !this.diskFaultChart) return

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

    // Update Query Blackhole Chart
    this.queryBlackholeChart.data.labels = this.metrics.queryBlackhole.map((item) => formatTime(item.timestamp))
    this.queryBlackholeChart.data.datasets[0].data = this.metrics.queryBlackhole.map((item) => item.value)
    this.queryBlackholeChart.update()

    // Update Connection Kill Chart
    this.connectionKillChart.data.labels = this.metrics.connectionKill.map((item) => formatTime(item.timestamp))
    this.connectionKillChart.data.datasets[0].data = this.metrics.connectionKill.map((item) => item.value)
    this.connectionKillChart.update()

    // Update Disk Fault Chart
    this.diskFaultChart.data.labels = this.metrics.diskFault.map((item) => formatTime(item.timestamp))
    this.diskFaultChart.data.datasets[0].data = this.metrics.diskFault.map((item) => item.value)
    this.diskFaultChart.update()
  }

  fetchScenarios(): Observable<Scenario[]> {
    return this.http.get<Scenario[]>("http://localhost:8081/api/scenarios").pipe(
      catchError((err) => {
        console.error("Error fetching scenarios:", err)
        return of([])
      }),
    )
  }

  fetchMetrics(): Observable<any> {
    // Use mock data generation
    if (this.mockMetricsEnabled) {
      return of(this.generateMockMetrics())
    }
    
    // Use real metrics from backend
    return this.http.get<any>("http://localhost:8081/api/metrics").pipe(
      catchError((err) => {
        console.error("Error fetching metrics:", err)
        return of(this.generateEmptyMetrics())
      })
    )
  }

  generateMockMetrics(): ScenarioMetrics {
    const now = Date.now()

    // Find if scenarios are enabled by exact scenario names
    const packetLossEnabled = this.scenarios.find((s) => s.name === "packet_loss")?.enabled || false
    const latencyEnabled = this.scenarios.find((s) => s.name === "latency_injection")?.enabled || false
    const stressTestEnabled = this.scenarios.find((s) => s.name === "stress_testing")?.enabled || false
    const queryBlackholeEnabled = this.scenarios.find((s) => s.name === "query_blackhole")?.enabled || false
    const connectionKillEnabled = this.scenarios.find((s) => s.name === "connection_kill")?.enabled || false
    const diskFaultEnabled = this.scenarios.find((s) => s.name === "disk_fault")?.enabled || false

    // Log scenario states for debugging
    console.log('Scenario States:', {
      packetLoss: packetLossEnabled,
      latency: latencyEnabled,
      stressTest: stressTestEnabled,
      queryBlackhole: queryBlackholeEnabled,
      connectionKill: connectionKillEnabled,
      diskFault: diskFaultEnabled
    });

    // Generate realistic values based on scenario status
    const packetLossValue = packetLossEnabled
      ? Math.min(5 + Math.random() * 3, 15) // 5-8% when enabled, capped at 15%
      : Math.random() * 0.2 // 0-0.2% when disabled (normal network conditions)

    const latencyValue = latencyEnabled
      ? 100 + Math.random() * 150 // 100-250ms when enabled
      : 20 + Math.random() * 30 // 20-50ms when disabled (normal database response)

    const queryLoadValue = stressTestEnabled
      ? 300 + Math.random() * 150 // 300-450 q/s when enabled (high load)
      : 50 + Math.random() * 100 // 50-150 q/s when disabled (normal load)

    const queryBlackholeValue = queryBlackholeEnabled
      ? 20 + Math.random() * 30 // 20-50% when enabled
      : Math.random() * 0.5 // 0-0.5% when disabled

    const connectionKillValue = connectionKillEnabled
      ? 15 + Math.random() * 25 // 15-40% when enabled
      : Math.random() * 0.5 // 0-0.5% when disabled

    const diskFaultValue = diskFaultEnabled
      ? 10 + Math.random() * 20 // 10-30% when enabled
      : Math.random() * 0.2 // 0-0.2% when disabled

    // Add new data points
    this.metrics.packetLoss.push({ timestamp: now, value: packetLossValue })
    this.metrics.latency.push({ timestamp: now, value: latencyValue })
    this.metrics.queryLoad.push({ timestamp: now, value: queryLoadValue })
    this.metrics.queryBlackhole.push({ timestamp: now, value: queryBlackholeValue })
    this.metrics.connectionKill.push({ timestamp: now, value: connectionKillValue })
    this.metrics.diskFault.push({ timestamp: now, value: diskFaultValue })

    // Keep only the last 10 data points
    if (this.metrics.packetLoss.length > 10) {
      this.metrics.packetLoss.shift()
      this.metrics.latency.shift()
      this.metrics.queryLoad.shift()
      this.metrics.queryBlackhole.shift()
      this.metrics.connectionKill.shift()
      this.metrics.diskFault.shift()
    }

    return this.metrics
  }

  generateEmptyMetrics(): ScenarioMetrics {
    return {
      packetLoss: [],
      latency: [],
      queryLoad: [],
      queryBlackhole: [],
      connectionKill: [],
      diskFault: []
    }
  }

  updateMetrics(newMetrics: any): void {
    // Convert backend format to our format
    this.metrics = {
      packetLoss: newMetrics.packetLoss || [],
      latency: newMetrics.latency || [],
      queryLoad: newMetrics.queryLoad || [],
      queryBlackhole: newMetrics.queryBlackhole || [],
      connectionKill: newMetrics.connectionKill || [],
      diskFault: newMetrics.diskFault || []
    };
  }

  toggleScenario(scenario: Scenario): void {
    this.loading = true;
    console.log('Toggling scenario:', scenario.originalName, 'Current state:', scenario.enabled);

    this.http.put<any>(`http://localhost:8081/api/scenarios/toggle/${scenario.originalName}`, {}).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the local state
          scenario.enabled = !scenario.enabled;
          console.log('Scenario toggled successfully:', scenario.originalName, 'New state:', scenario.enabled);
          
          // Verify the state
          this.verifyScenarioState(scenario);
          
          // Force refresh the metrics to reflect new state
          this.refreshData();
        } else {
          console.error('Failed to toggle scenario:', response);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(`Failed to toggle scenario ${scenario.originalName}:`, err);
        this.error = `Failed to toggle scenario ${scenario.originalName}: ${err.message}`;
        this.loading = false;
      },
    });
  }

  private verifyScenarioState(scenario: Scenario): void {
    this.http.get<any>(`http://localhost:8081/api/scenarios/status/${scenario.originalName}`).subscribe({
      next: (status) => {
        if (status && typeof status.enabled !== 'undefined') {
          if (scenario.enabled !== status.enabled) {
            console.log(`State mismatch for ${scenario.originalName}: UI=${scenario.enabled}, Backend=${status.enabled}`);
            scenario.enabled = status.enabled;
          }
        }
      },
      error: (err) => {
        console.error(`Error verifying scenario state for ${scenario.originalName}:`, err);
      }
    });
  }

  enableScenario(scenario: Scenario): void {
    if (scenario.enabled) return
    console.log('Enabling scenario:', scenario.name)

    this.loading = true
    this.http
      .post(`http://localhost:8081/api/scenarios/enable/${scenario.name}`, {}, { responseType: "text" })
      .subscribe({
        next: () => {
          scenario.enabled = true
          console.log('Scenario enabled successfully:', scenario.name)
          
          // Force refresh the metrics to reflect new state
          this.refreshData()
          this.loading = false
        },
        error: (err) => {
          console.error(`Failed to enable scenario ${scenario.name}:`, err)
          this.error = `Failed to enable scenario ${scenario.name}: ${err.message}`
          this.loading = false
        },
      })
  }

  disableScenario(scenario: Scenario): void {
    if (!scenario.enabled) return
    console.log('Disabling scenario:', scenario.name)

    this.loading = true
    this.http
      .post(`http://localhost:8081/api/scenarios/disable/${scenario.name}`, {}, { responseType: "text" })
      .subscribe({
        next: () => {
          scenario.enabled = false
          console.log('Scenario disabled successfully:', scenario.name)
          
          // Force refresh the metrics to reflect new state
          this.refreshData()
          this.loading = false
        },
        error: (err) => {
          console.error(`Failed to disable scenario ${scenario.name}:`, err)
          this.error = `Failed to disable scenario ${scenario.name}: ${err.message}`
          this.loading = false
        },
      })
  }

  getMetricValue(name: keyof ScenarioMetrics): number {
    const data = this.metrics[name];
    return data.length ? data[data.length - 1].value : 0;
  }

  getPacketLossTrend(): string {
    const data = this.metrics.packetLoss;
    if (data.length < 2) return "No trend data available";
    
    const values = data.map(d => d.value);
    const lastFive = values.slice(-5);
    
    if (lastFive.length < 2) return "Insufficient data for trend analysis";
    
    // Calculate trend direction
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i-1]) increasing++;
      else if (lastFive[i] < lastFive[i-1]) decreasing++;
    }
    
    // Calculate average change
    const avgChange = (lastFive[lastFive.length-1] - lastFive[0]) / (lastFive.length - 1);
    const changeRate = Math.abs(avgChange).toFixed(2);
    
    if (increasing > decreasing) {
      return `Increasing at ${changeRate}% per interval - Network stability degrading`;
    } else if (decreasing > increasing) {
      return `Decreasing at ${changeRate}% per interval - Network stability improving`;
    } else {
      return "Stable - No significant change in network stability";
    }
  }

  getLatencyTrend(): string {
    const data = this.metrics.latency;
    if (data.length < 2) return "No trend data available";
    
    const values = data.map(d => d.value);
    const lastFive = values.slice(-5);
    
    if (lastFive.length < 2) return "Insufficient data for trend analysis";
    
    // Calculate trend direction
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i-1]) increasing++;
      else if (lastFive[i] < lastFive[i-1]) decreasing++;
    }
    
    // Calculate average change
    const avgChange = (lastFive[lastFive.length-1] - lastFive[0]) / (lastFive.length - 1);
    const changeRate = Math.abs(avgChange).toFixed(0);
    
    if (increasing > decreasing) {
      return `Increasing at ${changeRate}ms per interval - System responsiveness degrading`;
    } else if (decreasing > increasing) {
      return `Decreasing at ${changeRate}ms per interval - System responsiveness improving`;
    } else {
      return "Stable - No significant change in system responsiveness";
    }
  }

  getQueryLoadTrend(): string {
    const data = this.metrics.queryLoad;
    if (data.length < 2) return "No trend data available";
    
    const values = data.map(d => d.value);
    const lastFive = values.slice(-5);
    
    if (lastFive.length < 2) return "Insufficient data for trend analysis";
    
    // Calculate trend direction
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i-1]) increasing++;
      else if (lastFive[i] < lastFive[i-1]) decreasing++;
    }
    
    // Calculate average change
    const avgChange = (lastFive[lastFive.length-1] - lastFive[0]) / (lastFive.length - 1);
    const changeRate = Math.abs(avgChange).toFixed(0);
    
    if (increasing > decreasing) {
      return `Increasing at ${changeRate} queries/sec per interval - Database load increasing`;
    } else if (decreasing > increasing) {
      return `Decreasing at ${changeRate} queries/sec per interval - Database load decreasing`;
    } else {
      return "Stable - No significant change in database load";
    }
  }

  getMetricTrend(metricName: string): string {
    // Get the last few values to determine trend
    const metricData = this.metrics[metricName as keyof ScenarioMetrics];
    if (!metricData || metricData.length < 2) return 'Stable';

    const lastValue = metricData[metricData.length - 1].value;
    const previousValue = metricData[metricData.length - 2].value;
    
    const difference = lastValue - previousValue;
    const percentChange = (difference / previousValue) * 100;

    if (Math.abs(percentChange) < 5) return 'Stable';
    return percentChange > 0 ? 'Increasing' : 'Decreasing';
  }

  // Improved PDF export function
  async exportPDF(): Promise<void> {
  this.loading = true;

  // Create a new jsPDF instance with professional settings
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Add metadata to make the PDF more professional
  pdf.setProperties({
    title: "Scenarios Dashboard Report",
    subject: "Performance Metrics Analysis",
    author: "System Dashboard",
    keywords: "metrics, performance, monitoring, analysis, scenarios",
    creator: "Dashboard Application",
  });

  // Set up page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15; // 15mm margins
  const contentWidth = pageWidth - margin * 2;
  
  // Function to add a page header
  const addPageHeader = (pageNumber: number, totalPages: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(127, 140, 141); // Gray color
    pdf.text(`Scenarios Dashboard Report - Page ${pageNumber} of ${totalPages}`, pageWidth - margin, margin - 5, { align: "right" });
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, margin - 2, pageWidth - margin, margin - 2);
  };

  // Function to add a page footer
  const addPageFooter = (pageNumber: number) => {
    const footerPosition = pageHeight - 10;
    pdf.setFontSize(8);
    pdf.setTextColor(127, 140, 141);
    pdf.text("© Dashboard Application - For internal use only", margin, footerPosition);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerPosition, { align: "right" });
  };

  // Start with page 1
  let pageNumber = 1;
  let totalPages = 1; // We'll update this later
  
  // Add cover page
  pdf.setFontSize(24);
  pdf.setTextColor(44, 62, 80);
  pdf.text("Scenarios Dashboard", pageWidth / 2, 60, { align: "center" });
  pdf.setFontSize(16);
  pdf.text("Detailed Performance Report", pageWidth / 2, 70, { align: "center" });
  
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 85, { align: "center" });
  
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  pdf.text("This report provides a comprehensive analysis of system performance metrics", pageWidth / 2, 100, { align: "center" });
  pdf.text("including packet loss, latency, and query load across all monitored scenarios.", pageWidth / 2, 106, { align: "center" });
  
  // Add footer to cover page
  addPageFooter(pageNumber);
  
  // Add a new page for the executive summary
  pdf.addPage();
  pageNumber++;
  addPageHeader(pageNumber, totalPages);
  
  // Executive Summary
  let yPosition = margin + 5;
  pdf.setFontSize(16);
  pdf.setTextColor(44, 62, 80);
  pdf.text("Executive Summary", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  const summaryText = "This report provides a detailed analysis of system performance metrics collected from our monitoring infrastructure. The data presented here reflects the current state of our systems and highlights potential areas of concern or improvement. The metrics are collected in real-time and represent the most up-to-date information available.";
  
  // Split text into multiple lines
  const splitSummary = pdf.splitTextToSize(summaryText, contentWidth);
  pdf.text(splitSummary, margin, yPosition);
  yPosition += splitSummary.length * 5 + 5;
  
  // Active Scenarios Overview
  pdf.setFontSize(14);
  pdf.setTextColor(44, 62, 80);
  pdf.text("Active Scenarios Overview", margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);

  const packetLossActive = this.getScenarioStatus("packet_loss") === 'Active';
  const latencyActive = this.getScenarioStatus("latency_injection") === 'Active';
  const queryLoadActive = this.getScenarioStatus("stress_testing") === 'Active';
  const queryBlackholeActive = this.getScenarioStatus("query_blackhole") === 'Active';
  const connectionKillActive = this.getScenarioStatus("connection_kill") === 'Active';
  const diskFaultActive = this.getScenarioStatus("disk_fault") === 'Active';

  pdf.text(`• Packet Loss Scenario: ${packetLossActive ? "Active" : "Inactive"}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`• Latency Scenario: ${latencyActive ? "Active" : "Inactive"}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`• Query Load Scenario: ${queryLoadActive ? "Active" : "Inactive"}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`• Query Blackhole Scenario: ${queryBlackholeActive ? "Active" : "Inactive"}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`• Connection Kill Scenario: ${connectionKillActive ? "Active" : "Inactive"}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`• Disk Fault Scenario: ${diskFaultActive ? "Active" : "Inactive"}`, margin + 3, yPosition);
  yPosition += 10;
  
  // Key Metrics Overview
  pdf.setFontSize(14);
  pdf.setTextColor(44, 62, 80);
  pdf.text("Key Metrics Overview", margin, yPosition);
  yPosition += 8;
  
  // Current metrics with status indicators
  const packetLossValue = this.getMetricValue("packetLoss");
  const latencyValue = this.getMetricValue("latency");
  const queryLoadValue = this.getMetricValue("queryLoad");
  
  // Packet Loss Status
  const packetLossStatus = packetLossValue < 1 ? "Excellent" : 
                          packetLossValue < 3 ? "Good" : 
                          packetLossValue < 5 ? "Fair" : 
                          "Poor";
  
  const packetLossColor = packetLossValue < 1 ? [46, 204, 113] : 
                          packetLossValue < 3 ? [39, 174, 96] : 
                          packetLossValue < 5 ? [243, 156, 18] : 
                          [231, 76, 60];
  
  // Latency Status
  const latencyStatus = latencyValue < 50 ? "Excellent" : 
                        latencyValue < 100 ? "Good" : 
                        latencyValue < 200 ? "Fair" : 
                        "Poor";
  
  const latencyColor = latencyValue < 50 ? [46, 204, 113] : 
                      latencyValue < 100 ? [39, 174, 96] : 
                      latencyValue < 200 ? [243, 156, 18] : 
                      [231, 76, 60];
  
  // Query Load Status
  const queryLoadMax = 500; // Maximum capacity
  const queryLoadPercentage = (queryLoadValue / queryLoadMax) * 100;
  
  const queryLoadStatus = queryLoadPercentage < 30 ? "Low" : 
                          queryLoadPercentage < 60 ? "Moderate" : 
                          queryLoadPercentage < 80 ? "High" : 
                          "Critical";
  
  const queryLoadColor = queryLoadPercentage < 30 ? [46, 204, 113] : 
                        queryLoadPercentage < 60 ? [39, 174, 96] : 
                        queryLoadPercentage < 80 ? [243, 156, 18] : 
                        [231, 76, 60];
  
  // Draw metric boxes
  const boxWidth = contentWidth / 3 - 4;
  const boxHeight = 30;
  
  // Packet Loss Box
  pdf.setFillColor(250, 250, 250);
  pdf.setDrawColor(220, 220, 220);
  pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 2, 2, 'FD');
  
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Packet Loss", margin + 5, yPosition + 8);
  
  pdf.setFontSize(14);
  pdf.setTextColor(packetLossColor[0], packetLossColor[1], packetLossColor[2]);
  pdf.text(`${packetLossValue.toFixed(2)}%`, margin + 5, yPosition + 20);
  
  pdf.setFontSize(8);
  pdf.text(`Status: ${packetLossStatus}`, margin + boxWidth - 40, yPosition + 20);
  
  // Latency Box
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(margin + boxWidth + 4, yPosition, boxWidth, boxHeight, 2, 2, 'FD');
  
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Latency", margin + boxWidth + 9, yPosition + 8);
  
  pdf.setFontSize(14);
  pdf.setTextColor(latencyColor[0], latencyColor[1], latencyColor[2]);
  pdf.text(`${latencyValue.toFixed(0)} ms`, margin + boxWidth + 9, yPosition + 20);
  
  pdf.setFontSize(8);
  pdf.text(`Status: ${latencyStatus}`, margin + boxWidth * 2 - 36, yPosition + 20);
  
  // Query Load Box
  pdf.setFillColor(250, 250, 250);
  pdf.roundedRect(margin + boxWidth * 2 + 8, yPosition, boxWidth, boxHeight, 2, 2, 'FD');
  
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text("Query Load", margin + boxWidth * 2 + 13, yPosition + 8);
  
  pdf.setFontSize(14);
  pdf.setTextColor(queryLoadColor[0], queryLoadColor[1], queryLoadColor[2]);
  pdf.text(`${queryLoadValue.toFixed(0)} q/s`, margin + boxWidth * 2 + 13, yPosition + 20);
  
  pdf.setFontSize(8);
  pdf.text(`Status: ${queryLoadStatus}`, margin + boxWidth * 3 - 32, yPosition + 20);
  
  yPosition += boxHeight + 15;
  
  // Add footer
  addPageFooter(pageNumber);
  
  // Process each metric with detailed information
  const metrics = [
    {
      name: "Packet Loss",
      ref: this.packetLossChartRef,
      value: packetLossValue,
      status: packetLossStatus,
      trend: this.getPacketLossTrend(),
      description: "Packet loss measures the percentage of data packets that fail to reach their destination. It is a critical indicator of network health and can significantly impact application performance and user experience.",
      analysis: `The current packet loss rate is ${packetLossValue.toFixed(2)}%, which is ${packetLossStatus.toLowerCase()}. ${
        packetLossValue < 3 
          ? "This indicates a healthy network with minimal data transmission issues." 
          : "This elevated level may indicate network congestion, hardware issues, or configuration problems."
      }`,
      factors: [
        "Network congestion during peak usage hours",
        "Hardware limitations or failures",
        "Improper network configuration",
        "External interference or ISP issues"
      ],
      recommendations: [
        packetLossValue < 1 ? "Maintain current network configuration" : "Investigate network infrastructure",
        packetLossValue < 3 ? "Continue regular monitoring" : "Consider bandwidth upgrades",
        "Implement QoS (Quality of Service) for critical applications",
        "Schedule regular network maintenance during off-peak hours"
      ]
    },
    {
      name: "Latency",
      ref: this.latencyChartRef,
      value: latencyValue,
      status: latencyStatus,
      trend: this.getLatencyTrend(),
      description: "Latency measures the time it takes for data to travel from source to destination. Low latency is crucial for real-time applications and interactive services. High latency can result in poor user experience and application timeouts.",
      analysis: `The current latency is ${latencyValue.toFixed(0)} ms, which is ${latencyStatus.toLowerCase()}. ${
        latencyValue < 200 
          ? "This indicates good system responsiveness and should provide a smooth user experience." 
          : "This elevated level may cause noticeable delays in application response times."
      }`,
      factors: [
        "Distance between servers and clients",
        "Network congestion and routing efficiency",
        "Database query optimization",
        "Application code efficiency"
      ],
      recommendations: [
        latencyValue < 100 ? "Maintain current configuration" : "Optimize database queries",
        latencyValue < 200 ? "Continue monitoring" : "Consider CDN implementation for static content",
        "Implement caching strategies for frequently accessed data",
        "Review application code for performance bottlenecks"
      ]
    },
    {
      name: "Query Load",
      ref: this.queryLoadChartRef,
      value: queryLoadValue,
      status: queryLoadStatus,
      trend: this.getQueryLoadTrend(),
      description: "Query load measures the number of database queries processed per second. It is a key indicator of database performance and system capacity. High query loads can lead to database bottlenecks and increased latency.",
      analysis: `The current query load is ${queryLoadValue.toFixed(0)} queries per second, which represents approximately ${queryLoadPercentage.toFixed(0)}% of maximum tested capacity. This is considered ${queryLoadStatus.toLowerCase()}.`,
      factors: [
        "User activity patterns",
        "Application efficiency in database access",
        "Database indexing and optimization",
        "Query caching effectiveness"
      ],
      recommendations: [
        queryLoadPercentage < 60 ? "Maintain current database configuration" : "Consider database scaling options",
        queryLoadPercentage < 80 ? "Optimize high-impact queries" : "Implement read replicas for load distribution",
        "Review and optimize database indexes",
        "Implement query caching for frequently accessed data"
      ]
    },
    {
      name: "Query Blackhole",
      ref: this.queryBlackholeChartRef,
      value: this.getMetricValue('queryBlackhole'),
      status: this.getScenarioStatus('query_blackhole'),
      trend: this.getMetricTrend('queryBlackhole'),
      description: "Query Blackhole simulates scenarios where database queries are dropped or not processed, helping test application resilience to query failures. This metric tracks the percentage of queries being dropped.",
      analysis: `The current query blackhole rate is ${this.getMetricValue('queryBlackhole').toFixed(2)}%, which is ${this.getScenarioStatus('query_blackhole').toLowerCase()}. ${
        this.getMetricValue('queryBlackhole') < 5 
          ? "This indicates normal query processing with minimal disruption." 
          : "This elevated level indicates significant query dropping, which may affect application functionality."
      }`,
      factors: [
        "Database connection stability",
        "Query timeout configurations",
        "Application retry mechanisms",
        "Query prioritization settings"
      ],
      recommendations: [
        this.getMetricValue('queryBlackhole') < 5 ? "Maintain current query handling" : "Review query timeout settings",
        "Implement robust error handling for failed queries",
        "Set up query retry mechanisms with backoff strategies",
        "Monitor and alert on query failure patterns"
      ]
    },
    {
      name: "Connection Kill",
      ref: this.connectionKillChartRef,
      value: this.getMetricValue('connectionKill'),
      status: this.getScenarioStatus('connection_kill'),
      trend: this.getMetricTrend('connectionKill'),
      description: "Connection Kill simulates database connection failures and terminations, testing application resilience to connection issues. This metric shows the percentage of connections being terminated.",
      analysis: `The current connection kill rate is ${this.getMetricValue('connectionKill').toFixed(2)}%, which is ${this.getScenarioStatus('connection_kill').toLowerCase()}. ${
        this.getMetricValue('connectionKill') < 10 
          ? "This indicates stable connection management with normal termination rates." 
          : "This elevated level suggests high connection instability that requires attention."
      }`,
      factors: [
        "Connection pool configuration",
        "Network stability",
        "Database server capacity",
        "Application connection handling"
      ],
      recommendations: [
        this.getMetricValue('connectionKill') < 10 ? "Maintain current connection settings" : "Review connection pool configuration",
        "Implement connection retry logic",
        "Monitor connection pool metrics",
        "Set up alerts for connection failure patterns"
      ]
    },
    {
      name: "Disk Fault",
      ref: this.diskFaultChartRef,
      value: this.getMetricValue('diskFault'),
      status: this.getScenarioStatus('disk_fault'),
      trend: this.getMetricTrend('diskFault'),
      description: "Disk Fault simulates storage failures and I/O errors, testing system resilience to disk-related issues. This metric tracks the percentage of disk operations failing.",
      analysis: `The current disk fault rate is ${this.getMetricValue('diskFault').toFixed(2)}%, which is ${this.getScenarioStatus('disk_fault').toLowerCase()}. ${
        this.getMetricValue('diskFault') < 5 
          ? "This indicates healthy storage operations with minimal failures." 
          : "This elevated level suggests significant storage issues that need investigation."
      }`,
      factors: [
        "Storage hardware health",
        "I/O operation patterns",
        "Disk space utilization",
        "File system performance"
      ],
      recommendations: [
        this.getMetricValue('diskFault') < 5 ? "Maintain current storage configuration" : "Investigate storage system health",
        "Implement disk health monitoring",
        "Set up redundant storage systems",
        "Monitor and alert on disk error patterns"
      ]
    }
  ];
  
  // Process each metric
  for (const metric of metrics) {
    // Add a new page for each metric
    pdf.addPage();
    pageNumber++;
    addPageHeader(pageNumber, totalPages);
    
    yPosition = margin + 5;
    
    // Metric Title
    pdf.setFontSize(16);
    pdf.setTextColor(44, 62, 80);
    pdf.text(`${metric.name} Analysis`, margin, yPosition);
    yPosition += 10;
    
    // Current Value and Status
    pdf.setFontSize(12);
    pdf.setTextColor(80, 80, 80);
    
    let valueText = "";
    if (metric.name === "Packet Loss") {
      valueText = `Current Value: ${metric.value.toFixed(2)}% (Status: ${metric.status})`;
    } else if (metric.name === "Latency") {
      valueText = `Current Value: ${metric.value.toFixed(0)} ms (Status: ${metric.status})`;
    } else {
      valueText = `Current Value: ${metric.value.toFixed(0)} queries/sec (Status: ${metric.status})`;
    }
    
    pdf.text(valueText, margin, yPosition);
    yPosition += 7;
    
    // Trend
    pdf.text(`Trend: ${metric.trend}`, margin, yPosition);
    yPosition += 10;
    
    // Description
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.text("Description:", margin, yPosition);
    yPosition += 5;
    
    const descriptionLines = pdf.splitTextToSize(metric.description, contentWidth);
    pdf.text(descriptionLines, margin, yPosition);
    yPosition += descriptionLines.length * 5 + 5;
    
    // Analysis
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.text("Analysis:", margin, yPosition);
    yPosition += 5;
    
    const scenarioAnalysisText = "Based on the analysis of all six scenarios (Packet Loss, Latency, Query Load, Query Blackhole, Connection Kill, and Disk Fault), the system demonstrates varying levels of resilience to different types of failures. The metrics indicate how the system performs under network issues, database query problems, connection failures, and storage disruptions. This comprehensive testing approach helps ensure the system can handle a wide range of real-world challenges.";

    const analysisLines = pdf.splitTextToSize(scenarioAnalysisText, contentWidth);
    pdf.text(analysisLines, margin, yPosition);
    yPosition += analysisLines.length * 5 + 10;

    // Chart
    if (metric.ref && metric.ref.nativeElement) {
      try {
        // Capture chart with proper scaling
        const canvas = await html2canvas(metric.ref.nativeElement, {
          scale: 2, // Higher quality
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true,
          allowTaint: true,
        })
        
        // Calculate dimensions to fit on page while maintaining aspect ratio
        const imgWidth = contentWidth;
        const ratio = canvas.height / canvas.width;
        // Control the height to prevent overly large charts
        const imgHeight = Math.min(imgWidth * ratio, 60); // Max height of 60mm
        
        // Add chart image
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
        
        // Update position for next section
        yPosition += imgHeight + 10;
      } catch (error) {
        console.error(`Error capturing ${metric.name} chart:`, error);
        pdf.text(`Error rendering ${metric.name} chart`, margin, yPosition);
        yPosition += 10;
      }
    }
    
    // Contributing Factors
    pdf.setFontSize(12);
    pdf.setTextColor(44, 62, 80);
    pdf.text("Contributing Factors", margin, yPosition);
    yPosition += 7;
    
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    for (const factor of metric.factors) {
      pdf.text(`• ${factor}`, margin + 3, yPosition);
      yPosition += 5;
    }
    
    yPosition += 5;
    
    // Recommendations
    pdf.setFontSize(12);
    pdf.setTextColor(44, 62, 80);
    pdf.text("Recommendations", margin, yPosition);
    yPosition += 7;
    
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    for (const recommendation of metric.recommendations) {
      pdf.text(`• ${recommendation}`, margin + 3, yPosition);
      yPosition += 5;
    }
    
    // Add footer
    addPageFooter(pageNumber);
  }
  
  // Add a conclusion page
  pdf.addPage();
  pageNumber++;
  addPageHeader(pageNumber, totalPages);
  
  yPosition = margin + 5;
  
  // Conclusion
  pdf.setFontSize(16);
  pdf.setTextColor(44, 62, 80);
  pdf.text("Conclusion and Next Steps", margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  
  const scenarioAnalysisText = "Based on the analysis of all six scenarios (Packet Loss, Latency, Query Load, Query Blackhole, Connection Kill, and Disk Fault), the system demonstrates varying levels of resilience to different types of failures. The metrics indicate how the system performs under network issues, database query problems, connection failures, and storage disruptions. This comprehensive testing approach helps ensure the system can handle a wide range of real-world challenges.";

  const analysisLines = pdf.splitTextToSize(scenarioAnalysisText, contentWidth);
  pdf.text(analysisLines, margin, yPosition);
  yPosition += analysisLines.length * 5 + 10;
  
  // Next Steps
  pdf.setFontSize(12);
  pdf.setTextColor(44, 62, 80);
  pdf.text("Recommended Next Steps", margin, yPosition);
  yPosition += 7;
  
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  
  const nextSteps = [
    "Schedule regular scenario testing to validate system resilience",
    "Implement automated alerting for critical metric thresholds",
    "Review and optimize database connection handling",
    "Enhance storage system redundancy and error handling",
    "Document baseline performance metrics for all scenarios",
    "Develop recovery procedures for each failure scenario",
    "Set up monitoring dashboards for all six scenarios",
    "Plan capacity upgrades based on scenario test results"
  ];
  
  for (const step of nextSteps) {
    pdf.text(`• ${step}`, margin + 3, yPosition);
    yPosition += 5;
  }
  
  // Add footer
  addPageFooter(pageNumber);
  
  // Update total pages
  totalPages = pageNumber;
  
  // Re-add headers with correct total pages
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    if (i > 1) { // Skip cover page
      addPageHeader(i, totalPages);
    }
  }
  
  // Save the PDF
  pdf.save("scenarios-dashboard-detailed-report.pdf");
  this.loading = false;
}

getScenarioStatus(scenarioName: string): string {
  // Find the scenario in the scenarios array
  const scenario = this.scenarios.find(s => s.originalName === scenarioName);
  
  if (!scenario) {
    console.log(`Scenario ${scenarioName} not found`);
    return 'Inactive';
  }

  // Log the status check
  console.log(`Checking status for ${scenarioName}: enabled = ${scenario.enabled}`);
  
  return scenario.enabled ? 'Active' : 'Inactive';
}

checkScenarioState(scenarioName: string): void {
  const scenario = this.scenarios.find(s => s.name === scenarioName)
  console.log('Checking scenario state:', {
    name: scenarioName,
    found: !!scenario,
    enabled: scenario?.enabled,
    allScenarios: this.scenarios
  })
}

private startPolling(): void {
  // Set up automatic refresh for scenarios
  interval(this.refreshInterval)
    .pipe(
      startWith(0),
      switchMap(() => this.fetchScenarios()),
    )
    .subscribe({
      next: (data) => {
        // Update enabled states from backend
        data.forEach(backendScenario => {
          const scenario = this.scenarios.find(s => s.originalName === backendScenario.name);
          if (scenario) {
            scenario.enabled = backendScenario.enabled;
          }
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = "Failed to load scenarios: " + err.message;
        this.loading = false;
      },
    });

  // Set up automatic refresh for metrics
  interval(this.refreshInterval)
    .pipe(
      startWith(0),
      switchMap(() => this.fetchMetrics()),
    )
    .subscribe({
      next: (data) => {
        this.updateMetrics(data);
        this.updateCharts();
        this.updateLastUpdated();
      },
      error: (err) => {
        console.error("Failed to load metrics:", err);
      },
    });
}
}