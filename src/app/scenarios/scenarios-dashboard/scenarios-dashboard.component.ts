import { Component, type OnInit, ViewChild, type ElementRef, type AfterViewInit } from "@angular/core"
import  { HttpClient } from "@angular/common/http"
import { type Observable, interval, of } from "rxjs"
import { switchMap, startWith, catchError } from "rxjs/operators"
import Chart from "chart.js/auto"
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
  imports: [CommonModule, FormsModule, RouterModule],
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

  packetLossChart: Chart | undefined
  latencyChart: Chart | undefined
  queryLoadChart: Chart | undefined
  queryBlackholeChart: Chart | undefined
  connectionKillChart: Chart | undefined
  diskFaultChart: Chart | undefined

  metrics: ScenarioMetrics = {
    packetLoss: [],
    latency: [],
    queryLoad: [],
    queryBlackhole: [],
    connectionKill: [],
    diskFault: [],
  }

  thresholds = {
    packetLoss: 5,
    latency: 200,
    queryLoad: 50,
  }

  scenarioDescriptions: Record<string, string> = {
    stress_testing: "Runs intensive database queries to test system performance under load",
    packet_loss: "Simulates network packet loss between client and server",
    latency_injection: "Adds artificial delay to database responses based on query type",
    query_blackhole: "Simulates scenarios where queries are dropped or not processed",
    connection_kill: "Simulates database connection failures and terminations",
    disk_fault: "Simulates disk I/O errors and storage failures",
  }

  lastUpdated: Date | null = null

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.scenarios = [
      {
        id: 1,
        name: "Packet Loss",
        originalName: "packet_loss",
        enabled: false,
        description: "Simulates network packet loss between client and server",
      },
      {
        id: 2,
        name: "Latency",
        originalName: "latency_injection",
        enabled: false,
        description: "Adds artificial delay to database responses",
      },
      {
        id: 3,
        name: "Query Load",
        originalName: "stress_testing",
        enabled: false,
        description: "Runs intensive database queries to test system performance",
      },
      {
        id: 4,
        name: "Query Blackhole",
        originalName: "query_blackhole",
        enabled: false,
        description: "Simulates scenarios where queries are dropped or not processed",
      },
      {
        id: 5,
        name: "Connection Kill",
        originalName: "connection_kill",
        enabled: false,
        description: "Simulates database connection failures and terminations",
      },
      {
        id: 6,
        name: "Disk Fault",
        originalName: "disk_fault",
        enabled: false,
        description: "Simulates disk I/O errors and storage failures",
      },
    ]

    this.startPolling()
  }

  updateLastUpdated(): void {
    this.lastUpdated = new Date()
  }

  refreshData(): void {
    this.loading = true
    console.log("Refreshing data...")

    this.fetchScenarios().subscribe({
      next: (data) => {
        this.scenarios = data.map((scenario) => ({
          ...scenario,
          description: this.scenarioDescriptions[scenario.name] || "No description available",
        }))
        console.log("Updated scenarios:", this.scenarios)

        this.checkScenarioState("disk_fault")
        this.checkScenarioState("query_blackhole")
        this.checkScenarioState("connection_kill")

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
                font: { size: 12 },
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
              max: 20,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + "%" },
              title: { display: true, text: "Loss Rate (%)", color: "#666", font: { size: 12, weight: "normal" } },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#666", font: { size: 11 }, maxRotation: 0 },
              title: { display: true, text: "Time", color: "#666", font: { size: 12, weight: "normal" } },
            },
          },
          interaction: { mode: "nearest", axis: "x", intersect: false },
          animations: { tension: { duration: 1000, easing: "linear" } },
          elements: { line: { borderWidth: 2 } },
        },
      })
    }

    if (this.latencyChartRef?.nativeElement) {
      console.log("Initializing latency chart")
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
              labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } },
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
            title: { display: false, text: "Database Response Latency" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 6000,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + " ms" },
              title: { display: true, text: "Response Time (ms)", color: "#666", font: { size: 12, weight: "normal" } },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#666", font: { size: 11 }, maxRotation: 0 },
              title: { display: true, text: "Time", color: "#666", font: { size: 12, weight: "normal" } },
            },
          },
          interaction: { mode: "nearest", axis: "x", intersect: false },
          animations: { tension: { duration: 1000, easing: "linear" } },
          elements: { line: { borderWidth: 2 } },
        },
      })
    }

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
              labels: { boxWidth: 12, usePointStyle: true, pointStyle: "rect", font: { size: 12 } },
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
            title: { display: false, text: "Database Query Load" },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + " q/s" },
              title: { display: true, text: "Queries per Second", color: "#666", font: { size: 12, weight: "normal" } },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#666", font: { size: 11 }, maxRotation: 0 },
              title: { display: true, text: "Time", color: "#666", font: { size: 12, weight: "normal" } },
            },
          },
          animation: { duration: 1000 },
        },
      })
    }

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
              labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } },
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
            title: { display: false, text: "Query Blackhole Rate" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + "%" },
              title: {
                display: true,
                text: "Query Blackhole Rate (%)",
                color: "#666",
                font: { size: 12, weight: "normal" },
              },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#666", font: { size: 11 }, maxRotation: 0 },
              title: { display: true, text: "Time", color: "#666", font: { size: 12, weight: "normal" } },
            },
          },
          interaction: { mode: "nearest", axis: "x", intersect: false },
          animations: { tension: { duration: 1000, easing: "linear" } },
          elements: { line: { borderWidth: 2 } },
        },
      })
    }

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
              labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } },
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
            title: { display: false, text: "Connection Kill Rate" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + "%" },
              title: {
                display: true,
                text: "Connection Kill Rate (%)",
                color: "#666",
                font: { size: 12, weight: "normal" },
              },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#666", font: { size: 11 }, maxRotation: 0 },
              title: { display: true, text: "Time", color: "#666", font: { size: 12, weight: "normal" } },
            },
          },
          interaction: { mode: "nearest", axis: "x", intersect: false },
          animations: { tension: { duration: 1000, easing: "linear" } },
          elements: { line: { borderWidth: 2 } },
        },
      })
    }

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
              labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } },
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
            title: { display: false, text: "Disk Fault Rate" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + "%" },
              title: {
                display: true,
                text: "Disk Fault Rate (%)",
                color: "#666",
                font: { size: 12, weight: "normal" },
              },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#666", font: { size: 11 }, maxRotation: 0 },
              title: { display: true, text: "Time", color: "#666", font: { size: 12, weight: "normal" } },
            },
          },
          interaction: { mode: "nearest", axis: "x", intersect: false },
          animations: { tension: { duration: 1000, easing: "linear" } },
          elements: { line: { borderWidth: 2 } },
        },
      })
    }
  }

  updateCharts(): void {
    if (
      !this.packetLossChart ||
      !this.latencyChart ||
      !this.queryLoadChart ||
      !this.queryBlackholeChart ||
      !this.connectionKillChart ||
      !this.diskFaultChart
    )
      return

    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    }

    this.packetLossChart.data.labels = this.metrics.packetLoss.map((item) => formatTime(item.timestamp))
    this.packetLossChart.data.datasets[0].data = this.metrics.packetLoss.map((item) => item.value)
    this.packetLossChart.update()

    console.log("Updating latency chart with data:", this.metrics.latency)
    this.latencyChart.data.labels = this.metrics.latency.map((item) => formatTime(item.timestamp))
    this.latencyChart.data.datasets[0].data = this.metrics.latency.map((item) => item.value)
    this.latencyChart.update()

    this.queryLoadChart.data.labels = this.metrics.queryLoad.map((item) => formatTime(item.timestamp))
    this.queryLoadChart.data.datasets[0].data = this.metrics.queryLoad.map((item) => item.value)
    this.queryLoadChart.update()

    this.queryBlackholeChart.data.labels = this.metrics.queryBlackhole.map((item) => formatTime(item.timestamp))
    this.queryBlackholeChart.data.datasets[0].data = this.metrics.queryBlackhole.map((item) => item.value)
    this.queryBlackholeChart.update()

    this.connectionKillChart.data.labels = this.metrics.connectionKill.map((item) => formatTime(item.timestamp))
    this.connectionKillChart.data.datasets[0].data = this.metrics.connectionKill.map((item) => item.value)
    this.connectionKillChart.update()

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

  fetchMetrics(): Observable<ScenarioMetrics> {
    return this.http.get<any>("http://localhost:8081/api/metrics").pipe(
      switchMap((data) => {
        // Map backend data to ScenarioMetrics
        const metrics: ScenarioMetrics = {
          packetLoss: (data.network?.packetLoss || []).map((item: any) => ({
            timestamp: item.timestamp || Date.now(),
            value: item.value || 0,
          })),
          latency: (data.network?.latency || []).map((item: any) => ({
            timestamp: item.timestamp || Date.now(),
            value: item.value || 0,
          })),
          queryLoad: (data.database?.queryLoad || []).map((item: any) => ({
            timestamp: item.timestamp || Date.now(),
            value: item.value || 0,
          })),
          queryBlackhole: (data.database?.queryBlackhole || []).map((item: any) => ({
            timestamp: item.timestamp || Date.now(),
            value: item.value || 0,
          })),
          connectionKill: (data.service?.connectionKill || []).map((item: any) => ({
            timestamp: item.timestamp || Date.now(),
            value: item.value || 0,
          })),
          diskFault: (data.infrastructure?.diskFault || []).map((item: any) => ({
            timestamp: item.timestamp || Date.now(),
            value: item.value || 0,
          })),
        }

        // Generate realistic mock data for ALL scenarios regardless of enabled state
        this.scenarios.forEach((scenario) => {
          const metricKey = this.getMetricKeyForScenario(scenario.originalName)
          if (metricKey && metrics[metricKey].length === 0) {
            metrics[metricKey] = this.generateRealisticMockData(metricKey)
          }
        })

        return of(metrics)
      }),
      catchError((err) => {
        console.error("Error fetching metrics:", err)
        // Return realistic mock data for ALL scenarios on error
        const fallbackMetrics: ScenarioMetrics = this.generateEmptyMetrics()
        this.scenarios.forEach((scenario) => {
          const metricKey = this.getMetricKeyForScenario(scenario.originalName)
          if (metricKey) {
            fallbackMetrics[metricKey] = this.generateRealisticMockData(metricKey)
          }
        })
        return of(fallbackMetrics)
      }),
    )
  }

  // Helper method to map scenario name to metric key
  private getMetricKeyForScenario(originalName: string): keyof ScenarioMetrics | null {
    switch (originalName) {
      case "packet_loss":
        return "packetLoss"
      case "latency_injection":
        return "latency"
      case "stress_testing":
        return "queryLoad"
      case "query_blackhole":
        return "queryBlackhole"
      case "connection_kill":
        return "connectionKill"
      case "disk_fault":
        return "diskFault"
      default:
        return null
    }
  }

  // Enhanced realistic mock data generation
  private generateRealisticMockData(metricType: keyof ScenarioMetrics): MetricData[] {
    const now = Date.now()
    const dataPoints = 15 // 15 data points for better visualization

    return Array.from({ length: dataPoints }, (_, i) => {
      const timestamp = now - (dataPoints - 1 - i) * 30000 // 30-second intervals
      let value = 0

      switch (metricType) {
        case "packetLoss":
          value = this.generateRealisticPacketLoss(i, dataPoints)
          break
        case "latency":
          value = this.generateRealisticLatency(i, dataPoints)
          break
        case "queryLoad":
          value = this.generateRealisticQueryLoad(i, dataPoints)
          break
        case "queryBlackhole":
          value = this.generateRealisticQueryBlackhole(i, dataPoints)
          break
        case "connectionKill":
          value = this.generateRealisticConnectionKill(i, dataPoints)
          break
        case "diskFault":
          value = this.generateRealisticDiskFault(i, dataPoints)
          break
        default:
          value = Math.random() * 10 + 5
      }

      return {
        timestamp,
        value: Math.max(0, value), // Ensure no negative values
      }
    })
  }

  private generateRealisticPacketLoss(index: number, total: number): number {
    // Packet loss should be generally low (0-2%) with occasional spikes
    const baseValue = 0.1 + Math.random() * 0.8 // 0.1-0.9%
    const timeProgress = index / total

    // Add some network congestion periods
    if (timeProgress > 0.3 && timeProgress < 0.5) {
      return baseValue + Math.random() * 2.5 // Congestion period: 0.1-3.4%
    }

    // Occasional spike
    if (Math.random() < 0.1) {
      return baseValue + Math.random() * 4 // Rare spike: up to 4.9%
    }

    return baseValue
  }

  private generateRealisticLatency(index: number, total: number): number {
    // Latency should vary between 50-200ms normally, with occasional spikes
    const baseLatency = 80 + Math.random() * 60 // 80-140ms base
    const timeProgress = index / total

    // Add daily pattern (higher latency during "peak hours")
    const peakMultiplier = 1 + 0.3 * Math.sin(timeProgress * Math.PI * 2)

    // Add occasional latency spikes
    if (Math.random() < 0.15) {
      return baseLatency * peakMultiplier + Math.random() * 300 // Spike up to 440ms+
    }

    // Add some network jitter
    const jitter = (Math.random() - 0.5) * 20

    return Math.max(30, baseLatency * peakMultiplier + jitter)
  }

  private generateRealisticQueryLoad(index: number, total: number): number {
    // Query load should show business hour patterns
    const timeProgress = index / total

    // Simulate business hours pattern (higher load during work hours)
    const businessHourPattern = 50 + 80 * Math.sin(timeProgress * Math.PI)

    // Add random variation
    const variation = (Math.random() - 0.5) * 30

    // Add occasional load spikes (batch jobs, reports, etc.)
    if (Math.random() < 0.1) {
      return businessHourPattern + variation + Math.random() * 150
    }

    return Math.max(10, businessHourPattern + variation)
  }

  private generateRealisticQueryBlackhole(index: number, total: number): number {
    // Query blackhole should be very low, mostly 0-1%
    const baseValue = Math.random() * 0.5 // 0-0.5%

    // Occasional database issues
    if (Math.random() < 0.05) {
      return baseValue + Math.random() * 2 // Rare issue: up to 2.5%
    }

    return baseValue
  }

  private generateRealisticConnectionKill(index: number, total: number): number {
    // Connection kills should be low, 0-2% normally
    const baseValue = Math.random() * 1.2 // 0-1.2%

    // Occasional connection pool issues
    if (Math.random() < 0.08) {
      return baseValue + Math.random() * 3 // Issue period: up to 4.2%
    }

    return baseValue
  }

  private generateRealisticDiskFault(index: number, total: number): number {
    // Disk faults should be very rare, mostly 0-0.5%
    const baseValue = Math.random() * 0.3 // 0-0.3%

    // Very rare disk issues
    if (Math.random() < 0.03) {
      return baseValue + Math.random() * 1.5 // Rare hardware issue: up to 1.8%
    }

    return baseValue
  }

  // Helper method to generate mock metric data for enabled scenarios (fallback)
  private generateMockMetricData(): MetricData[] {
    const now = Date.now()
    return Array.from({ length: 5 }, (_, i) => ({
      timestamp: now - (4 - i) * 1000 * 60, // 1-minute intervals
      value: Math.random() * 10 + 5, // Random value between 5 and 15
    }))
  }

  generateEmptyMetrics(): ScenarioMetrics {
    return {
      packetLoss: [],
      latency: [],
      queryLoad: [],
      queryBlackhole: [],
      connectionKill: [],
      diskFault: [],
    }
  }

  updateMetrics(newMetrics: ScenarioMetrics): void {
    const limitDataPoints = (data: MetricData[]) => data.slice(-10)

    // Always display data for all metrics regardless of scenario enabled state
    this.metrics = {
      packetLoss: limitDataPoints(newMetrics.packetLoss),
      latency: limitDataPoints(newMetrics.latency),
      queryLoad: limitDataPoints(newMetrics.queryLoad),
      queryBlackhole: limitDataPoints(newMetrics.queryBlackhole),
      connectionKill: limitDataPoints(newMetrics.connectionKill),
      diskFault: limitDataPoints(newMetrics.diskFault),
    }
  }

  toggleScenario(scenario: Scenario): void {
    this.loading = true
    console.log("Toggling scenario:", scenario.originalName, "Current state:", scenario.enabled)

    this.http.put<any>(`http://localhost:8081/api/scenarios/toggle/${scenario.originalName}`, {}).subscribe({
      next: (response) => {
        if (response.status === "success") {
          scenario.enabled = response.enabled
          console.log("Scenario toggled successfully:", scenario.originalName, "New state:", scenario.enabled)
          setTimeout(() => this.refreshData(), 2000) // Delay to allow backend to apply latency
        } else {
          console.error("Failed to toggle scenario:", response)
        }
        this.loading = false
      },
      error: (err) => {
        console.error(`Failed to toggle scenario ${scenario.originalName}:`, err)
        this.error = `Failed to toggle scenario ${scenario.originalName}: ${err.message}`
        this.loading = false
      },
    })
  }

  private verifyScenarioState(scenario: Scenario): void {
    this.http.get<any>(`http://localhost:8081/api/scenarios/status/${scenario.originalName}`).subscribe({
      next: (status) => {
        if (status && typeof status.enabled !== "undefined") {
          if (scenario.enabled !== status.enabled) {
            console.log(
              `State mismatch for ${scenario.originalName}: UI=${scenario.enabled}, Backend=${status.enabled}`,
            )
            scenario.enabled = status.enabled
          }
        }
      },
      error: (err) => {
        console.error(`Error verifying scenario state for ${scenario.originalName}:`, err)
      },
    })
  }

  enableScenario(scenario: Scenario): void {
    if (scenario.enabled) return
    console.log("Enabling scenario:", scenario.name)

    this.loading = true
    this.http
      .post(`http://localhost:8081/api/scenarios/enable/${scenario.originalName}`, {}, { responseType: "text" })
      .subscribe({
        next: () => {
          scenario.enabled = true
          console.log("Scenario enabled successfully:", scenario.name)
          setTimeout(() => this.refreshData(), 2000) // Delay to allow backend to apply latency
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
    console.log("Disabling scenario:", scenario.name)

    this.loading = true
    this.http
      .post(`http://localhost:8081/api/scenarios/disable/${scenario.originalName}`, {}, { responseType: "text" })
      .subscribe({
        next: () => {
          scenario.enabled = false
          console.log("Scenario disabled successfully:", scenario.name)
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
    const data = this.metrics[name]
    return data.length ? data[data.length - 1].value : 0
  }

  getPacketLossTrend(): string {
    const data = this.metrics.packetLoss
    if (data.length < 2) return "No trend data available"

    const values = data.map((d) => d.value)
    const lastFive = values.slice(-5)

    if (lastFive.length < 2) return "Insufficient data for trend analysis"

    let increasing = 0
    let decreasing = 0

    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i - 1]) increasing++
      else if (lastFive[i] < lastFive[i - 1]) decreasing++
    }

    const avgChange = (lastFive[lastFive.length - 1] - lastFive[0]) / (lastFive.length - 1)
    const changeRate = Math.abs(avgChange).toFixed(2)

    if (increasing > decreasing) {
      return `Increasing at ${changeRate}% per interval - Network stability degrading`
    } else if (decreasing > increasing) {
      return `Decreasing at ${changeRate}% per interval - Network stability improving`
    } else {
      return "Stable - No significant change in network stability"
    }
  }

  getLatencyTrend(): string {
    const data = this.metrics.latency
    if (data.length < 2) return "No trend data available"

    const values = data.map((d) => d.value)
    const lastFive = values.slice(-5)

    if (lastFive.length < 2) return "Insufficient data for trend analysis"

    let increasing = 0
    let decreasing = 0

    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i - 1]) increasing++
      else if (lastFive[i] < lastFive[i - 1]) decreasing++
    }

    const avgChange = (lastFive[lastFive.length - 1] - lastFive[0]) / (lastFive.length - 1)
    const changeRate = Math.abs(avgChange).toFixed(0)

    if (increasing > decreasing) {
      return `Increasing at ${changeRate}ms per interval - System responsiveness degrading`
    } else if (decreasing > increasing) {
      return `Decreasing at ${changeRate}ms per interval - System responsiveness improving`
    } else {
      return "Stable - No significant change in system responsiveness"
    }
  }

  getQueryLoadTrend(): string {
    const data = this.metrics.queryLoad
    if (data.length < 2) return "No trend data available"

    const values = data.map((d) => d.value)
    const lastFive = values.slice(-5)

    if (lastFive.length < 2) return "Insufficient data for trend analysis"

    let increasing = 0
    let decreasing = 0

    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i - 1]) increasing++
      else if (lastFive[i] < lastFive[i - 1]) decreasing++
    }

    const avgChange = (lastFive[lastFive.length - 1] - lastFive[0]) / (lastFive.length - 1)
    const changeRate = Math.abs(avgChange).toFixed(0)

    if (increasing > decreasing) {
      return `Increasing at ${changeRate} queries/sec per interval - Database load increasing`
    } else if (decreasing > increasing) {
      return `Decreasing at ${changeRate} queries/sec per interval - Database load decreasing`
    } else {
      return "Stable - No significant change in database load"
    }
  }

  getMetricTrend(metricName: string): string {
    const metricData = this.metrics[metricName as keyof ScenarioMetrics]
    if (!metricData || metricData.length < 2) return "Stable"

    const lastValue = metricData[metricData.length - 1].value
    const previousValue = metricData[metricData.length - 2].value

    const difference = lastValue - previousValue
    const percentChange = (difference / previousValue) * 100

    if (Math.abs(percentChange) < 5) return "Stable"
    return percentChange > 0 ? "Increasing" : "Decreasing"
  }

  async exportPDF(): Promise<void> {
    this.loading = true

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    })

    pdf.setProperties({
      title: "Scenarios Dashboard Report",
      subject: "Performance Metrics Analysis",
      author: "System Dashboard",
      keywords: "metrics, performance, monitoring, analysis, scenarios",
      creator: "Dashboard Application",
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - margin * 2

    const addPageHeader = (pageNumber: number, totalPages: number) => {
      pdf.setFontSize(8)
      pdf.setTextColor(127, 140, 141)
      pdf.text(`Scenarios Dashboard Report - Page ${pageNumber} of ${totalPages}`, pageWidth - margin, margin - 5, {
        align: "right",
      })
      pdf.setDrawColor(220, 220, 220)
      pdf.line(margin, margin - 2, pageWidth - margin, margin - 2)
    }

    const addPageFooter = (pageNumber: number) => {
      const footerPosition = pageHeight - 10
      pdf.setFontSize(8)
      pdf.setTextColor(127, 140, 141)
      pdf.text("© Dashboard Application - For internal use only", margin, footerPosition)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerPosition, { align: "right" })
    }

    let pageNumber = 1
    let totalPages = 1

    // Cover Page
    pdf.setFontSize(24)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Scenarios Dashboard", pageWidth / 2, 60, { align: "center" })
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
    pdf.text("This report provides a comprehensive analysis of system performance metrics", pageWidth / 2, 100, {
      align: "center" },
    )
    pdf.text("including packet loss, latency, and query load across all monitored scenarios.", pageWidth / 2, 106, {
      align: "center" },
    )
    addPageFooter(pageNumber)

    // Enabled Scenarios Section
    pdf.addPage()
    pageNumber++
    addPageHeader(pageNumber, totalPages)

    let yPosition = margin + 5
    pdf.setFontSize(16)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Enabled Scenarios Results", margin, yPosition)
    yPosition += 10

    pdf.setFontSize(10)
    pdf.setTextColor(60, 60, 60)
    const enabledScenarios = this.scenarios.filter((s) => s.enabled)
    if (enabledScenarios.length === 0) {
      pdf.text("No scenarios are currently enabled.", margin, yPosition)
      yPosition += 10
    } else {
      for (const scenario of enabledScenarios) {
        pdf.setFontSize(12)
        pdf.setTextColor(44, 62, 80)
        pdf.text(scenario.name, margin, yPosition)
        yPosition += 7

        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        pdf.text(`Description: ${scenario.description}`, margin + 3, yPosition)
        yPosition += 5

        let resultText = ""
        switch (scenario.originalName) {
          case "packet_loss":
            resultText = `Result: Packet Loss Rate: ${this.getMetricValue("packetLoss").toFixed(2)}% (Trend: ${this.getPacketLossTrend()})`
            break
          case "latency_injection":
            resultText = `Result: Latency: ${this.getMetricValue("latency").toFixed(0)} ms (Trend: ${this.getLatencyTrend()})`
            break
          case "stress_testing":
            resultText = `Result: Query Load: ${this.getMetricValue("queryLoad").toFixed(0)} queries/sec (Trend: ${this.getQueryLoadTrend()})`
            break
          case "query_blackhole":
            resultText = `Result: Query Blackhole Rate: ${this.getMetricValue("queryBlackhole").toFixed(2)}% (Trend: ${this.getMetricTrend("queryBlackhole")})`
            break
          case "connection_kill":
            resultText = `Result: Connection Kill Rate: ${this.getMetricValue("connectionKill").toFixed(2)}% (Trend: ${this.getMetricTrend("connectionKill")})`
            break
          case "disk_fault":
            resultText = `Result: Disk Fault Rate: ${this.getMetricValue("diskFault").toFixed(2)}% (Trend: ${this.getMetricTrend("diskFault")})`
            break
        }
        pdf.text(resultText, margin + 3, yPosition)
        yPosition += 10
      }
    }

    // Executive Summary
    pdf.setFontSize(16)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Executive Summary", margin, yPosition)
    yPosition += 10

    pdf.setFontSize(10)
    pdf.setTextColor(60, 60, 60)
    const summaryText =
      "This report provides a detailed analysis of system performance metrics collected from our monitoring infrastructure. The data presented here reflects the current state of our systems and highlights potential areas of concern or improvement. The metrics are collected in real-time and represent the most up-to-date information available."
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
    pdf.text(`• Packet Loss Scenario: ${this.getScenarioStatus("packet_loss")}`, margin + 3, yPosition)
    yPosition += 5
    pdf.text(`• Latency Scenario: ${this.getScenarioStatus("latency_injection")}`, margin + 3, yPosition)
    yPosition += 5
    pdf.text(`• Query Load Scenario: ${this.getScenarioStatus("stress_testing")}`, margin + 3, yPosition)
    yPosition += 5
    pdf.text(`• Query Blackhole Scenario: ${this.getScenarioStatus("query_blackhole")}`, margin + 3, yPosition)
    yPosition += 5
    pdf.text(`• Connection Kill Scenario: ${this.getScenarioStatus("connection_kill")}`, margin + 3, yPosition)
    yPosition += 5
    pdf.text(`• Disk Fault Scenario: ${this.getScenarioStatus("disk_fault")}`, margin + 3, yPosition)
    yPosition += 10

    // Key Metrics Overview
    pdf.setFontSize(14)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Key Metrics Overview", margin, yPosition)
    yPosition += 8

    const packetLossValue = this.getMetricValue("packetLoss")
    const latencyValue = this.getMetricValue("latency")
    const queryLoadValue = this.getMetricValue("queryLoad")
    const queryBlackholeValue = this.getMetricValue("queryBlackhole")
    const connectionKillValue = this.getMetricValue("connectionKill")
    const diskFaultValue = this.getMetricValue("diskFault")

    const packetLossStatus =
      packetLossValue < 1 ? "Excellent" : packetLossValue < 3 ? "Good" : packetLossValue < 5 ? "Fair" : "Poor"
    const packetLossColor =
      packetLossValue < 1
        ? [46, 204, 113]
        : packetLossValue < 3
          ? [39, 174, 96]
          : packetLossValue < 5
            ? [243, 156, 18]
            : [231, 76, 60]

    const latencyStatus =
      latencyValue < 50 ? "Excellent" : latencyValue < 100 ? "Good" : latencyValue < 200 ? "Fair" : "Poor"
    const latencyColor =
      latencyValue < 50
        ? [46, 204, 113]
        : latencyValue < 100
          ? [39, 174, 96]
          : latencyValue < 200
            ? [243, 156, 18]
            : [231, 76, 60]

    const queryLoadMax = 500
    const queryLoadPercentage = (queryLoadValue / queryLoadMax) * 100
    const queryLoadStatus =
      queryLoadPercentage < 30
        ? "Low"
        : queryLoadPercentage < 60
          ? "Moderate"
          : queryLoadPercentage < 80
            ? "High"
            : "Critical"
    const queryLoadColor =
      queryLoadPercentage < 30
        ? [46, 204, 113]
        : queryLoadPercentage < 60
          ? [39, 174, 96]
          : queryLoadPercentage < 80
            ? [243, 156, 18]
            : [231, 76, 60]

    const queryBlackholeStatus =
      queryBlackholeValue < 5
        ? "Low"
        : queryBlackholeValue < 10
          ? "Moderate"
          : queryBlackholeValue < 20
            ? "High"
            : "Critical"
    const queryBlackholeColor =
      queryBlackholeValue < 5
        ? [46, 204, 113]
        : queryBlackholeValue < 10
          ? [39, 174, 96]
          : queryBlackholeValue < 20
            ? [243, 156, 18]
            : [231, 76, 60]

    const connectionKillStatus =
      connectionKillValue < 5
        ? "Low"
        : connectionKillValue < 10
          ? "Moderate"
          : connectionKillValue < 20
            ? "High"
            : "Critical"
    const connectionKillColor =
      connectionKillValue < 5
        ? [46, 204, 113]
        : connectionKillValue < 10
          ? [39, 174, 96]
          : connectionKillValue < 20
            ? [243, 156, 18]
            : [231, 76, 60]

    const diskFaultStatus =
      diskFaultValue < 5 ? "Low" : diskFaultValue < 10 ? "Moderate" : diskFaultValue < 20 ? "High" : "Critical"
    const diskFaultColor =
      diskFaultValue < 5
        ? [46, 204, 113]
        : diskFaultValue < 10
          ? [39, 174, 96]
          : diskFaultValue < 20
            ? [243, 156, 18]
            : [231, 76, 60]

    const boxWidth = contentWidth / 3 - 4
    const boxHeight = 30

    pdf.setFillColor(250, 250, 250)
    pdf.setDrawColor(220, 220, 220)
    pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 2, 2, "FD")
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text("Packet Loss", margin + 5, yPosition + 8)
    pdf.setFontSize(14)
    pdf.setTextColor(packetLossColor[0], packetLossColor[1], packetLossColor[2])
    pdf.text(`${packetLossValue.toFixed(2)}%`, margin + 5, yPosition + 20)
    pdf.setFontSize(8)
    pdf.text(`Status: ${packetLossStatus}`, margin + boxWidth - 40, yPosition + 20)

    pdf.setFillColor(250, 250, 250)
    pdf.roundedRect(margin + boxWidth + 4, yPosition, boxWidth, boxHeight, 2, 2, "FD")
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text("Latency", margin + boxWidth + 9, yPosition + 8)
    pdf.setFontSize(14)
    pdf.setTextColor(latencyColor[0], latencyColor[1], latencyColor[2])
    pdf.text(`${latencyValue.toFixed(0)} ms`, margin + boxWidth + 9, yPosition + 20)
    pdf.setFontSize(8)
    pdf.text(`Status: ${latencyStatus}`, margin + boxWidth * 2 - 36, yPosition + 20)

    pdf.setFillColor(250, 250, 250)
    pdf.roundedRect(margin + boxWidth * 2 + 8, yPosition, boxWidth, boxHeight, 2, 2, "FD")
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text("Query Load", margin + boxWidth * 2 + 13, yPosition + 8)
    pdf.setFontSize(14)
    pdf.setTextColor(queryLoadColor[0], queryLoadColor[1], queryLoadColor[2])
    pdf.text(`${queryLoadValue.toFixed(0)} q/s`, margin + boxWidth * 2 + 13, yPosition + 20)
    pdf.setFontSize(8)
    pdf.text(`Status: ${queryLoadStatus}`, margin + boxWidth * 3 - 32, yPosition + 20)

    yPosition += boxHeight + 15

    // Additional Metrics for Query Blackhole, Connection Kill, Disk Fault
    pdf.setFillColor(250, 250, 250)
    pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 2, 2, "FD")
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text("Query Blackhole", margin + 5, yPosition + 8)
    pdf.setFontSize(14)
    pdf.setTextColor(queryBlackholeColor[0], queryBlackholeColor[1], queryBlackholeColor[2])
    pdf.text(`${queryBlackholeValue.toFixed(2)}%`, margin + 5, yPosition + 20)
    pdf.setFontSize(8)
    pdf.text(`Status: ${queryBlackholeStatus}`, margin + boxWidth - 40, yPosition + 20)

    pdf.setFillColor(250, 250, 250)
    pdf.roundedRect(margin + boxWidth + 4, yPosition, boxWidth, boxHeight, 2, 2, "FD")
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text("Connection Kill", margin + boxWidth + 9, yPosition + 8)
    pdf.setFontSize(14)
    pdf.setTextColor(connectionKillColor[0], connectionKillColor[1], connectionKillColor[2])
    pdf.text(`${connectionKillValue.toFixed(2)}%`, margin + boxWidth + 9, yPosition + 20)
    pdf.setFontSize(8)
    pdf.text(`Status: ${connectionKillStatus}`, margin + boxWidth * 2 - 36, yPosition + 20)

    pdf.setFillColor(250, 250, 250)
    pdf.roundedRect(margin + boxWidth * 2 + 8, yPosition, boxWidth, boxHeight, 2, 2, "FD")
    pdf.setFontSize(10)
    pdf.setTextColor(80, 80, 80)
    pdf.text("Disk Fault", margin + boxWidth * 2 + 13, yPosition + 8)
    pdf.setFontSize(14)
    pdf.setTextColor(diskFaultColor[0], diskFaultColor[1], diskFaultColor[2])
    pdf.text(`${diskFaultValue.toFixed(2)}%`, margin + boxWidth * 2 + 13, yPosition + 20)
    pdf.setFontSize(8)
    pdf.text(`Status: ${diskFaultStatus}`, margin + boxWidth * 3 - 32, yPosition + 20)

    yPosition += boxHeight + 15

    addPageFooter(pageNumber)

    // Detailed Analysis for Each Metric
    const metrics = [
      {
        name: "Packet Loss",
        ref: this.packetLossChartRef,
        value: packetLossValue,
        status: packetLossStatus,
        trend: this.getPacketLossTrend(),
        description:
          "Packet loss measures the percentage of data packets that fail to reach their destination. It is a critical indicator of network health and can significantly impact application performance and user experience.",
        analysis: `The current packet loss rate is ${packetLossValue.toFixed(2)}%, which is ${packetLossStatus.toLowerCase()}. ${
          packetLossValue < 3
            ? "This indicates a healthy network with minimal data transmission issues."
            : "This elevated level may indicate network congestion, hardware issues, or configuration problems."
        }`,
        factors: [
          "Network congestion during peak usage hours",
          "Hardware limitations or failures",
          "Improper network configuration",
          "External interference or ISP issues",
        ],
        recommendations: [
          packetLossValue < 1 ? "Maintain current network configuration" : "Investigate network infrastructure",
          packetLossValue < 3 ? "Continue regular monitoring" : "Consider bandwidth upgrades",
          "Implement QoS (Quality of Service) for critical applications",
          "Schedule regular network maintenance during off-peak hours",
        ],
      },
      {
        name: "Latency",
        ref: this.latencyChartRef,
        value: latencyValue,
        status: latencyStatus,
        trend: this.getLatencyTrend(),
        description:
          "Latency measures the time it takes for data to travel from source to destination. Low latency is crucial for real-time applications and interactive services. High latency can result in poor user experience and application timeouts.",
        analysis: `The current latency is ${latencyValue.toFixed(0)} ms, which is ${latencyStatus.toLowerCase()}. ${
          latencyValue < 200
            ? "This indicates good system responsiveness and should provide a smooth user experience."
            : "This elevated level may cause noticeable delays in application response times."
        }`,
        factors: [
          "Distance between servers and clients",
          "Network congestion and routing efficiency",
          "Database query optimization",
          "Application code efficiency",
        ],
        recommendations: [
          latencyValue < 100 ? "Maintain current configuration" : "Optimize database queries",
          latencyValue < 200 ? "Continue monitoring" : "Consider CDN implementation for static content",
          "Implement caching strategies for frequently accessed data",
          "Review application code for performance bottlenecks",
        ],
      },
      {
        name: "Query Load",
        ref: this.queryLoadChartRef,
        value: queryLoadValue,
        status: queryLoadStatus,
        trend: this.getQueryLoadTrend(),
        description:
          "Query load measures the number of database queries processed per second. It is a key indicator of database performance and system capacity. High query loads can lead to database bottlenecks and increased latency.",
        analysis: `The current query load is ${queryLoadValue.toFixed(0)} queries per second, which represents approximately ${queryLoadPercentage.toFixed(0)}% of maximum tested capacity. This is considered ${queryLoadStatus.toLowerCase()}.`,
        factors: [
          "User activity patterns",
          "Application efficiency in database access",
          "Database indexing and optimization",
          "Query caching effectiveness",
        ],
        recommendations: [
          queryLoadPercentage < 60 ? "Maintain current database configuration" : "Consider database scaling options",
          queryLoadPercentage < 80 ? "Optimize high-impact queries" : "Implement read replicas for load distribution",
          "Review and optimize database indexes",
          "Implement query caching for frequently accessed data",
        ],
      },
      {
        name: "Query Blackhole",
        ref: this.queryBlackholeChartRef,
        value: queryBlackholeValue,
        status: queryBlackholeStatus,
        trend: this.getMetricTrend("queryBlackhole"),
        description:
          "Query Blackhole simulates scenarios where database queries are dropped or not processed, helping test application resilience to query failures. This metric tracks the percentage of queries being dropped.",
        analysis: `The current query blackhole rate is ${queryBlackholeValue.toFixed(2)}%, which is ${queryBlackholeStatus.toLowerCase()}. ${
          queryBlackholeValue < 5
            ? "This indicates normal query processing with minimal disruption."
            : "This elevated level indicates significant query dropping, which may affect application functionality."
        }`,
        factors: [
          "Database connection stability",
          "Query timeout configurations",
          "Application retry mechanisms",
          "Query prioritization settings",
        ],
        recommendations: [
          queryBlackholeValue < 5 ? "Maintain current query handling" : "Review query timeout settings",
          "Implement robust error handling for failed queries",
          "Set up query retry mechanisms with backoff strategies",
          "Monitor and alert on query failure patterns",
        ],
      },
      {
        name: "Connection Kill",
        ref: this.connectionKillChartRef,
        value: connectionKillValue,
        status: connectionKillStatus,
        trend: this.getMetricTrend("connectionKill"),
        description:
          "Connection Kill simulates database connection failures and terminations, testing application resilience to connection issues. This metric shows the percentage of connections being terminated.",
        analysis: `The current connection kill rate is ${connectionKillValue.toFixed(2)}%, which is ${connectionKillStatus.toLowerCase()}. ${
          connectionKillValue < 10
            ? "This indicates stable connection management with normal termination rates."
            : "This elevated level suggests high connection instability that requires attention."
        }`,
        factors: [
          "Connection pool configuration",
          "Network stability",
          "Database server capacity",
          "Application connection handling",
        ],
        recommendations: [
          connectionKillValue < 10 ? "Maintain current connection settings" : "Review connection pool configuration",
          "Implement connection retry logic",
          "Monitor connection pool metrics",
          "Set up alerts for connection failure patterns",
        ],
      },
      {
        name: "Disk Fault",
        ref: this.diskFaultChartRef,
        value: diskFaultValue,
        status: diskFaultStatus,
        trend: this.getMetricTrend("diskFault"),
        description:
          "Disk Fault simulates storage failures and I/O errors, testing system resilience to disk-related issues. This metric tracks the percentage of disk operations failing.",
        analysis: `The current disk fault rate is ${diskFaultValue.toFixed(2)}%, which is ${diskFaultStatus.toLowerCase()}. ${
          diskFaultValue < 5
            ? "This indicates healthy storage operations with minimal failures."
            : "This elevated level suggests significant storage issues that need investigation."
        }`,
        factors: [
          "Storage hardware health",
          "I/O operation patterns",
          "Disk space utilization",
          "File system performance",
        ],
        recommendations: [
          diskFaultValue < 5 ? "Maintain current storage configuration" : "Investigate storage system health",
          "Implement disk health monitoring",
          "Set up redundant storage systems",
          "Monitor and alert on disk error patterns",
        ],
      },
    ]

    for (const metric of metrics) {
      pdf.addPage()
      pageNumber++
      addPageHeader(pageNumber, totalPages)

      yPosition = margin + 5

      pdf.setFontSize(16)
      pdf.setTextColor(44, 62, 80)
      pdf.text(`${metric.name} Analysis`, margin, yPosition)
      yPosition += 10

      pdf.setFontSize(12)
      pdf.setTextColor(80, 80, 80)

      let valueText = ""
      if (
        metric.name === "Packet Loss" ||
        metric.name === "Query Blackhole" ||
        metric.name === "Connection Kill" ||
        metric.name === "Disk Fault"
      ) {
        valueText = `Current Value: ${metric.value.toFixed(2)}% (Status: ${metric.status})`
      } else if (metric.name === "Latency") {
        valueText = `Current Value: ${metric.value.toFixed(0)} ms (Status: ${metric.status})`
      } else {
        valueText = `Current Value: ${metric.value.toFixed(0)} queries/sec (Status: ${metric.status})`
      }

      pdf.text(valueText, margin, yPosition)
      yPosition += 7

      pdf.text(`Trend: ${metric.trend}`, margin, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      pdf.setTextColor(60, 60, 60)
      pdf.text("Description:", margin, yPosition)
      yPosition += 5

      const descriptionLines = pdf.splitTextToSize(metric.description, contentWidth)
      pdf.text(descriptionLines, margin, yPosition)
      yPosition += descriptionLines.length * 5 + 5

      pdf.text("Analysis:", margin, yPosition)
      yPosition += 5

      const analysisLines = pdf.splitTextToSize(metric.analysis, contentWidth)
      pdf.text(analysisLines, margin, yPosition)
      yPosition += analysisLines.length * 5 + 5

      if (metric.ref && metric.ref.nativeElement) {
        try {
          const canvas = await html2canvas(metric.ref.nativeElement, {
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
            useCORS: true,
            allowTaint: true,
          })

          const imgWidth = contentWidth
          const ratio = canvas.height / canvas.width
          const imgHeight = Math.min(imgWidth * ratio, 60)

          const imgData = canvas.toDataURL("image/png")
          pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight)

          yPosition += imgHeight + 10
        } catch (error) {
          console.error(`Error capturing ${metric.name} chart:`, error)
          pdf.text(`Error rendering ${metric.name} chart`, margin, yPosition)
          yPosition += 10
        }
      }

      pdf.setFontSize(12)
      pdf.setTextColor(44, 62, 80)
      pdf.text("Contributing Factors", margin, yPosition)
      yPosition += 7

      pdf.setFontSize(10)
      pdf.setTextColor(60, 60, 60)

      for (const factor of metric.factors) {
        pdf.text(`• ${factor}`, margin + 3, yPosition)
        yPosition += 5
      }

      yPosition += 5

      pdf.setFontSize(12)
      pdf.setTextColor(44, 62, 80)
      pdf.text("Recommendations", margin, yPosition)
      yPosition += 7

      pdf.setFontSize(10)
      pdf.setTextColor(60, 60, 60)

      for (const recommendation of metric.recommendations) {
        pdf.text(`• ${recommendation}`, margin + 3, yPosition)
        yPosition += 5
      }

      addPageFooter(pageNumber)
    }

    // Conclusion and Next Steps
    pdf.addPage()
    pageNumber++
    addPageHeader(pageNumber, totalPages)

    yPosition = margin + 5

    pdf.setFontSize(16)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Conclusion and Next Steps", margin, yPosition)
    yPosition += 10

    pdf.setFontSize(10)
    pdf.setTextColor(60, 60, 60)

    const conclusionText =
      "Based on the analysis of all six scenarios (Packet Loss, Latency, Query Load, Query Blackhole, Connection Kill, and Disk Fault), the system demonstrates varying levels of resilience to different types of failures. The metrics indicate how the system performs under network issues, database query problems, connection failures, and storage disruptions. This comprehensive testing approach helps ensure the system can handle a wide range of real-world challenges."
    const conclusionLines = pdf.splitTextToSize(conclusionText, contentWidth)
    pdf.text(conclusionLines, margin, yPosition)
    yPosition += conclusionLines.length * 5 + 10

    pdf.setFontSize(12)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Recommended Next Steps", margin, yPosition)
    yPosition += 7

    pdf.setFontSize(10)
    pdf.setTextColor(60, 60, 60)

    const nextSteps = [
      "Schedule regular scenario testing to validate system resilience",
      "Implement automated alerting for critical metric thresholds",
      "Review and optimize database connection handling",
      "Enhance storage system redundancy and error handling",
      "Document baseline performance metrics for all scenarios",
      "Develop recovery procedures for each failure scenario",
      "Set up monitoring dashboards for all six scenarios",
      "Plan capacity upgrades based on scenario test results",
    ]

    for (const step of nextSteps) {
      pdf.text(`• ${step}`, margin + 3, yPosition)
      yPosition += 5
    }

    addPageFooter(pageNumber)

    totalPages = pageNumber

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      if (i > 1) {
        addPageHeader(i, totalPages)
      }
    }

    pdf.save("scenarios-dashboard-detailed-report.pdf")
    this.loading = false
  }

  getScenarioStatus(scenarioName: string): string {
    const scenario = this.scenarios.find((s) => s.originalName === scenarioName)
    if (!scenario) {
      console.warn(`Scenario ${scenarioName} not found in scenarios list`, this.scenarios)
      return "Inactive"
    }
    return scenario.enabled ? "Active" : "Inactive"
  }

  checkScenarioState(scenarioName: string): void {
    const scenario = this.scenarios.find((s) => s.originalName === scenarioName)
    console.log("Checking scenario state:", {
      name: scenarioName,
      found: !!scenario,
      enabled: scenario?.enabled,
      allScenarios: this.scenarios,
    })
  }

  private startPolling(): void {
    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchScenarios()),
      )
      .subscribe({
        next: (data) => {
          data.forEach((backendScenario) => {
            const scenario = this.scenarios.find((s) => s.originalName === backendScenario.name)
            if (scenario) {
              scenario.enabled = backendScenario.enabled
            }
          })
          this.loading = false
        },
        error: (err) => {
          this.error = "Failed to load scenarios: " + err.message
          this.loading = false
        },
      })

    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchMetrics()),
      )
      .subscribe({
        next: (data) => {
          console.log("Fetched metrics:", data)
          this.updateMetrics(data)
          this.updateCharts()
          this.updateLastUpdated()
        },
        error: (err) => {
          console.error("Failed to load metrics:", err)
        },
      })
  }

  getHealthCardClass(metricType: string): string {
    const status = this.getHealthStatus(metricType)
    return `health-${status.toLowerCase()}`
  }

  getHealthIconClass(metricType: string): string {
    const status = this.getHealthStatus(metricType)
    return `health-icon health-${status.toLowerCase()}`
  }

  getHealthStatusClass(metricType: string): string {
    const status = this.getHealthStatus(metricType)
    return `status-${status.toLowerCase()}`
  }

  getHealthStatus(metricType: string): string {
    let value = 0

    switch (metricType) {
      case "packetLoss":
        value = this.getMetricValue("packetLoss")
        return value < 1 ? "Excellent" : value < 3 ? "Good" : value < 5 ? "Warning" : "Critical"

      case "latency":
        value = this.getMetricValue("latency")
        return value < 100 ? "Excellent" : value < 300 ? "Good" : value < 500 ? "Warning" : "Critical"

      case "queryLoad":
        value = this.getMetricValue("queryLoad")
        return value < 100 ? "Excellent" : value < 200 ? "Good" : value < 300 ? "Warning" : "Critical"

      case "overall":
        return this.getOverallHealthStatus()

      default:
        return "Good"
    }
  }

  // For scenarios dashboard - overall health calculation
  // For scenarios dashboard - overall health calculation
