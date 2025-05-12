import { Component, type OnInit } from "@angular/core"
import type { HttpErrorResponse } from "@angular/common/http"
import { AppScenarioService } from "../services/AppScenarioService.service"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { RouterModule } from "@angular/router"

interface Scenario {
  id: number
  name: string
  originalName: string // Store the original name for API calls
  enabled: boolean
  description?: string
  category?: string
  impact?: string
  details: Record<string, string>
  isToggling?: boolean // Track toggle state for each scenario
  error?: string | null
}

@Component({
  selector: "app-app-scenarios-component",
  templateUrl: "./app-scenarios-component.component.html",
  styleUrls: ["./app-scenarios-component.component.scss"],
  standalone: true,
  imports: [CommonModule,FormsModule,RouterModule],
})
export class AppScenariosComponent implements OnInit {
  scenarios: Scenario[] = []
  filteredScenarios: Scenario[] = []
  isLoading = true
  error: string | null = null
  searchTerm = ""
  selectedCategory = "All"
  newEndpoint = ""
  isSubmitting = false
  submitError: string | null = null
  submitSuccess: string | null = null

  constructor(private scenarioService: AppScenarioService) {}

  ngOnInit(): void {
    this.loadScenarios()
  }

  loadScenarios(): void {
    this.isLoading = true;
    this.error = null;
  
    this.scenarioService.getAllScenarios().subscribe({
      next: (data) => {
        console.log("Received scenarios data:", data);
  
        // Initialize scenarios array
        this.scenarios = [];
  
        // Find the Return 404 scenario
        const return404Scenario = data.find((item) => item.name === "return_404");
        console.log("Return 404 scenario:", return404Scenario);
  
        if (return404Scenario) {
          // Add Return 404 scenario
          this.scenarios.push({
            id: return404Scenario.id,
            name: "Return 404",
            originalName: "return_404", // Store original name for API calls
            enabled: return404Scenario.enabled,
            description: "Returns HTTP 404 status code for configured endpoints",
            category: "Network",
            impact: "High",
            details: return404Scenario.details || {}, // Ensure details is always an object
            isToggling: false,
            error: null,
          });
        } else {
          // If Return 404 scenario doesn't exist in the response, create a default one
          this.scenarios.push({
            id: 1,
            name: "Return 404",
            originalName: "return_404",
            enabled: false,
            description: "Returns HTTP 404 status code for configured endpoints",
            category: "Network",
            impact: "High",
            details: {}, // Initialize as empty object
            isToggling: false,
            error: null,
          });
        }
  
        // Find the CPU Load scenario
        const cpuLoadScenario = data.find((item) => item.name === "cpu_load");
        console.log("CPU Load scenario:", cpuLoadScenario);
  
        if (cpuLoadScenario) {
          // Add CPU Load scenario
          this.scenarios.push({
            id: cpuLoadScenario.id,
            name: "High CPU Load",
            originalName: "cpu_load", // Store original name for API calls
            enabled: cpuLoadScenario.enabled,
            description: "Simulates high CPU load for stress testing",
            category: "Performance",
            impact: "High",
            details: cpuLoadScenario.details || {},
            isToggling: false,
            error: null,
          });
        } else {
          // If CPU Load scenario doesn't exist in the response, create a default one
          this.scenarios.push({
            id: 2,
            name: "High CPU Load",
            originalName: "cpu_load",
            enabled: false,
            description: "Simulates high CPU load for stress testing",
            category: "Performance",
            impact: "High",
            details: {}, // Initialize as empty object
            isToggling: false,
            error: null,
          });
        }
  
        // Find the High Load scenario
        const highLoadScenario = data.find((item) => item.name === "high_load");
        console.log("High Load scenario:", highLoadScenario);
  
        if (highLoadScenario) {
          // Add High Load scenario
          this.scenarios.push({
            id: highLoadScenario.id,
            name: "High Traffic Load",
            originalName: "high_load", // Store original name for API calls
            enabled: highLoadScenario.enabled,
            description: "Generates excessive traffic to test application resilience",
            category: "Performance",
            impact: "Critical",
            details: highLoadScenario.details || {},
            isToggling: false,
            error: null,
          });
        } else {
          // If High Load scenario doesn't exist in the response, create a default one
          this.scenarios.push({
            id: 3,
            name: "High Traffic Load",
            originalName: "high_load",
            enabled: false,
            description: "Generates excessive traffic to test application resilience",
            category: "Performance",
            impact: "Critical",
            details: {}, // Initialize as empty object
            isToggling: false,
            error: null,
          });
        }
  
        console.log("Scenarios after processing:", this.scenarios);
        this.filteredScenarios = [...this.scenarios];
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error("Failed to load scenarios:", err);
        this.error = err.message || "Failed to load scenarios";
        this.isLoading = false;
      },
    });
  }
  getScenarioIcon(): string {
    // Return different icons based on scenario category or name
    if (this.filteredScenarios && this.filteredScenarios.length > 0) {
      const scenario = this.filteredScenarios[0];
      if (scenario.originalName === "cpu_load") {
        return "fa-microchip";
      } else if (scenario.originalName === "high_load") {
        return "fa-tachometer-alt";
      }
    }
    return "fa-exclamation-circle";
  }
  
  

