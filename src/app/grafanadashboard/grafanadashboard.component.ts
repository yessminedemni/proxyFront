import { Component, type OnInit, ViewChild, type ElementRef, type AfterViewInit, type OnDestroy } from "@angular/core"
import Chart from "chart.js/auto"
import { interval, Observable, Subscription } from "rxjs"
import { startWith, switchMap } from "rxjs/operators"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { HttpClientModule } from "@angular/common/http"
import { RouterModule } from "@angular/router"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { PrometheusService } from "../services/PrometheusService .service"

interface MetricCard {
  id: string
  title: string
  description: string
  query: string
  unit: string
  chartType: "line" | "bar" | "pie" | "doughnut"
  chartRef?: ElementRef
  chart?: Chart
  data: {
    labels: string[]
    values: number[]
  }
  color: string
  // Additional fields for PDF report
  detailedDescription?: string
  interpretation?: string
  recommendations?: string[]
  thresholds?: {
    warning: number
    critical: number
  }
}

@Component({
  selector: "app-grafanadashboard",
  templateUrl: "./grafanadashboard.component.html",
  styleUrls: ["./grafanadashboard.component.scss"],
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterModule],
})
export class GrafanadashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("cpuChart") cpuChartRef!: ElementRef
  @ViewChild("heapMemoryChart") heapMemoryChartRef!: ElementRef
  @ViewChild("nonHeapMemoryChart") nonHeapMemoryChartRef!: ElementRef
  @ViewChild("threadChart") threadChartRef!: ElementRef
  @ViewChild("gcCollectionChart") gcCollectionChartRef!: ElementRef
  @ViewChild("classesChart") classesChartRef!: ElementRef

  loading = false
  generatingPdf = false
  lastUpdated: Date = new Date()
  searchTerm = ""
  refreshInterval = 1000
  private subscriptions: Subscription = new Subscription()

  metricCards: MetricCard[] = [
    {
      id: "cpu",
      title: "CPU Usage",
      description: "Real-time CPU usage (%)",
      query: 'rate(process_cpu_seconds_total{instance="localhost:8083", job="application-jmx"}[1m]) * 100',
      unit: "%",
      chartType: "line",
      data: { labels: [], values: [] },
      color: "rgba(75, 192, 192, 1)",
      detailedDescription:
        "CPU usage represents the percentage of time the CPU spends executing non-idle threads from your application. High CPU usage may indicate computation-intensive tasks, inefficient code, or potential bottlenecks in your application.",
      interpretation:
        "CPU usage should generally stay below 70% for optimal performance. Sustained high CPU usage can lead to degraded application performance and increased response times.",
      recommendations: [
        "Optimize CPU-intensive operations and algorithms",
        "Consider implementing caching for frequently accessed data",
        "Use asynchronous processing for CPU-bound tasks",
        "Scale horizontally by adding more instances if consistently high",
      ],
      thresholds: {
        warning: 70,
        critical: 90,
      },
    },
    {
      id: "heapMemory",
      title: "Heap Memory Usage",
      description: "Current heap memory usage in MB",
      query: 'java_lang_memory_heap_used_bytes{instance="localhost:8083", job="application-jmx"}',
      unit: "MB",
      chartType: "line",
      data: { labels: [], values: [] },
      color: "rgba(255, 99, 132, 1)",
      detailedDescription:
        "Heap memory is the runtime data area from which memory for all class instances and arrays is allocated. The JVM heap size can be configured with -Xms and -Xmx parameters. Monitoring heap usage helps identify memory leaks and optimize garbage collection.",
      interpretation:
        "Heap memory usage should ideally stay below 75% of the maximum allocated heap to allow for efficient garbage collection. Consistently high heap usage may indicate memory leaks or insufficient heap allocation.",
      recommendations: [
        "Review code for memory leaks, especially in long-running applications",
        "Consider increasing heap size if consistently high",
        "Implement proper object lifecycle management",
        "Use memory profiling tools to identify memory-intensive components",
      ],
      thresholds: {
        warning: 75,
        critical: 90,
      },
    },
    {
      id: "nonHeapMemory",
      title: "Non-Heap Memory Usage",
      description: "Current non-heap memory usage in MB",
      query: 'java_lang_memory_nonheap_used_bytes{instance="localhost:8083", job="application-jmx"}',
      unit: "MB",
      chartType: "line",
      data: { labels: [], values: [] },
      color: "rgba(54, 162, 235, 1)",
      detailedDescription:
        "Non-heap memory includes the method area, which stores class structures, methods, constant pools, and other class metadata. It also includes memory used for the JIT compiler, native libraries, and thread stacks. Unlike heap memory, non-heap memory is not subject to garbage collection in the same way.",
      interpretation:
        "Non-heap memory usage typically grows during application startup and then stabilizes. Continuous growth may indicate class loading issues or native memory leaks. High usage can impact application performance and stability.",
      recommendations: [
        "Limit dynamic class loading and unloading when possible",
        "Monitor for native memory leaks using tools like NMT (Native Memory Tracking)",
        "Consider using fewer third-party libraries to reduce class loading",
        "Optimize JNI (Java Native Interface) usage if applicable",
      ],
      thresholds: {
        warning: 80,
        critical: 95,
      },
    },
    {
      id: "thread",
      title: "Thread Count",
      description: "Current number of active threads",
      query: 'jvm_threads_current{instance="localhost:8083", job="application-jmx"}',
      unit: "",
      chartType: "line",
      data: { labels: [], values: [] },
      color: "rgba(255, 159, 64, 1)",
      detailedDescription:
        "Thread count represents the number of active threads in the JVM, including both application threads and system threads. Each thread consumes memory for its stack and adds overhead for context switching. Monitoring thread count helps identify potential thread leaks and optimize thread pool configurations.",
      interpretation:
        "Thread count should remain relatively stable during normal operation. A continuously increasing thread count may indicate thread leaks. Too many threads can lead to excessive context switching and degraded performance.",
      recommendations: [
        "Use thread pools with appropriate sizing for your workload",
        "Ensure threads are properly terminated when no longer needed",
        "Monitor for thread leaks (continuously increasing thread count)",
        "Consider using virtual threads (Project Loom) for high-concurrency scenarios in newer Java versions",
      ],
      thresholds: {
        warning: 100,
        critical: 200,
      },
    },
    {
      id: "gcCollection",
      title: "GC Collection Time",
      description: "Time spent in garbage collection in seconds",
      query: 'sum(jvm_gc_collection_seconds_sum{instance="localhost:8083", job="application-jmx"}) by (gc)',
      unit: "s",
      chartType: "bar",
      data: { labels: [], values: [] },
      color: "rgba(153, 102, 255, 1)",
      detailedDescription:
        "Garbage Collection (GC) time measures how long the JVM spends collecting unused objects and reclaiming memory. GC pauses can cause application latency and affect user experience. Different GC algorithms (like G1, ZGC, Parallel) have different performance characteristics.",
      interpretation:
        "GC time should typically be less than 5% of total application time. Frequent or long GC pauses indicate memory pressure or suboptimal GC configuration. High GC activity often correlates with high heap memory usage.",
      recommendations: [
        "Tune GC parameters based on application needs (-XX flags)",
        "Consider using G1GC for balanced throughput and latency",
        "For low-latency applications, evaluate ZGC or Shenandoah",
        "Optimize object creation and lifecycle to reduce GC pressure",
        "Size heap appropriately to balance between too frequent GC and too long GC pauses",
      ],
      thresholds: {
        warning: 5,
        critical: 10,
      },
    },
    {
      id: "classes",
      title: "Loaded Classes",
      description: "Number of classes currently loaded in the JVM",
      query: 'jvm_classes_currently_loaded{instance="localhost:8083", job="application-jmx"}',
      unit: "",
      chartType: "line",
      data: { labels: [], values: [] },
      color: "rgba(201, 203, 207, 1)",
      detailedDescription:
        "Loaded classes represent the number of Java classes currently loaded into the JVM. Each loaded class consumes memory in the metaspace (or PermGen in older Java versions). Class loading and unloading patterns can impact application startup time and memory usage.",
      interpretation:
        "The number of loaded classes typically increases during application startup and then stabilizes. A continuously increasing count may indicate issues with classloaders or dynamic class generation. Too many loaded classes can increase memory usage and startup time.",
      recommendations: [
        "Minimize unnecessary dynamic class generation",
        "Use appropriate classloader hierarchies to allow class unloading",
        "Consider using fewer third-party libraries to reduce class count",
        "For applications with many classes, tune metaspace size appropriately",
      ],
      thresholds: {
        warning: 10000,
        critical: 20000,
      },
    },
  ]

  constructor(private prometheusService: PrometheusService) {}

  ngOnInit(): void {
    const refreshSub = interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => {
          // Only show loading indicator on initial load, not during regular refreshes
          const isInitialLoad = this.metricCards.some((card) => card.data.values.length === 0)
          if (isInitialLoad) {
            this.loading = true
          }
          return this.fetchAllMetricsData()
        }),
      )
      .subscribe({
        next: () => {
          this.loading = false
          this.lastUpdated = new Date()
          this.updateAllCharts()
        },
        error: (err) => {
          console.error("Error fetching metrics data:", err)
          this.loading = false
        },
      })

    this.subscriptions.add(refreshSub)
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeAllCharts()
    }, 100)
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe()
    this.metricCards.forEach((card) => {
      if (card.chart) {
        card.chart.destroy()
      }
    })
  }

  initializeAllCharts(): void {
    const chartRefs = {
      cpu: this.cpuChartRef,
      heapMemory: this.heapMemoryChartRef,
      nonHeapMemory: this.nonHeapMemoryChartRef,
      thread: this.threadChartRef,
      gcCollection: this.gcCollectionChartRef,
      classes: this.classesChartRef,
    }

    this.metricCards.forEach((card) => {
      const chartRef = chartRefs[card.id as keyof typeof chartRefs]
      if (chartRef?.nativeElement) {
        card.chart = this.createChart(chartRef.nativeElement, card)
      }
    })
  }

  createChart(canvas: HTMLCanvasElement, card: MetricCard): Chart {
    return new Chart(canvas, {
      type: card.chartType,
      data: {
        labels: [],
        datasets: [
          {
            label: `${card.title} (${card.unit})`,
            data: [],
            borderColor: card.color,
            backgroundColor:
              card.chartType === "line" ? this.getBackgroundColor(card.color) : this.generateColorArray(card.color, 6),
            tension: 0.1,
            fill: card.chartType === "line",
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: card.color,
            pointBorderColor: "#fff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: card.color,
            pointHoverBorderColor: "#fff",
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
            callbacks: {
              label: (context) => `${card.title}: ${context.parsed.y.toFixed(2)} ${card.unit}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `${value}${card.unit ? " " + card.unit : ""}`,
            },
            title: {
              display: true,
              text: card.unit ? `${card.title} (${card.unit})` : card.title,
            },
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0,
            },
          },
        },
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false,
        },
      },
    })
  }

  fetchAllMetricsData(): Observable<any> {
    return new Observable((observer) => {
      const promises = this.metricCards.map((card) => this.fetchMetricData(card))
      Promise.all(promises)
        .then((results) => observer.next(results))
        .catch((err) => observer.error(err))
        .finally(() => observer.complete())
    })
  }

  async fetchMetricData(card: MetricCard): Promise<any> {
    return new Promise((resolve, reject) => {
      this.prometheusService.getMetricData(card.query).subscribe({
        next: (response) => {
          if (response && response.data?.result?.length) {
            const results = response.data.result
            const timestamp = new Date().toLocaleTimeString()

            if (card.chartType === "bar") {
              card.data.labels = results.map(
                (item: { metric: { gc: any; instance: any } }) => item.metric.gc || item.metric.instance || "Unknown",
              )
              card.data.values = results.map((item: { value: string[] }) =>
                this.convertMetric(Number.parseFloat(item.value[1]), card.unit),
              )
            } else {
              if (card.data.labels.length >= 10) {
                card.data.labels.shift()
                card.data.values.shift()
              }
              card.data.labels.push(timestamp)

              if (results.length === 1) {
                const value = this.convertMetric(Number.parseFloat(results[0].value[1]), card.unit)
                card.data.values.push(value)
              } else {
                const sum = results.reduce(
                  (acc: number, item: { value: string[] }) => acc + Number.parseFloat(item.value[1]),
                  0,
                )
                const converted = this.convertMetric(sum, card.unit)
                card.data.values.push(converted)
              }
            }
          }
          resolve(true)
        },
        error: (error) => {
          console.error(`Error fetching data for ${card.title}:`, error)
          reject(error)
        },
      })
    })
  }

  convertMetric(value: number, unit: string): number {
    if (unit === "MB") return +(value / 1024 / 1024).toFixed(2)
    if (unit === "GB") return +(value / 1024 / 1024 / 1024).toFixed(2)
    if (unit === "%") return +value.toFixed(1)
    return +value.toFixed(2)
  }

  updateAllCharts(): void {
    this.metricCards.forEach((card) => {
      if (card.chart) {
        card.chart.data.labels = card.data.labels
        card.chart.data.datasets[0].data = card.data.values
        card.chart.update()
      }
    })
  }

  matchesSearch(term: string): boolean {
    if (!this.searchTerm) return true
    const search = this.searchTerm.toLowerCase()
    return term.toLowerCase().includes(search)
  }

  noMatchingMetricsFound(): boolean {
    if (!this.searchTerm) return false
    return !this.metricCards.some((card) => this.matchesSearch(card.title))
  }

  getBackgroundColor(color: string): string {
    return color.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)/, "rgba($1, $2, $3, 0.2)")
  }

  generateColorArray(baseColor: string, count: number): string[] {
    const colors = []
    const rgbMatch = baseColor.match(/rgba?\((\d+), \s*(\d+),\s*(\d+)/)
    if (rgbMatch) {
      const r = Number.parseInt(rgbMatch[1], 10)
      const g = Number.parseInt(rgbMatch[2], 10)
      const b = Number.parseInt(rgbMatch[3], 10)
      for (let i = 0; i < count; i++) {
        colors.push(`rgba(${r}, ${g}, ${b}, ${0.3 + i * 0.1})`)
      }
    } else {
      for (let i = 0; i < count; i++) {
        colors.push(baseColor)
      }
    }
    return colors
  }

  // Get the current value of a metric
  getCurrentMetricValue(card: MetricCard): number {
    if (card.data.values.length === 0) return 0
    return card.data.values[card.data.values.length - 1]
  }

  // Get the trend of a metric
  getMetricTrend(card: MetricCard): string {
    const values = card.data.values
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
      return `Increasing at ${changeRate}${card.unit} per interval`
    } else if (decreasing > increasing) {
      return `Decreasing at ${changeRate}${card.unit} per interval`
    } else {
      return "Stable - No significant change"
    }
  }

  // Get the status of a metric based on thresholds
  getMetricStatus(card: MetricCard): { status: string; color: number[] } {
    if (!card.thresholds) return { status: "Unknown", color: [128, 128, 128] }

    const currentValue = this.getCurrentMetricValue(card)

    if (currentValue >= card.thresholds.critical) {
      return { status: "Critical", color: [231, 76, 60] } // Red
    } else if (currentValue >= card.thresholds.warning) {
      return { status: "Warning", color: [243, 156, 18] } // Orange
    } else {
      return { status: "Normal", color: [46, 204, 113] } // Green
    }
  }

  // Get recommendations based on current status
  getMetricRecommendations(card: MetricCard): string[] {
    if (!card.recommendations) return ["No recommendations available"]

    const { status } = this.getMetricStatus(card)

    if (status === "Critical") {
      return card.recommendations
    } else if (status === "Warning") {
      return card.recommendations.slice(0, 2) // Return first two recommendations for warning state
    } else {
      return card.recommendations.slice(0, 1) // Return first recommendation for normal state
    }
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
      title: "JVM Metrics Report",
      subject: "JVM Performance Analysis",
      author: "JVM Metrics Dashboard",
      keywords: "JVM, metrics, performance, monitoring, analysis",
      creator: "JVM Metrics Dashboard Application",
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
      pdf.text(`JVM Metrics Report - Page ${pageNumber} of ${totalPages}`, pageWidth - margin, margin - 5, {
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
      pdf.text("© JVM Metrics Dashboard - For internal use only", margin, footerPosition)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerPosition, { align: "right" })
    }

    // Start with page 1
    let pageNumber = 1
    let totalPages = 1 // We'll update this later

    // Add cover page
    pdf.setFontSize(24)
    pdf.setTextColor(44, 62, 80)
    pdf.text("JVM Metrics Dashboard", pageWidth / 2, 60, { align: "center" })
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
    pdf.text("This report provides a comprehensive analysis of JVM performance metrics", pageWidth / 2, 100, {
      align: "center",
    })
    pdf.text("including CPU usage, memory utilization, thread count, and garbage collection.", pageWidth / 2, 106, {
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
      "This report provides a detailed analysis of JVM performance metrics collected from your application. The data presented here reflects the current state of your JVM and highlights potential areas of concern or improvement. Regular monitoring of these metrics helps ensure optimal application performance and stability."

    // Split text into multiple lines
    const splitSummary = pdf.splitTextToSize(summaryText, contentWidth)
    pdf.text(splitSummary, margin, yPosition)
    yPosition += splitSummary.length * 5 + 5

    // Key Metrics Overview
    pdf.setFontSize(14)
    pdf.setTextColor(44, 62, 80)
    pdf.text("Key Metrics Overview", margin, yPosition)
    yPosition += 8

    // Create metric summary boxes
    const boxWidth = contentWidth / 2 - 4
    const boxHeight = 30
    let boxX = margin
    let boxY = yPosition

    // Draw metric boxes in a 3x2 grid
    this.metricCards.forEach((card, index) => {
      const currentValue = this.getCurrentMetricValue(card)
      const { status, color } = this.getMetricStatus(card)

      // Calculate box position (2 columns, 3 rows)
      if (index % 2 === 0) {
        boxX = margin
      } else {
        boxX = margin + boxWidth + 8
      }

      if (index % 2 === 0 && index > 0) {
        boxY += boxHeight + 8
      }

      // Draw box
      pdf.setFillColor(250, 250, 250)
      pdf.setDrawColor(220, 220, 220)
      pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, "FD")

      // Add metric title
      pdf.setFontSize(10)
      pdf.setTextColor(80, 80, 80)
      pdf.text(card.title, boxX + 5, boxY + 8)

      // Add current value
      pdf.setFontSize(14)
      pdf.setTextColor(color[0], color[1], color[2])
      pdf.text(`${currentValue.toFixed(2)}${card.unit}`, boxX + 5, boxY + 20)

      // Add status
      pdf.setFontSize(8)
      pdf.text(`Status: ${status}`, boxX + boxWidth - 40, boxY + 20)
    })

    yPosition = boxY + boxHeight + 15

    // Add footer
    addPageFooter(pageNumber)

    // Process each metric with detailed information
    const processMetrics = async () => {
      for (const card of this.metricCards) {
        // Add a new page for each metric
        pdf.addPage()
        pageNumber++
        addPageHeader(pageNumber, totalPages)

        yPosition = margin + 5

        // Metric Title
        pdf.setFontSize(16)
        pdf.setTextColor(44, 62, 80)
        pdf.text(`${card.title} Analysis`, margin, yPosition)
        yPosition += 10

        // Current Value and Status
        const currentValue = this.getCurrentMetricValue(card)
        const { status, color } = this.getMetricStatus(card)

        pdf.setFontSize(12)
        pdf.setTextColor(80, 80, 80)
        pdf.text(`Current Value: ${currentValue.toFixed(2)}${card.unit} (Status: ${status})`, margin, yPosition)
        yPosition += 7

        // Trend
        const trend = this.getMetricTrend(card)
        pdf.text(`Trend: ${trend}`, margin, yPosition)
        yPosition += 10

        // Description
        pdf.setFontSize(10)
        pdf.setTextColor(60, 60, 60)
        pdf.text("Description:", margin, yPosition)
        yPosition += 5

        const descriptionLines = pdf.splitTextToSize(card.detailedDescription || card.description, contentWidth)
        pdf.text(descriptionLines, margin, yPosition)
        yPosition += descriptionLines.length * 5 + 5

        // Interpretation
        if (card.interpretation) {
          pdf.setFontSize(10)
          pdf.setTextColor(60, 60, 60)
          pdf.text("Interpretation:", margin, yPosition)
          yPosition += 5

          const interpretationLines = pdf.splitTextToSize(card.interpretation, contentWidth)
          pdf.text(interpretationLines, margin, yPosition)
          yPosition += interpretationLines.length * 5 + 5
        }

        // Chart
        if (card.chart) {
          try {
            const chartRef = card.chart.canvas
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
            console.error(`Error capturing ${card.title} chart:`, error)
            pdf.text(`Error rendering ${card.title} chart`, margin, yPosition)
            yPosition += 10
          }
        }

        // Thresholds
        if (card.thresholds) {
          pdf.setFontSize(12)
          pdf.setTextColor(44, 62, 80)
          pdf.text("Thresholds", margin, yPosition)
          yPosition += 7

          pdf.setFontSize(10)
          pdf.setTextColor(60, 60, 60)

          pdf.text(`• Warning: ${card.thresholds.warning}${card.unit}`, margin + 3, yPosition)
          yPosition += 5
          pdf.text(`• Critical: ${card.thresholds.critical}${card.unit}`, margin + 3, yPosition)
          yPosition += 10
        }

        // Recommendations
        if (card.recommendations && card.recommendations.length > 0) {
          pdf.setFontSize(12)
          pdf.setTextColor(44, 62, 80)
          pdf.text("Recommendations", margin, yPosition)
          yPosition += 7

          pdf.setFontSize(10)
          pdf.setTextColor(60, 60, 60)

          for (const recommendation of card.recommendations) {
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
        "Based on the analysis of the current JVM metrics, the application is performing within expected parameters. Regular monitoring and proactive maintenance are recommended to ensure optimal performance and prevent potential issues."

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
        "Schedule a review meeting to discuss the findings of this report",
        "Implement automated alerting for critical metric thresholds",
        "Optimize JVM parameters based on the observed metrics",
        "Consider application-specific optimizations for high-usage areas",
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
      pdf.save("jvm-metrics-detailed-report.pdf")
      this.loading = false
      this.generatingPdf = false
    }

    // Execute metric processing
    processMetrics()
  }

  refreshData(): void {
    this.loading = true
    this.fetchAllMetricsData().subscribe({
      next: () => {
        this.loading = false
        this.lastUpdated = new Date()
        this.updateAllCharts()
      },
      error: (err) => {
        console.error("Error fetching metrics data:", err)
        this.loading = false
      },
    })
  }
}