getOverallHealthScore(): number {
  const packetLoss = this.getMetricValue("packetLoss");
  const latency = this.getMetricValue("latency");
  const queryLoad = this.getMetricValue("queryLoad");
  const queryBlackhole = this.getMetricValue("queryBlackhole");
  const connectionKill = this.getMetricValue("connectionKill");
  const diskFault = this.getMetricValue("diskFault");

  // Calculate weighted health score
  const packetLossScore = Math.max(0, 100 - packetLoss * 20); // 20 points per 1% packet loss
  const latencyScore = Math.max(0, 100 - latency / 10); // 10 points per 100ms latency
  const queryLoadScore = Math.max(0, 100 - queryLoad / 5); // 20 points per 100 queries/sec
  const queryBlackholeScore = Math.max(0, 100 - queryBlackhole * 10); // 10 points per 1% blackhole rate
  const connectionKillScore = Math.max(0, 100 - connectionKill * 10); // 10 points per 1% connection kill rate
  const diskFaultScore = Math.max(0, 100 - diskFault * 20); // 20 points per 1% disk fault rate

  return Math.round((packetLossScore + latencyScore + queryLoadScore + queryBlackholeScore + connectionKillScore + diskFaultScore) / 6);
}

  getOverallHealthStatus(): string {
    const score = this.getOverallHealthScore()
    return score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Warning" : "Critical"
  }
}