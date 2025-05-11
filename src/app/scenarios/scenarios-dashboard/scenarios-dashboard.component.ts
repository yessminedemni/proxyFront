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
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
  standalone: true,
})
export class ScenariosDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild("packetLossChart") packetLossChartRef: ElementRef | undefined
  @ViewChild("latencyChart") latencyChartRef: ElementRef | undefined
  @ViewChild("queryLoadChart") queryLoadChartRef: ElementRef | undefined

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
  lastUpdated: Date | null = null

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.updateLastUpdated()

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
    // Fetch scenarios and metrics
    this.fetchScenarios().subscribe({
      next: (data) => {
        this.scenarios = data.map((scenario) => ({
          ...scenario,
          description: this.scenarioDescriptions[scenario.name] || "No description available",
        }))

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

  getMetricValue(name: "packetLoss" | "latency" | "queryLoad"): number {
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
    
    const analysisLines = pdf.splitTextToSize(metric.analysis, contentWidth);
    pdf.text(analysisLines, margin, yPosition);
    yPosition += analysisLines.length * 5 + 5;

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
  
  const conclusionText = "Based on the analysis of the current metrics, the system is performing within expected parameters. However, continuous monitoring and proactive maintenance are recommended to ensure optimal performance and prevent potential issues.";
  
  const conclusionLines = pdf.splitTextToSize(conclusionText, contentWidth);
  pdf.text(conclusionLines, margin, yPosition);
  yPosition += conclusionLines.length * 5 + 10;
  
  // Next Steps
  pdf.setFontSize(12);
  pdf.setTextColor(44, 62, 80);
  pdf.text("Recommended Next Steps", margin, yPosition);
  yPosition += 7;
  
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  
  const nextSteps = [
    "Schedule a review meeting to discuss the findings of this report",
    "Prioritize implementation of the recommendations based on impact and effort",
    "Establish regular performance testing and monitoring schedules",
    "Document baseline performance metrics for future comparison",
    "Develop automated alerting for critical metric thresholds",
    "Plan capacity upgrades based on growth projections"
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
}