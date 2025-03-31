import { Component, type OnInit } from "@angular/core"
import { ChaosScenario } from "../../../models/chaos-scenario.model"
import { ChaosService } from "../../../services/chaos.service"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-chaos-dashboard",
  templateUrl: "./chaos-dashboard.component.html",
  styleUrls: ["./chaos-dashboard.component.scss"],
  imports: [CommonModule], // ✅ Import CommonModule here

})
export class ChaosDashboardComponent implements OnInit {
  chaosScenarios: ChaosScenario[] = []
  filteredScenarios: ChaosScenario[] = []
  searchTerm: string = '';  categories: string[] = []
  selectedCategory = "All"
  isLoading = true
  error: string | null = null

  constructor(private chaosService: ChaosService) {}

  ngOnInit(): void {
    this.loadScenarios()
  }

  loadScenarios(): void {
    this.isLoading = true
    this.chaosService.getScenarios().subscribe({
      next: (scenarios: ChaosScenario[]) => {
        this.chaosScenarios = scenarios
        this.filteredScenarios = [...scenarios]
        this.extractCategories()
        this.isLoading = false
      },
      error: (err: any) => {
        this.error = "Failed to load chaos scenarios. Please try again."
        this.isLoading = false
        console.error("Error loading scenarios:", err)
      },
    })
  }

  extractCategories(): void {
    const categorySet = new Set<string>()
    this.chaosScenarios.forEach((scenario) => {
      if (scenario.category) {
        categorySet.add(scenario.category)
      }
    })
    this.categories = Array.from(categorySet)
  }

  toggleScenario(scenario: ChaosScenario): void {
    this.isLoading = true
    const updatedScenario = { ...scenario, enabled: !scenario.enabled }

    this.chaosService.updateScenario(updatedScenario).subscribe({
      next: (result: any) => {
        const index = this.chaosScenarios.findIndex((s) => s.id === scenario.id)
        if (index !== -1) {
          this.chaosScenarios[index] = result
          this.applyFilters()
        }
        this.isLoading = false
      },
      error: (err: any) => {
        this.error = `Failed to ${scenario.enabled ? "disable" : "enable"} the scenario. Please try again.`
        this.isLoading = false
        console.error("Error updating scenario:", err)
      },
    })
  }

  applyFilters(): void {
    this.filteredScenarios = this.chaosScenarios.filter((scenario) => {
      const matchesSearch =
        this.searchTerm === "" ||
        scenario.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        scenario.description.toLowerCase().includes(this.searchTerm.toLowerCase())

      const matchesCategory = this.selectedCategory === "All" || scenario.category === this.selectedCategory

      return matchesSearch && matchesCategory
    })
  }

  filterByCategory(category: string): void {
    this.selectedCategory = category
    this.applyFilters()
  }

  onSearchChange(): void {
    this.applyFilters()
  }

  resetFilters(): void {
    this.searchTerm = ""
    this.selectedCategory = "All"
    this.filteredScenarios = [...this.chaosScenarios]
  }
}

