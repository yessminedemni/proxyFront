import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of } from "rxjs";

export interface ReportConfig {
  dashboardType: "app-scenarios" | "scenarios" | "jvm-metrics";
  type: string;
  timeRange: string;
  metrics: string[];
}

export interface ReportType {
  id: string;
  name: string;
  icon: string;
}

export interface TimeRange {
  id: string;
  name: string;
}

export interface MetricOption {
  id: string;
  name: string;
  description: string;
  dashboardType: string;
}

@Injectable({
  providedIn: "root",
})
export class UnifiedReportService {
  private apiUrl = "http://localhost:8081/api/reports";

  constructor(private http: HttpClient) {}

  generateReport(config: ReportConfig): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/generate`, config, { responseType: "blob" });
  }

  getReportTypes(): Observable<{
    types: ReportType[];
    timeRanges: TimeRange[];
  }> {
    return this.http.get<{
      types: ReportType[];
      timeRanges: TimeRange[];
    }>(`${this.apiUrl}/types`);
  }

  getMetricOptions(dashboardType: string): Observable<MetricOption[]> {
    return this.http.get<MetricOption[]>(`${this.apiUrl}/metrics/${dashboardType}`);
  }

  downloadReport(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}