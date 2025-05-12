import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  path: string;
  title: string;
  description: string;
  icon?: string;
  group?: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class HeaderComponent {
  isMenuOpen = false;
  isDarkTheme = false;

  navigationItems: NavItem[] = [
    // Dashboard Group
   
    {
      path: '/chaosdash',
      title: 'MySQL Dashboard',
      description: 'View MySQL proxy performance and metrics',
      icon: 'fa-chart-line',
      group: 'Dashboards'
    },
    {
      path: '/app-dashboard',
      title: 'App Dashboard',
      description: 'Application monitoring dashboard',
      icon: 'fa-desktop',
      group: 'Dashboards'
    },
    // Scenarios Group
    {
      path: '/dashboard',
      title: 'MySQL Scenarios',
      description: 'Manage MySQL test scenarios',
      icon: 'fa-flask',
      group: 'Scenarios'
    },
    {
      path: '/app-scenarios',
      title: 'App Scenarios',
      description: 'Manage application-specific scenarios',
      icon: 'fa-code',
      group: 'Scenarios'
    },
    // Configuration Group
    {
      path: '/configuration',
      title: 'Database Config',
      description: 'Configure database connections and settings',
      icon: 'fa-database',
      group: 'Settings'
    },
    
    {
      path: '/metrics',
      title: 'Metrics',
      description: 'Monitor system metrics and analytics',
      icon: 'fa-chart-bar',
      group: 'Settings'
    },
    // Documentation Group
    {
      path: '/documentation',
      title: 'Documentation',
      description: 'View guides and API references',
      icon: 'fa-book',
      group: 'Help'
    },
  ];

  // Get unique groups for navigation
  get navigationGroups(): string[] {
    return [...new Set(this.navigationItems.map(item => item.group))].filter(Boolean) as string[];
  }

  // Get items by group
  getItemsByGroup(group: string): NavItem[] {
    return this.navigationItems.filter(item => item.group === group);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.body.classList.toggle('dark-theme');
  }
}