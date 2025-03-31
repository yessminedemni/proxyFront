import { Component, OnInit } from "@angular/core";
import type { Scenario } from "../../models/scenario.model"
import { ScenarioService } from "../../services/scenario.service";
import { ScenarioCardComponent } from "../scenario-card/scenario-card.component";
import { CommonModule } from "@angular/common";


@Component({
  selector: "app-dashboard",
  
  templateUrl: "./dashboard.component.html",
  standalone: true, // ✅ Mark as standalone

  imports: [CommonModule, ScenarioCardComponent],
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit {
  scenarios: Scenario[] = []
  loading = true
  error = ""
  refreshing = false

  constructor(private scenarioService: ScenarioService) {}

  ngOnInit(): void {
    this.loadScenarios()
  }

  loadScenarios(): void {
    this.loading = true
    this.error = ""

    this.scenarioService.getAllScenarios().subscribe({
      next: (data: Scenario[]) => {
        this.scenarios = data
        this.loading = false
      },
      error: (err: any) => {
        this.error = "Failed to load scenarios. Please try again."
        this.loading = false
        console.error("Error loading scenarios:", err)
      },
    })
  }

  refreshScenarios(): void {
    this.refreshing = true
    this.error = ""

    this.scenarioService.getAllScenarios().subscribe({
      next: (data: Scenario[]) => {
        this.scenarios = data
        this.refreshing = false
      },
      error: (err: any) => {
        this.error = "Failed to refresh scenarios. Please try again."
        this.refreshing = false
        console.error("Error refreshing scenarios:", err)
      },
    })
  }

  

  getImpactClass(impact: string | undefined): string {
    if (!impact) return "impact-unknown"

    return `impact-${impact.toLowerCase()}`
  }

  getCategoryIcon(category: string | undefined): string {
    if (!category) return "fa-question-circle"

    switch (category.toLowerCase()) {
      case "performance":
        return "fa-tachometer-alt"
      case "network":
        return "fa-network-wired"
      case "load":
        return "fa-weight-hanging"
      default:
        return "fa-cog"
    }
  }
  refreshAllScenarios(): void {
    console.log("Manually refreshing all scenarios from server");
    this.scenarioService.getAllScenarios().subscribe({
      next: (scenarios) => {
        this.scenarios = scenarios;
        console.log("Current scenario states from server:", scenarios);
      },
      error: (err) => {
        console.error("Failed to refresh scenarios:", err);
      }
    });
  }
  
  // Also add this to update your local state when a scenario is toggled
  onScenarioToggled(updatedScenario: Scenario): void {
    console.log("Scenario toggled event received:", updatedScenario);
    
    // Find and update the scenario in your local array
    const index = this.scenarios.findIndex(s => s.name === updatedScenario.name);
    if (index !== -1) {
      this.scenarios[index] = {...updatedScenario};
    }
    
    // Optionally refresh all scenarios from server to ensure full synchronization
    this.refreshAllScenarios();
  }
}