  toggleScenario(scenario: Scenario): void {
    if (scenario.isToggling) {
      console.log(`Scenario ${scenario.originalName} is already toggling, ignoring request`)
      return
    }

    console.log(`Toggling scenario: ${scenario.originalName}, current state: ${scenario.enabled}`)
    scenario.isToggling = true
    scenario.error = null

    this.scenarioService.toggleScenario(scenario.originalName).subscribe({
      next: (response) => {
        console.log(`Toggle response for ${scenario.originalName}:`, response)

        if (response && typeof response.enabled !== "undefined") {
          console.log(`Updating scenario ${scenario.originalName} state to: ${response.enabled}`)
          scenario.enabled = response.enabled
        } else {
          // Fallback if response doesn't have the expected structure
          console.log(`Response doesn't have expected structure, toggling locally`)
          scenario.enabled = !scenario.enabled
        }

        scenario.isToggling = false

        // Verify the state by getting the current status
        this.verifyScenarioState(scenario)
      },
      error: (err: HttpErrorResponse) => {
        console.error(`Error toggling scenario ${scenario.originalName}:`, err)
        scenario.error = `Failed to toggle scenario: ${err.message || "Unknown error"}`
        scenario.isToggling = false

        // Try to enable/disable directly as a fallback
        this.tryDirectEnableDisable(scenario)
      },
    })
  }

  // Helper method to try direct enable/disable as a fallback
  private tryDirectEnableDisable(scenario: Scenario): void {
    console.log(`Trying direct ${scenario.enabled ? "disable" : "enable"} for ${scenario.originalName}`)

    const operation = scenario.enabled
      ? this.scenarioService.disableScenario(scenario.originalName)
      : this.scenarioService.enableScenario(scenario.originalName)

    operation.subscribe({
      next: (response) => {
        console.log(`Direct ${scenario.enabled ? "disable" : "enable"} response:`, response)

        if (response && typeof response.enabled !== "undefined") {
          console.log(`Updating scenario state to: ${response.enabled}`)
          scenario.enabled = response.enabled
        } else {
          // Fallback if response doesn't have the expected structure
          console.log(`Response doesn't have expected structure, toggling locally`)
          scenario.enabled = !scenario.enabled
        }

        // Verify the state
        this.verifyScenarioState(scenario)
      },
      error: (err) => {
        console.error(`Error with direct ${scenario.enabled ? "disable" : "enable"}:`, err)
        scenario.error = `Failed to update scenario: ${err.message || "Unknown error"}`
      },
    })
  }

  // Helper method to verify the scenario state
  private verifyScenarioState(scenario: Scenario): void {
    console.log(`Verifying state for scenario: ${scenario.originalName}`)

    this.scenarioService.getScenarioStatus(scenario.originalName).subscribe({
      next: (status) => {
        console.log(`Current status for ${scenario.originalName}:`, status)

        if (status && typeof status.enabled !== "undefined") {
          if (scenario.enabled !== status.enabled) {
            console.log(
              `State mismatch detected for ${scenario.originalName}: UI=${scenario.enabled}, DB=${status.enabled}`,
            )
            scenario.enabled = status.enabled
          } else {
            console.log(`State verified for ${scenario.originalName}: ${status.enabled}`)
          }
        }
      },
      error: (err) => {
        console.error(`Error verifying scenario state for ${scenario.originalName}:`, err)
      },
    })
  }

  addReturn404Endpoint(): void {
    if (!this.newEndpoint) {
      this.submitError = "Please enter an endpoint"
      return
    }

    let endpoint = this.newEndpoint
    if (!endpoint.startsWith("/")) {
      endpoint = "/" + endpoint
    }

    console.log(`Adding Return 404 endpoint: ${endpoint}`)
    this.isSubmitting = true
    this.submitError = null
    this.submitSuccess = null

    this.scenarioService.configureReturn404(endpoint, true).subscribe({
      next: (response) => {
        console.log(`Return 404 endpoint added:`, response)
        this.submitSuccess = `Successfully added Return 404 for ${endpoint}`
        this.newEndpoint = ""
        this.isSubmitting = false

        setTimeout(() => {
          this.submitSuccess = null
        }, 3000)

        // Reload to see the new endpoint
        this.loadScenarios()
      },
      error: (err: HttpErrorResponse) => {
        console.error(`Error adding Return 404 endpoint:`, err)
        this.submitError = `Failed to add endpoint: ${err.message || "Unknown error"}`
        this.isSubmitting = false
      },
    })
  }

  

  getCategoryIcon(): string {
    // Return different icons based on scenario category
    if (this.filteredScenarios && this.filteredScenarios.length > 0) {
      const scenario = this.filteredScenarios[0]
      if (scenario.category === "Performance") {
        return "fa-tachometer-alt"
      }
    }
    return "fa-network-wired"
  }

  getImpactClass(): string {
    return "impact-high"
  }
}