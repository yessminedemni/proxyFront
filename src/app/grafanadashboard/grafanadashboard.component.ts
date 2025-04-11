import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import Chart from 'chart.js/auto';
import { interval, Observable, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PrometheusService } from '../services/PrometheusService .service';

interface MetricCard {
  id: string;
  title: string;
  description: string;
  query: string;
  unit: string;
  chartType: 'line' | 'bar' | 'pie' | 'doughnut';
  chartRef?: ElementRef;
  chart?: Chart;
  data: {
    labels: string[];
    values: number[];
  };
  color: string;
}

@Component({
  selector: 'app-grafanadashboard',
  templateUrl: './grafanadashboard.component.html',
  styleUrls: ['./grafanadashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule]
})
export class GrafanadashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cpuChart') cpuChartRef!: ElementRef;
  @ViewChild('heapMemoryChart') heapMemoryChartRef!: ElementRef;
  @ViewChild('nonHeapMemoryChart') nonHeapMemoryChartRef!: ElementRef;
  @ViewChild('threadChart') threadChartRef!: ElementRef;
  @ViewChild('gcCollectionChart') gcCollectionChartRef!: ElementRef;
  @ViewChild('classesChart') classesChartRef!: ElementRef;

  loading: boolean = false;
  lastUpdated: Date = new Date();
  searchTerm: string = '';
  refreshInterval = 1000;
  private subscriptions: Subscription = new Subscription();

  metricCards: MetricCard[] = [
    {
      id: 'cpu',
      title: 'CPU Usage',
      description: 'Real-time CPU usage (%)',
      query: 'rate(process_cpu_seconds_total{instance="localhost:8083", job="application-jmx"}[1m]) * 100',
      unit: '%',
      chartType: 'line',
      data: { labels: [], values: [] },
      color: 'rgba(75, 192, 192, 1)'
    },
    
    {
      id: 'heapMemory',
      title: 'Heap Memory Usage',
      description: 'Current heap memory usage in MB',
      query: 'java_lang_memory_heap_used_bytes{instance="localhost:8083", job="application-jmx"}',
      unit: 'MB',
      chartType: 'line',
      data: { labels: [], values: [] },
      color: 'rgba(255, 99, 132, 1)'
    },
    {
      id: 'nonHeapMemory',
      title: 'Non-Heap Memory Usage',
      description: 'Current non-heap memory usage in MB',
      query: 'java_lang_memory_nonheap_used_bytes{instance="localhost:8083", job="application-jmx"}',
      unit: 'MB',
      chartType: 'line',
      data: { labels: [], values: [] },
      color: 'rgba(54, 162, 235, 1)'
    },
    {
      id: 'thread',
      title: 'Thread Count',
      description: 'Current number of active threads',
      query: 'jvm_threads_current{instance="localhost:8083", job="application-jmx"}',
      unit: '',
      chartType: 'line',
      data: { labels: [], values: [] },
      color: 'rgba(255, 159, 64, 1)'
    },
    {
      id: 'gcCollection',
      title: 'GC Collection Time',
      description: 'Time spent in garbage collection in seconds',
      query: 'sum(jvm_gc_collection_seconds_sum{instance="localhost:8083", job="application-jmx"}) by (gc)',
      unit: 's',
      chartType: 'bar',
      data: { labels: [], values: [] },
      color: 'rgba(153, 102, 255, 1)'
    },
    {
      id: 'classes',
      title: 'Loaded Classes',
      description: 'Number of classes currently loaded in the JVM',
      query: 'jvm_classes_currently_loaded{instance="localhost:8083", job="application-jmx"}',
      unit: '',
      chartType: 'line',
      data: { labels: [], values: [] },
      color: 'rgba(201, 203, 207, 1)'
    }
  ];

  constructor(private prometheusService: PrometheusService) {}

  ngOnInit(): void {
    const refreshSub = interval(this.refreshInterval)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.loading = true;
          return this.fetchAllMetricsData();
        })
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.lastUpdated = new Date();
          this.updateAllCharts();
        },
        error: (err) => {
          console.error('Error fetching metrics data:', err);
          this.loading = false;
        }
      });

    this.subscriptions.add(refreshSub);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeAllCharts();
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.metricCards.forEach(card => {
      if (card.chart) {
        card.chart.destroy();
      }
    });
  }

  initializeAllCharts(): void {
    const chartRefs = {
      'cpu': this.cpuChartRef,
      'heapMemory': this.heapMemoryChartRef,
      'nonHeapMemory': this.nonHeapMemoryChartRef,
      'thread': this.threadChartRef,
      'gcCollection': this.gcCollectionChartRef,
      'classes': this.classesChartRef
    };

    this.metricCards.forEach(card => {
      const chartRef = chartRefs[card.id as keyof typeof chartRefs];
      if (chartRef?.nativeElement) {
        card.chart = this.createChart(chartRef.nativeElement, card);
      }
    });
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
            backgroundColor: card.chartType === 'line'
              ? this.getBackgroundColor(card.color)
              : this.generateColorArray(card.color, 6),
            tension: 0.1,
            fill: card.chartType === 'line',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: card.color,
            pointBorderColor: '#fff',
            pointHoverRadius: 5,
            pointHoverBackgroundColor: card.color,
            pointHoverBorderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            mode: 'index',
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
              callback: (value) => `${value}${card.unit ? ' ' + card.unit : ''}`,
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
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    });
  }

  fetchAllMetricsData(): Observable<any> {
    return new Observable(observer => {
      const promises = this.metricCards.map(card => this.fetchMetricData(card));
      Promise.all(promises)
        .then(results => observer.next(results))
        .catch(err => observer.error(err))
        .finally(() => observer.complete());
    });
  }

  async fetchMetricData(card: MetricCard): Promise<any> {
    return new Promise((resolve, reject) => {
      this.prometheusService.getMetricData(card.query).subscribe({
        next: (response) => {
          if (response && response.data?.result?.length) {
            const results = response.data.result;
            const timestamp = new Date().toLocaleTimeString();

            if (card.chartType === 'bar') {
              card.data.labels = results.map((item: { metric: { gc: any; instance: any; }; }) => item.metric.gc || item.metric.instance || 'Unknown');
              card.data.values = results.map((item: { value: string[]; }) => this.convertMetric(parseFloat(item.value[1]), card.unit));
            } else {
              if (card.data.labels.length >= 10) {
                card.data.labels.shift();
                card.data.values.shift();
              }
              card.data.labels.push(timestamp);

              if (results.length === 1) {
                const value = this.convertMetric(parseFloat(results[0].value[1]), card.unit);
                card.data.values.push(value);
              } else {
                const sum = results.reduce((acc: number, item: { value: string[]; }) => acc + parseFloat(item.value[1]), 0);
                const converted = this.convertMetric(sum, card.unit);
                card.data.values.push(converted);
              }
            }
          }
          resolve(true);
        },
        error: (error) => {
          console.error(`Error fetching data for ${card.title}:`, error);
          reject(error);
        }
      });
    });
  }

  

  convertMetric(value: number, unit: string): number {
    if (unit === 'MB') return +(value / 1024 / 1024).toFixed(2);
    if (unit === 'GB') return +(value / 1024 / 1024 / 1024).toFixed(2);
    if (unit === '%') return +value.toFixed(1);
    return +value.toFixed(2);
  }

  

  updateAllCharts(): void {
    this.metricCards.forEach(card => {
      if (card.chart) {
        card.chart.data.labels = card.data.labels;
        card.chart.data.datasets[0].data = card.data.values;
        card.chart.update();
      }
    });
  }

  matchesSearch(term: string): boolean {
    if (!this.searchTerm) return true;
    const search = this.searchTerm.toLowerCase();
    return term.toLowerCase().includes(search);
  }

  noMatchingMetricsFound(): boolean {
    if (!this.searchTerm) return false;
    return !this.metricCards.some(card => this.matchesSearch(card.title));
  }

  getBackgroundColor(color: string): string {
    return color.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)/, 'rgba($1, $2, $3, 0.2)');
  }

  generateColorArray(baseColor: string, count: number): string[] {
    const colors = [];
    const rgbMatch = baseColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const [r, g, b] = rgbMatch.slice(1).map(Number);
      for (let i = 0; i < count; i++) {
        colors.push(`rgba(${r}, ${g}, ${b}, ${0.3 + i * 0.1})`);
      }
    } else {
      for (let i = 0; i < count; i++) {
        colors.push(baseColor);
      }
    }
    return colors;
  }
}
