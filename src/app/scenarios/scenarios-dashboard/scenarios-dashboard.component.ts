import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from "@angular/core";
import { Observable, interval, of } from "rxjs";
import { switchMap, startWith, catchError, map } from "rxjs/operators";
import Chart from "chart.js/auto";
import { HttpClient } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Scenario {
  id: number;
  name: string;
  originalName: string;
  enabled: boolean;
  description: string;
}

interface MetricData {
  timestamp: number;
  value: number;
}

interface ScenarioMetrics {
  packetLoss: MetricData[];
  latency: MetricData[];
  queryLoad: MetricData[];
  queryBlackhole: MetricData[];
  connectionKill: MetricData[];
  diskFault: MetricData[];
}

@Component({
  selector: "app-scenarios-dashboard",
  templateUrl: "./scenarios-dashboard.component.html",
  styleUrls: ["./scenarios-dashboard.component.scss"],
  imports: [CommonModule, FormsModule, RouterModule],
  standalone: true,
})
export class ScenariosDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild("packetLossChart") packetLossChartRef: ElementRef | undefined;
  @ViewChild("latencyChart") latencyChartRef: ElementRef | undefined;
  @ViewChild("queryLoadChart") queryLoadChartRef: ElementRef | undefined;
  @ViewChild("queryBlackholeChart") queryBlackholeChartRef: ElementRef | undefined;
  @ViewChild("connectionKillChart") connectionKillChartRef: ElementRef | undefined;
  @ViewChild("diskFaultChart") diskFaultChartRef: ElementRef | undefined;

  scenarios: Scenario[] = [];
  loading = true;
  error = "";
  refreshInterval = 10000;
  activeTab = "metrics";
  searchTerm = "";

  packetLossChart: Chart | undefined;
  latencyChart: Chart | undefined;
  queryLoadChart: Chart | undefined;
  queryBlackholeChart: Chart | undefined;
  connectionKillChart: Chart | undefined;
  diskFaultChart: Chart | undefined;

  metrics: ScenarioMetrics = {
    packetLoss: [],
    latency: [],
    queryLoad: [],
    queryBlackhole: [],
    connectionKill: [],
    diskFault: [],
  };

  thresholds = {
    packetLoss: 5,
    latency: 2000,
    queryLoad: 100,
  };

  scenarioDescriptions: Record<string, string> = {
    stress_testing: "Runs intensive database queries to test system performance under load",
    packet_loss: "Simulates network packet loss between client and server",
    latency_injection: "Adds artificial delay to database responses based on query type",
    query_blackhole: "Simulates scenarios where queries are dropped or not processed",
    connection_kill: "Simulates database connection failures and terminations",
    disk_fault: "Simulates disk I/O errors and storage failures",
  };

  lastUpdated: Date | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.scenarios = [
      { id: 1, name: "Packet Loss", originalName: "packet_loss", enabled: false, description: this.scenarioDescriptions["packet_loss"] },
      { id: 2, name: "Latency", originalName: "latency_injection", enabled: false, description: this.scenarioDescriptions["latency_injection"] },
      { id: 3, name: "Query Load", originalName: "stress_testing", enabled: false, description: this.scenarioDescriptions["stress_testing"] },
      { id: 4, name: "Query Blackhole", originalName: "query_blackhole", enabled: false, description: this.scenarioDescriptions["query_blackhole"] },
      { id: 5, name: "Connection Kill", originalName: "connection_kill", enabled: false, description: this.scenarioDescriptions["connection_kill"] },
      { id: 6, name: "Disk Fault", originalName: "disk_fault", enabled: false, description: this.scenarioDescriptions["disk_fault"] },
    ];

    this.startPolling();
  }

  startPolling(): void {
    interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => this.fetchScenarios())
      )
      .subscribe({
        next: (data) => {
          this.scenarios = data.map((scenario) => ({
            ...scenario,
            description: this.scenarioDescriptions[scenario.originalName] || "No description available",
          }));
          this.fetchMetrics().subscribe({
            next: (metricsData) => {
              this.updateMetrics(metricsData);
              this.updateCharts();
              this.loading = false;
              this.updateLastUpdated();
            },
            error: (err) => {
              console.error("Failed to load metrics:", err);
              this.loading = false;
            },
          });
        },
        error: (err) => {
          this.error = "Failed to load scenarios: " + err.message;
          this.loading = false;
        },
      });
  }

  updateLastUpdated(): void {
    this.lastUpdated = new Date();
  }

  refreshData(): void {
    this.loading = true;
    console.log("Refreshing data...");

    this.fetchScenarios().subscribe({
      next: (data) => {
        this.scenarios = data.map((scenario) => ({
          ...scenario,
          description: this.scenarioDescriptions[scenario.originalName] || "No description available",
        }));
        console.log("Updated scenarios:", this.scenarios);

        this.fetchMetrics().subscribe({
          next: (metricsData) => {
            this.updateMetrics(metricsData);
            this.updateCharts();
            this.loading = false;
            this.updateLastUpdated();
          },
          error: (err) => {
            console.error("Failed to load metrics:", err);
            this.loading = false;
          },
        });
      },
      error: (err) => {
        this.error = "Failed to load scenarios: " + err.message;
        this.loading = false;
      },
    });
  }

  ngAfterViewInit(): void {
    this.initializeCharts();
  }

  getLatestMetricValue(metricName: keyof ScenarioMetrics): number {
    const metricData = this.metrics[metricName];
    return metricData.length ? metricData[metricData.length - 1].value : 0;
  }

  matchesSearch(label: string): boolean {
    return label.toLowerCase().includes(this.searchTerm.toLowerCase());
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
            legend: { display: true, position: "top", labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } } },
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "packet_loss")?.enabled;
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`;
                },
              },
            },
            title: { display: false, text: "Network Packet Loss" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 25,
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
      });
    }

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
            legend: { display: true, position: "top", labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } } },
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "latency_injection")?.enabled;
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`;
                },
              },
            },
            title: { display: false, text: "Database Response Latency" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 5000,
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
      });
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
                const value = context.raw as number;
                return value > this.thresholds.queryLoad ? "rgba(255, 99, 132, 0.7)" : "rgba(75, 192, 192, 0.7)";
              },
              borderColor: (context) => {
                const value = context.raw as number;
                return value > this.thresholds.queryLoad ? "rgb(255, 99, 132)" : "rgb(75, 192, 192)";
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
            legend: { display: true, position: "top", labels: { boxWidth: 12, usePointStyle: true, pointStyle: "rect", font: { size: 12 } } },
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "stress_testing")?.enabled;
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`;
                },
              },
            },
            title: { display: false, text: "Database Query Load" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 350,
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
      });
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
            legend: { display: true, position: "top", labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } } },
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "query_blackhole")?.enabled;
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`;
                },
              },
            },
            title: { display: false, text: "Query Blackhole Rate" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 50,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + "%" },
              title: { display: true, text: "Query Blackhole Rate (%)", color: "#666", font: { size: 12, weight: "normal" } },
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
      });
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
            legend: { display: true, position: "top", labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } } },
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "connection_kill")?.enabled;
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`;
                },
              },
            },
            title: { display: false, text: "Connection Kill Rate" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 50,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + "%" },
              title: { display: true, text: "Connection Kill Rate (%)", color: "#666", font: { size: 12, weight: "normal" } },
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
      });
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
            legend: { display: true, position: "top", labels: { boxWidth: 12, usePointStyle: true, pointStyle: "circle", font: { size: 12 } } },
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
                  const isEnabled = this.scenarios.find((s) => s.originalName === "disk_fault")?.enabled;
                  return `Status: ${isEnabled ? "Active" : "Inactive"}`;
                },
              },
            },
            title: { display: false, text: "Disk Fault Rate" },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 25,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { color: "#666", font: { size: 11 }, callback: (value) => value + "%" },
              title: { display: true, text: "Disk Fault Rate (%)", color: "#666", font: { size: 12, weight: "normal" } },
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
      });
    }
  }

  updateCharts(): void {
    if (!this.packetLossChart || !this.latencyChart || !this.queryLoadChart || !this.queryBlackholeChart || !this.connectionKillChart || !this.diskFaultChart) return;

    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    this.packetLossChart.data.labels = this.metrics.packetLoss.map((item) => formatTime(item.timestamp));
    this.packetLossChart.data.datasets[0].data = this.metrics.packetLoss.map((item) => item.value);
    this.packetLossChart.update();

    this.latencyChart.data.labels = this.metrics.latency.map((item) => formatTime(item.timestamp));
    this.latencyChart.data.datasets[0].data = this.metrics.latency.map((item) => item.value);
    this.latencyChart.update();

    this.queryLoadChart.data.labels = this.metrics.queryLoad.map((item) => formatTime(item.timestamp));
    this.queryLoadChart.data.datasets[0].data = this.metrics.queryLoad.map((item) => item.value);
    this.queryLoadChart.update();

    this.queryBlackholeChart.data.labels = this.metrics.queryBlackhole.map((item) => formatTime(item.timestamp));
    this.queryBlackholeChart.data.datasets[0].data = this.metrics.queryBlackhole.map((item) => item.value);
    this.queryBlackholeChart.update();

    this.connectionKillChart.data.labels = this.metrics.connectionKill.map((item) => formatTime(item.timestamp));
    this.connectionKillChart.data.datasets[0].data = this.metrics.connectionKill.map((item) => item.value);
    this.connectionKillChart.update();

    this.diskFaultChart.data.labels = this.metrics.diskFault.map((item) => formatTime(item.timestamp));
    this.diskFaultChart.data.datasets[0].data = this.metrics.diskFault.map((item) => item.value);
    this.diskFaultChart.update();
  }

  fetchScenarios(): Observable<Scenario[]> {
    return this.http.get<Scenario[]>("http://localhost:8081/api/scenarios").pipe(
      catchError((err) => {
        console.error("Error fetching scenarios:", err);
        return of(this.scenarios);
      })
    );
  }

  fetchMetrics(): Observable<ScenarioMetrics> {
    return this.http.get<any>("http://localhost:8081/api/metrics").pipe(
      map((data) => {
        if (data.scenarioStates) {
          this.scenarios.forEach((scenario) => {
            scenario.enabled = data.scenarioStates[scenario.originalName] || false;
          });
        }

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
        };

        return metrics;
      }),
      catchError((err) => {
        console.error("Error fetching metrics:", err);
        return of(this.generateEmptyMetrics());
      })
    );
  }

  private getMetricKeyForScenario(originalName: string): keyof ScenarioMetrics | null {
    switch (originalName) {
      case "packet_loss": return "packetLoss";
      case "latency_injection": return "latency";
      case "stress_testing": return "queryLoad";
      case "query_blackhole": return "queryBlackhole";
      case "connection_kill": return "connectionKill";
      case "disk_fault": return "diskFault";
      default: return null;
    }
  }

  private generateMockMetricData(): MetricData[] {
    const now = Date.now();
    return Array.from({ length: 10 }, (_, i) => ({
      timestamp: now - (9 - i) * 1000,
      value: Math.random() * 10 + 5,
    }));
  }

  generateEmptyMetrics(): ScenarioMetrics {
    return {
      packetLoss: [],
      latency: [],
      queryLoad: [],
      queryBlackhole: [],
      connectionKill: [],
      diskFault: [],
    };
  }

  updateMetrics(newMetrics: ScenarioMetrics): void {
    const limitDataPoints = (data: MetricData[]) => data.slice(-10);

    this.metrics = {
      packetLoss: limitDataPoints(newMetrics.packetLoss),
      latency: limitDataPoints(newMetrics.latency),
      queryLoad: limitDataPoints(newMetrics.queryLoad),
      queryBlackhole: limitDataPoints(newMetrics.queryBlackhole),
      connectionKill: limitDataPoints(newMetrics.connectionKill),
      diskFault: limitDataPoints(newMetrics.diskFault),
    };
  }

  toggleScenario(scenario: Scenario): void {
    this.loading = true;
    console.log("Toggling scenario:", scenario.originalName, "Current state:", scenario.enabled);

    this.http.put<any>(`http://localhost:8081/api/scenarios/toggle/${scenario.originalName}`, {}).subscribe({
      next: (response) => {
        if (response.status === "success") {
          scenario.enabled = response.enabled;
          console.log("Scenario toggled successfully:", scenario.originalName, "New state:", scenario.enabled);
          setTimeout(() => this.refreshData(), 2000);
        } else {
          console.error("Failed to toggle scenario:", response);
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
        if (status && typeof status.enabled !== "undefined") {
          if (scenario.enabled !== status.enabled) {
            console.log(`State mismatch for ${scenario.originalName}: UI=${scenario.enabled}, Backend=${status.enabled}`);
            scenario.enabled = status.enabled;
          }
        }
      },
      error: (err) => {
        console.error(`Error verifying scenario state for ${scenario.originalName}:`, err);
      },
    });
  }

  enableScenario(scenario: Scenario): void {
    if (scenario.enabled) return;
    console.log("Enabling scenario:", scenario.name);

    this.loading = true;
    this.http
      .post(`http://localhost:8081/api/scenarios/enable/${scenario.originalName}`, {}, { responseType: "text" })
      .subscribe({
        next: () => {
          scenario.enabled = true;
          console.log("Scenario enabled successfully:", scenario.name);
          setTimeout(() => this.refreshData(), 2000);
          this.loading = false;
        },
        error: (err) => {
          console.error(`Failed to enable scenario ${scenario.name}:`, err);
          this.error = `Failed to enable scenario ${scenario.name}: ${err.message}`;
          this.loading = false;
        },
      });
  }

  disableScenario(scenario: Scenario): void {
    if (!scenario.enabled) return;
    console.log("Disabling scenario:", scenario.name);

    this.loading = true;
    this.http
      .post(`http://localhost:8081/api/scenarios/disable/${scenario.originalName}`, {}, { responseType: "text" })
      .subscribe({
        next: () => {
          scenario.enabled = false;
          console.log("Scenario disabled successfully:", scenario.name);
          this.refreshData();
          this.loading = false;
        },
        error: (err) => {
          console.error(`Failed to disable scenario ${scenario.name}:`, err);
          this.error = `Failed to disable scenario ${scenario.name}: ${err.message}`;
          this.loading = false;
        },
      });
  }

  getMetricValue(name: keyof ScenarioMetrics): number {
    const data = this.metrics[name];
    return data.length ? data[data.length - 1].value : 0;
  }

  getPacketLossTrend(): string {
    const data = this.metrics.packetLoss;
    if (data.length < 2) return "No trend data available";

    const values = data.map((d) => d.value);
    const lastFive = values.slice(-5);

    if (lastFive.length < 2) return "Insufficient data for trend analysis";

    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i - 1]) increasing++;
      else if (lastFive[i] < lastFive[i - 1]) decreasing++;
    }

    const avgChange = (lastFive[lastFive.length - 1] - lastFive[0]) / (lastFive.length - 1);
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

    const values = data.map((d) => d.value);
    const lastFive = values.slice(-5);

    if (lastFive.length < 2) return "Insufficient data for trend analysis";

    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i - 1]) increasing++;
      else if (lastFive[i] < lastFive[i - 1]) decreasing++;
    }

    const avgChange = (lastFive[lastFive.length - 1] - lastFive[0]) / (lastFive.length - 1);
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

    const values = data.map((d) => d.value);
    const lastFive = values.slice(-5);

    if (lastFive.length < 2) return "Insufficient data for trend analysis";

    let increasing = 0;
    let decreasing = 0;

    for (let i = 1; i < lastFive.length; i++) {
      if (lastFive[i] > lastFive[i - 1]) increasing++;
      else if (lastFive[i] < lastFive[i - 1]) decreasing++;
    }

    const avgChange = (lastFive[lastFive.length - 1] - lastFive[0]) / (lastFive.length - 1);
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
    const metricData = this.metrics[metricName as keyof ScenarioMetrics];
    if (!metricData || metricData.length < 2) return "Stable";

    const lastValue = metricData[metricData.length - 1].value;
    const previousValue = metricData[metricData.length - 2].value;

    const difference = lastValue - previousValue;
    const percentChange = (difference / previousValue) * 100;

    if (Math.abs(percentChange) < 5) return "Stable";
    return percentChange > 0 ? "Increasing" : "Decreasing";
  }

  getScenarioStatus(scenarioName: string): string {
    const scenario = this.scenarios.find((s) => s.originalName === scenarioName);
    return scenario?.enabled ? "Active" : "Inactive";
  }

  async exportPDF(): Promise<void> {
    this.loading = true;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    pdf.setProperties({
      title: "Scenarios Dashboard Report",
      subject: "Performance Metrics Analysis",
      author: "System Dashboard",
      keywords: "metrics, performance, monitoring, scenarios",
      creator: "Dashboard Application",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    const addPageHeader = (pageNumber: number, totalPages: number) => {
      pdf.setFontSize(8);
      pdf.setTextColor(127, 140, 141);
      pdf.text(`Scenarios Dashboard Report - Page ${pageNumber} of ${totalPages}`, pageWidth - margin, margin - 5, { align: "right" });
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, margin - 2, pageWidth - margin, margin - 2);
    };

    const addPageFooter = (pageNumber: number) => {
      const footerPosition = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(127, 140, 141);
      pdf.text("© Dashboard Application - For internal use only", margin, footerPosition);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, footerPosition, { align: "right" });
    };

    let pageNumber = 1;
    let totalPages = 2; // Assuming 2 pages for simplicity

    // Cover Page
    pdf.setFontSize(24);
    pdf.setTextColor(44, 62, 80);
    pdf.text("Scenarios Dashboard Report", pageWidth / 2, 60, { align: "center" });
    pdf.setFontSize(16);
    pdf.text("Detailed Performance Report", pageWidth / 2, 70, { align: "center" });
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 85, { align: "center" });
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    pdf.text("This report provides a comprehensive analysis of system performance metrics", pageWidth / 2, 100, { align: "center" });
    pdf.text("including packet loss, latency, and query load across all monitored scenarios.", pageWidth / 2, 106, { align: "center" });
    addPageFooter(pageNumber);

    // Enabled Scenarios Section
    pdf.addPage();
    pageNumber++;
    addPageHeader(pageNumber, totalPages);

    let yPosition = margin + 5;
    pdf.setFontSize(16);
    pdf.setTextColor(44, 62, 80);
    pdf.text("Enabled Scenarios Results", margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    const enabledScenarios = this.scenarios.filter((s) => s.enabled);
    if (enabledScenarios.length === 0) {
      pdf.text("No scenarios are currently enabled.", margin, yPosition);
      yPosition += 10;
    } else {
      for (const scenario of enabledScenarios) {
        pdf.setFontSize(12);
        pdf.setTextColor(44, 62, 80);
        pdf.text(scenario.name, margin, yPosition);
        yPosition += 7;

        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Description: ${scenario.description}`, margin + 3, yPosition);
        yPosition += 5;

        let resultText = "";
        switch (scenario.originalName) {
          case "packet_loss":
            resultText = `Result: Packet Loss Rate: ${this.getMetricValue("packetLoss").toFixed(2)}% (Trend: ${this.getPacketLossTrend()})`;
            break;
          case "latency_injection":
            resultText = `Result: Latency: ${this.getMetricValue("latency").toFixed(0)} ms (Trend: ${this.getLatencyTrend()})`;
            break;
          case "stress_testing":
            resultText = `Result: Query Load: ${this.getMetricValue("queryLoad").toFixed(0)} queries/sec (Trend: ${this.getQueryLoadTrend()})`;
            break;
          case "query_blackhole":
            resultText = `Result: Query Blackhole Rate: ${this.getMetricValue("queryBlackhole").toFixed(2)}% (Trend: ${this.getMetricTrend("queryBlackhole")})`;
            break;
          case "connection_kill":
            resultText = `Result: Connection Kill Rate: ${this.getMetricValue("connectionKill").toFixed(2)}% (Trend: ${this.getMetricTrend("connectionKill")})`;
            break;
          case "disk_fault":
            resultText = `Result: Disk Fault Rate: ${this.getMetricValue("diskFault").toFixed(2)}% (Trend: ${this.getMetricTrend("diskFault")})`;
            break;
        }
        pdf.text(resultText, margin + 3, yPosition);
        yPosition += 10;
      }
    }

    // Executive Summary
    pdf.setFontSize(16);
    pdf.setTextColor(44, 62, 80);
    pdf.text("Executive Summary", margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    const summaryText =
      "This report provides a detailed analysis of system performance metrics collected from our monitoring infrastructure. The data presented here reflects the current state of our systems and highlights potential areas of concern or improvement. The metrics are collected in real-time and represent the most up-to-date information available.";
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
    pdf.text(`• Packet Loss Scenario: ${this.getScenarioStatus("packet_loss")}`, margin + 3, yPosition);
    yPosition += 5;
    pdf.text(`• Latency Scenario: ${this.getScenarioStatus("latency_injection")}`, margin + 3, yPosition);
    yPosition += 5;
    pdf.text(`• Query Load Scenario: ${this.getScenarioStatus("stress_testing")}`, margin + 3, yPosition);
    yPosition += 5;
    pdf.text(`• Query Blackhole Scenario: ${this.getScenarioStatus("query_blackhole")}`, margin + 3, yPosition);
    yPosition += 5;
    pdf.text(`• Connection Kill Scenario: ${this.getScenarioStatus("connection_kill")}`, margin + 3, yPosition);
    yPosition += 5;
    pdf.text(`• Disk Fault Scenario: ${this.getScenarioStatus("disk_fault")}`, margin + 3, yPosition);
    yPosition += 10;

    // Key Metrics Overview
    pdf.setFontSize(14);
    pdf.setTextColor(44, 62, 80);
    pdf.text("Key Metrics Overview", margin, yPosition);
    yPosition += 8;

    const packetLossValue = this.getMetricValue("packetLoss");
    const latencyValue = this.getMetricValue("latency");
    const queryLoadValue = this.getMetricValue("queryLoad");
    const queryBlackholeValue = this.getMetricValue("queryBlackhole");
    const connectionKillValue = this.getMetricValue("connectionKill");
    const diskFaultValue = this.getMetricValue("diskFault");

    const packetLossStatus = packetLossValue < 1 ? "Excellent" : packetLossValue < 5 ? "Good" : packetLossValue < 10 ? "Fair" : "Poor";
    const packetLossColor = packetLossValue < 1 ? [46, 204, 113] : packetLossValue < 5 ? [39, 192, 96] : packetLossValue < 10 ? [243, 156, 18] : [231, 76, 60];

    const latencyStatus = latencyValue < 100 ? "Excellent" : latencyValue < 500 ? "Good" : latencyValue < 2000 ? "Fair" : "Poor";
    const latencyColor = latencyValue < 100 ? [46, 204, 113] : latencyValue < 500 ? [39, 192, 96] : latencyValue < 2000 ? [243, 156, 18] : [231, 76, 60];

    const queryLoadMax = 1000;
    const queryLoadPercentage = (queryLoadValue / queryLoadMax) * 100;
    const queryLoadStatus = queryLoadPercentage < 20 ? "Low" : queryLoadPercentage < 50 ? "Moderate" : queryLoadPercentage < 80 ? "High" : "Critical";
    const queryLoadColor = queryLoadPercentage < 20 ? [46, 204, 113] : queryLoadPercentage < 50 ? [39, 192, 96] : queryLoadPercentage < 80 ? [243, 156, 18] : [231, 76, 60];

    const queryBlackholeStatus = queryBlackholeValue < 5 ? "Low" : queryBlackholeValue < 10 ? "Moderate" : queryBlackholeValue < 20 ? "High" : "Critical";
    const queryBlackholeColor = queryBlackholeValue < 5 ? [46, 204, 113] : queryBlackholeValue < 10 ? [39, 192, 96] : queryBlackholeValue < 20 ? [243, 156, 18] : [231, 76, 60];

    const connectionKillStatus = connectionKillValue < 5 ? "Low" : connectionKillValue < 10 ? "Moderate" : connectionKillValue < 15 ? "High" : "Critical";
    const connectionKillColor = connectionKillValue < 5 ? [46, 204, 113] : connectionKillValue < 10 ? [39, 192, 96] : connectionKillValue < 15 ? [243, 156, 18] : [231, 76, 60];

    const diskFaultStatus = diskFaultValue < 5 ? "Low" : diskFaultValue < 10 ? "Moderate" : diskFaultValue < 15 ? "High" : "Critical";
    const diskFaultColor = diskFaultValue < 5 ? [46, 204, 113] : diskFaultValue < 10 ? [39, 192, 96] : diskFaultValue < 15 ? [243, 156, 18] : [231, 76, 60];

    const boxWidth = contentWidth / 3 - 4;
    const boxHeight = 30;

    // First row: Packet Loss, Latency, Query Load
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(220, 220, 220);
    pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Packet Loss", margin + 5, yPosition + 8);
    pdf.setFontSize(14);
    pdf.setTextColor(packetLossColor[0], packetLossColor[1], packetLossColor[2]);
    pdf.text(`${packetLossValue.toFixed(2)}%`, margin + 5, yPosition + 20);
    pdf.setFontSize(8);
    pdf.text(`Status: ${packetLossStatus}`, margin + boxWidth - 40, yPosition + 20);

    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(margin + boxWidth + 4, yPosition, boxWidth, boxHeight, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Latency", margin + boxWidth + 9, yPosition + 8);
    pdf.setFontSize(14);
    pdf.setTextColor(latencyColor[0], latencyColor[1], latencyColor[2]);
    pdf.text(`${latencyValue.toFixed(0)} ms`, margin + boxWidth + 9, yPosition + 20);
    pdf.setFontSize(8);
    pdf.text(`Status: ${latencyStatus}`, margin + boxWidth * 2 - 36, yPosition + 20);

    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(margin + boxWidth * 2 + 8, yPosition, boxWidth, boxHeight, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Query Load", margin + boxWidth * 2 + 13, yPosition + 8);
    pdf.setFontSize(14);
    pdf.setTextColor(queryLoadColor[0], queryLoadColor[1], queryLoadColor[2]);
    pdf.text(`${queryLoadValue.toFixed(0)} q/s`, margin + boxWidth * 2 + 13, yPosition + 20);
    pdf.setFontSize(8);
    pdf.text(`Status: ${queryLoadStatus}`, margin + boxWidth * 3 - 32, yPosition + 20);

    yPosition += boxHeight + 10;

    // Second row: Query Blackhole, Connection Kill, Disk Fault
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(margin, yPosition, boxWidth, boxHeight, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Query Blackhole", margin + 5, yPosition + 8);
    pdf.setFontSize(14);
    pdf.setTextColor(queryBlackholeColor[0], queryBlackholeColor[1], queryBlackholeColor[2]);
    pdf.text(`${queryBlackholeValue.toFixed(2)}%`, margin + 5, yPosition + 20);
    pdf.setFontSize(8);
    pdf.text(`Status: ${queryBlackholeStatus}`, margin + boxWidth - 40, yPosition + 20);

    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(margin + boxWidth + 4, yPosition, boxWidth, boxHeight, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Connection Kill", margin + boxWidth + 9, yPosition + 8);
    pdf.setFontSize(14);
    pdf.setTextColor(connectionKillColor[0], connectionKillColor[1], connectionKillColor[2]);
    pdf.text(`${connectionKillValue.toFixed(2)}%`, margin + boxWidth + 9, yPosition + 20);
    pdf.setFontSize(8);
    pdf.text(`Status: ${connectionKillStatus}`, margin + boxWidth * 2 - 36, yPosition + 20);

    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(margin + boxWidth * 2 + 8, yPosition, boxWidth, boxHeight, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text("Disk Fault", margin + boxWidth * 2 + 13, yPosition + 8);
    pdf.setFontSize(14);
    pdf.setTextColor(diskFaultColor[0], diskFaultColor[1], diskFaultColor[2]);
    pdf.text(`${diskFaultValue.toFixed(2)}%`, margin + boxWidth * 2 + 13, yPosition + 20);
    pdf.setFontSize(8);
    pdf.text(`Status: ${diskFaultStatus}`, margin + boxWidth * 3 - 32, yPosition + 20);

    // Save the PDF
    pdf.save("Scenarios_Dashboard_Report.pdf");
    this.loading = false;
  }
}