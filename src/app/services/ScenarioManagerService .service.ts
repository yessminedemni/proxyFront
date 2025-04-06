import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { DbStressService } from './DbStressService.service';

interface Scenarios {
  latency_injection: boolean;
  packet_loss: boolean;
  stress_testing: boolean;
  // Add other scenario properties as needed
}

@Injectable({
  providedIn: 'root',
})
export class ScenarioManagerService {
  private scenariosSubject = new BehaviorSubject<Scenarios>({
    latency_injection: false,
    packet_loss: false,
    stress_testing: false,
  });
  scenarios$ = this.scenariosSubject.asObservable();
  private pollingInterval = 5000; // Poll every 5 seconds

  constructor(private http: HttpClient, private dbStressService: DbStressService) {
    this.startScenarioPolling();
    this.scenarios$.subscribe(scenarios => {
      if (scenarios.stress_testing) {
        this.dbStressService.startStressTest().subscribe(
          () => console.log('Stress test started due to scenario.'),
          (error) => console.error('Error starting stress test:', error)
        );
      } else {
        this.dbStressService.stopStressTest().subscribe(
          () => console.log('Stress test stopped due to scenario.'),
          (error) => console.error('Error stopping stress test:', error)
        );
      }
    });
  }

  startScenarioPolling(): void {
    interval(this.pollingInterval)
      .pipe(
        switchMap(() => this.fetchScenarios()),
        catchError((error) => {
          console.error('Error fetching scenarios:', error);
          return of(this.scenariosSubject.value); // Keep the last known state
        })
      )
      .subscribe((scenarios) => this.scenariosSubject.next(scenarios));
  }

  fetchScenarios(): Observable<Scenarios> {
    return this.http.get<Scenarios>('/api/scenarios').pipe(
      tap(scenarios => console.log('Fetched scenarios:', scenarios))
    );
  }

  // Method to update a specific scenario (you'll need a UI for this)
  updateScenario(scenarioName: keyof Scenarios, enabled: boolean): void {
    const currentScenarios = this.scenariosSubject.value;
    const updatedScenarios = { ...currentScenarios, [scenarioName]: enabled };
    this.scenariosSubject.next(updatedScenarios);
    this.http.post('/api/scenarios', updatedScenarios).subscribe( // Replace with your update endpoint
      () => console.log(`Scenario '${scenarioName}' updated to ${enabled}`),
      (error) => console.error(`Error updating scenario '${scenarioName}':`, error)
    );
  }
}