import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule, Router } from "@angular/router"
import { ScenarioService } from "../../services/ScenarioService.service"
import { ScenarioNotificationService } from "../../services/ScenarioNotification.service"
import { NotificationBellComponent } from "../notification-bell/notification-bell.component"

interface NavItem {
  path: string
  title: string
  description: string
  icon?: string
  group?: string
}

@Component({
  selector: "app-header",
  template: `
    <header class="header">
      <div class="logo">
        <i class="fas fa-database"></i>
        <span>ChaosOps</span>
      </div>
      <div class="header-right">
        <notification-bell></notification-bell>
        <button class="menu-trigger" (click)="toggleMenu()">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </header>

    <div class="menu-overlay" [class.open]="isMenuOpen" [ngClass]="{'dark-theme': isDarkTheme}">
      <nav class="menu-content">
        <button class="close-button" (click)="toggleMenu()">×</button>

        <div class="nav-groups">
          <div *ngFor="let group of navigationGroups" class="nav-group">
            <h3 class="group-title">{{ group }}</h3>
            <div class="nav-links">
              <a *ngFor="let item of getItemsByGroup(group)"
                 [routerLink]="isLinkAccessible(item.path) ? item.path : null"
                 routerLinkActive="active"
                 class="nav-link"
                 [class.disabled]="!isLinkAccessible(item.path)"
                 (click)="handleNavigation(item.path)">
                <i class="fas {{ item.icon }}" aria-hidden="true"></i>
                <div class="nav-info">
                  <div class="nav-title">{{ item.title }}</div>
                  <div class="nav-description">{{ item.description }}</div>
                </div>
                <i *ngIf="!isLinkAccessible(item.path)" class="fas fa-lock lock-icon"></i>
              </a>
            </div>
          </div>
        </div>

        <div class="theme-toggle">
          <span>{{ isDarkTheme ? 'Dark' : 'Light' }} Mode</span>
          <label class="switch">
            <input type="checkbox"
                   [checked]="isDarkTheme"
                   (change)="toggleTheme()">
            <span class="slider"></span>
          </label>
        </div>
      </nav>
    </div>
  `,
  styleUrls: ["./header.component.scss"],
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent],
})
export class HeaderComponent implements OnInit {
  isMenuOpen = false
  isDarkTheme = false
  currentRoute = ""

  // Define conditional access rules
  private routeAccess: { [key: string]: string[] } = {
    '/app-scenarios': ['/metrics', '/app-dashboard', '/configuration'],
    '/metrics': ['/app-scenarios', '/app-dashboard', '/configuration', '/dashboard', '/chaosdash'],
    '/app-dashboard': ['/app-scenarios', '/metrics', '/configuration'],
    '/configuration': ['/app-scenarios', '/metrics', '/app-dashboard', '/dashboard', '/chaosdash'],
    '/dashboard': ['/metrics', '/configuration', '/chaosdash'],
    '/chaosdash': ['/dashboard', '/metrics', '/configuration']
  }

  navigationItems: NavItem[] = [
    { path: "/chaosdash", title: "MySQL Dashboard", description: "View MySQL proxy performance and metrics", icon: "fa-chart-line", group: "Dashboards" },
    { path: "/app-dashboard", title: "App Dashboard", description: "Application monitoring dashboard", icon: "fa-desktop", group: "Dashboards" },
    { path: "/dashboard", title: "MySQL Scenarios", description: "Manage MySQL test scenarios", icon: "fa-flask", group: "Scenarios" },
    { path: "/app-scenarios", title: "App Scenarios", description: "Manage application-specific scenarios", icon: "fa-code", group: "Scenarios" },
    { path: "/configuration", title: "Database Config", description: "Configure database connections and settings", icon: "fa-database", group: "Settings" },
    { path: "/metrics", title: "Metrics", description: "Monitor system metrics and analytics", icon: "fa-chart-bar", group: "Settings" },
    { path: "/documentation", title: "Documentation", description: "View guides and API references", icon: "fa-book", group: "Help" },
  ]

  constructor(
    private scenarioService: ScenarioService,
    private notificationService: ScenarioNotificationService,
    private router: Router
  ) {
    // Listen to route changes
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url;
    });
  }

  ngOnInit() {
    this.currentRoute = this.router.url;
    
    this.scenarioService.scenarios$.subscribe((scenarios) => {
      scenarios.forEach((scenario) => {
        const normalizedId = this.toCamelCase(scenario.name);
        this.notificationService.addNotification(normalizedId, scenario.enabled);
      });
    });

    console.log("Header - ScenarioService initialized and subscribed.");
  }

  toCamelCase(s: string): string {
    return s.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
  }

  get navigationGroups(): string[] {
    return [...new Set(this.navigationItems.map((item) => item.group))].filter(Boolean) as string[]
  }

  getItemsByGroup(group: string): NavItem[] {
    return this.navigationItems.filter((item) => item.group === group)
  }

  // Check if a link is accessible from current route
  isLinkAccessible(targetPath: string): boolean {
    // If current route has no restrictions, allow all navigation
    if (!this.routeAccess[this.currentRoute]) {
      return true;
    }
    
    // If target is current page, always allow (for active state)
    if (targetPath === this.currentRoute) {
      return true;
    }
    
    // Check if target path is in allowed list for current route
    return this.routeAccess[this.currentRoute].includes(targetPath);
  }

  // Handle navigation with access control
  handleNavigation(targetPath: string) {
    if (this.isLinkAccessible(targetPath)) {
      this.toggleMenu();
    } else {
      // Optionally show a message or handle restricted access
      console.log(`Navigation to ${targetPath} is restricted from ${this.currentRoute}`);
      // You could show a toast notification here
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen
    document.body.style.overflow = this.isMenuOpen ? "hidden" : ""
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme
    document.body.classList.toggle("dark-theme")
  }
}