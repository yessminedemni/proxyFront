// PrometheusService.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PrometheusService {
  private prometheusUrl = 'http://localhost:9090/api/v1';

  constructor(private http: HttpClient) {}

  // Fetch instant query data
  getMetricData(query: string): Observable<any> {
    if (!query || query.trim() === '') {
      throw new Error('Query is required');
    }
    
    const params = new HttpParams().set('query', query);
    return this.http.get<any>(`${this.prometheusUrl}/query`, { params });
  }

  // Fetch range query data (for time series)
  getMetricRangeData(query: string, start: number, end: number, step: string): Observable<any> {
    if (!query || query.trim() === '') {
      throw new Error('Query is required');
    }
    
    const params = new HttpParams()
      .set('query', query)
      .set('start', start.toString())
      .set('end', end.toString())
      .set('step', step);
      
    return this.http.get<any>(`${this.prometheusUrl}/query_range`, { params });
  }
}