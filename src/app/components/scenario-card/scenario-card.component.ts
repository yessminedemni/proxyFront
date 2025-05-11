import { Component, EventEmitter, Input, Output } from "@angular/core";
import type { Scenario } from "../../models/scenario.model"
import { ScenarioService } from "../../services/scenario.service";
import { CommonModule } from "@angular/common";


@Component({
  selector: "app-scenario-card",
  templateUrl: "./scenario-card.component.html",
  imports: [CommonModule], // Make sure CommonModule is included here
  styleUrls: ["./scenario-card.component.scss"],
})
export class ScenarioCardComponent {
  @Input() scenario!: Scenario
  @Output() toggled = new EventEmitter<Scenario>()

  isToggling = false
  error = ""

  constructor(private scenarioService: ScenarioService) {}
  toggleScenario(): void {
    if (this.isToggling) return;
    
    this.isToggling = true;
    this.error = "";
    
    // Store the previous state for comparison
    const previousState = this.scenario.enabled;
    console.log(`Before toggle: ${this.scenario.name} is ${previousState ? 'enabled' : 'disabled'}`);
    
    this.scenarioService.toggleScenario(this.scenario.name).subscribe({
      next: () => {
        // After toggling, fetch the current status from the server to ensure UI matches backend
        this.scenarioService.getScenarioStatus(this.scenario.name).subscribe({
          next: (enabled) => {
            this.scenario.enabled = enabled;
            console.log(`After toggle: ${this.scenario.name} is now ${enabled ? 'enabled' : 'disabled'}`);
            
            // If state didn't change as expected, show an error
            if (this.scenario.enabled === previousState) {
              this.error = "Warning: Scenario state didn't change as expected!";
            }
            
            this.toggled.emit(this.scenario);
            this.isToggling = false;
          },
          error: (statusErr) => {
            this.error = `Failed to get updated scenario status: ${statusErr.message}`;
            this.isToggling = false;
          }
        });
      },
      error: (err) => {
        this.error = `Failed to toggle scenario: ${err.message}`;
        this.isToggling = false;
        console.error("Error toggling scenario:", err);
      },
    });
  }

  getImpactClass(): string {
    if (!this.scenario.impact) return "impact-unknown"

    return `impact-${this.scenario.impact.toLowerCase()}`
  }

  getCategoryIcon(): string {
    if (!this.scenario.category) return "fa-question-circle"

    switch (this.scenario.category.toLowerCase()) {
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
  

  getScenarioIcon(): string {
    switch (this.scenario.name) {
      case "latency_injection":
        return "fa-clock"
      case "packet_loss":
        return "fa-unlink"
      case "stress_testing":
        return "fa-bomb"
      default:
        return "fa-flask"
    }
  }

  getFormattedName(): string {
    return this.scenario.name
      .split("_")
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }
}