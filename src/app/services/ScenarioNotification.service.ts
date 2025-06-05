// ✅ FINAL CLEAN IMPLEMENTATION WITH FULL SCENARIO SUPPORT & FIXED DURATION
// Now includes logic to prevent resetting duration unnecessarily

import { Injectable, signal } from "@angular/core";

export interface ScenarioNotification {
  id: string;
  scenarioId: string;
  scenarioName: string;
  type: "enabled" | "disabled";
  severity: "normal" | "warning" | "critical";
  startTime: Date;
  duration: number;
  description: string;
  impact: string;
  suggestedAction: string;
  icon: string;
}

@Injectable({
  providedIn: "root",
})
export class ScenarioNotificationService {
  notifications = signal<ScenarioNotification[]>([]);

  private scenarioConfig = {
    cpuLoad: {
      name: "CPU Load",
      icon: "fa-microchip",
      severity: "warning" as const,
      description: "High CPU utilization detected",
      impact: "May cause slow response times and system instability",
      suggestedAction: "Monitor system performance and consider scaling resources",
    },
    highLoad: {
      name: "Traffic Load",
      icon: "fa-network-wired",
      severity: "warning" as const,
      description: "High network traffic detected",
      impact: "Increased latency and potential timeouts",
      suggestedAction: "Check load balancer configuration and scale if needed",
    },
    return404: {
      name: "404 Errors",
      icon: "fa-exclamation-triangle",
      severity: "warning" as const,
      description: "Returning 404 errors for certain requests",
      impact: "Users experiencing page not found errors",
      suggestedAction: "Check application routing and endpoint availability",
    },
    memoryLoad: {
      name: "Memory Load",
      icon: "fa-memory",
      severity: "warning" as const,
      description: "High memory usage detected",
      impact: "Risk of application crashes and performance degradation",
      suggestedAction: "Monitor memory leaks and optimize applications",
    },
    serviceDown: {
      name: "Service Down",
      icon: "fa-power-off",
      severity: "critical" as const,
      description: "Critical service is unavailable",
      impact: "Complete service disruption affecting all users",
      suggestedAction: "Immediate intervention required - restart services and check logs",
    },
    dbDown: {
      name: "Database Down",
      icon: "fa-database",
      severity: "critical" as const,
      description: "Database connection lost",
      impact: "Data operations completely blocked, application non-functional",
      suggestedAction: "Check database server status, connectivity, and restart if needed",
    },
    packetLoss: {
      name: "Packet Loss",
      icon: "fa-wifi",
      severity: "warning" as const,
      description: "Network packet loss detected in database communication",
      impact: "Data transmission failures and intermittent connection issues",
      suggestedAction: "Check network infrastructure, cables, and router configuration",
    },
    latencyInjection: {
      name: "Database Latency",
      icon: "fa-hourglass-half",
      severity: "warning" as const,
      description: "Artificial delay added to database responses",
      impact: "Significantly increased response times and poor user experience",
      suggestedAction: "Optimize database queries, connection pooling, and indexing",
    },
    stressTesting: {
      name: "Query Load Stress",
      icon: "fa-tachometer-alt",
      severity: "warning" as const,
      description: "High database query load detected from stress testing",
      impact: "Database performance degradation and potential timeouts",
      suggestedAction: "Monitor database performance metrics and consider scaling",
    },
    queryBlackhole: {
      name: "Query Blackhole",
      icon: "fa-ban",
      severity: "critical" as const,
      description: "Database queries being dropped or not processed",
      impact: "Complete loss of database operations and data access",
      suggestedAction: "Immediately check database connectivity and query processing systems",
    },
    connectionKill: {
      name: "Connection Kill",
      icon: "fa-unlink",
      severity: "critical" as const,
      description: "Database connections being forcefully terminated",
      impact: "Application unable to access database, causing system failures",
      suggestedAction: "Review connection pool settings, database health, and network stability",
    },
    diskFaultInjection: {
      name: "Disk Fault Injection",
      icon: "fa-hdd",
      severity: "critical" as const,
      description: "Simulated disk I/O fault injected",
      impact: "May cause data access failures and degraded performance",
      suggestedAction: "Check disk usage, logs, and rollback injected fault",
    }
  };

  private startTimes: Record<string, Date> = {};

  updateDurations() {
    const now = new Date();
    this.notifications.update((notifications) =>
      notifications
        .filter(n => n.type === 'enabled')
        .map((n) => ({
          ...n,
          duration: Math.floor((now.getTime() - n.startTime.getTime()) / 1000)
        }))
    );
  }

  removeNotification(notificationId: string) {
    this.notifications.update((notifications) =>
      notifications.filter((n) => n.id !== notificationId)
    );
    delete this.startTimes[notificationId];
  }

  clearAllNotifications() {
    this.notifications.set([]);
    this.startTimes = {};
  }

  getCriticalCount(): number {
    return this.notifications().filter((n) => n.severity === "critical" && n.type === "enabled").length;
  }

  getWarningCount(): number {
    return this.notifications().filter((n) => n.severity === "warning" && n.type === "enabled").length;
  }

  addNotification(rawScenarioId: string, enabled: boolean) {
    const scenarioId = rawScenarioId.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
    const config = this.scenarioConfig[scenarioId as keyof typeof this.scenarioConfig];

    if (!config) {
      console.warn(`⚠️ No config found for scenario: ${scenarioId}`);
      return;
    }

    const now = new Date();

    if (enabled) {
      if (this.hasNotificationForScenario(scenarioId)) return;

      const notification: ScenarioNotification = {
        id: scenarioId,
        scenarioId,
        scenarioName: config.name,
        type: "enabled",
        severity: config.severity,
        startTime: now,
        duration: 0,
        description: config.description,
        impact: config.impact,
        suggestedAction: config.suggestedAction,
        icon: config.icon,
      };

      this.notifications.update(n => [...n, notification]);
      this.startTimes[scenarioId] = now;
    } else {
      this.notifications.update(notifications =>
        notifications.filter(n => n.id !== scenarioId)
      );
      delete this.startTimes[scenarioId];
    }
  }

  getEnabledNotifications(): ScenarioNotification[] {
    return this.notifications().filter(n => n.type === 'enabled');
  }

  getEnabledCount(): number {
    return this.getEnabledNotifications().length;
  }

  getNotificationsBySeverity(severity: 'normal' | 'warning' | 'critical'): ScenarioNotification[] {
    return this.getEnabledNotifications().filter(n => n.severity === severity);
  }

  hasNotificationForScenario(scenarioId: string): boolean {
    return this.getEnabledNotifications().some(n => n.id === scenarioId);
  }

  getNotificationForScenario(scenarioId: string): ScenarioNotification | undefined {
    return this.getEnabledNotifications().find(n => n.id === scenarioId);
  }

  getDebugInfo() {
    return {
      totalNotifications: this.notifications().length,
      enabledNotifications: this.getEnabledNotifications().length,
      criticalCount: this.getCriticalCount(),
      warningCount: this.getWarningCount(),
      startTimes: Object.keys(this.startTimes),
      availableScenarios: Object.keys(this.scenarioConfig),
      notifications: this.notifications().map(n => ({
        id: n.id,
        name: n.scenarioName,
        type: n.type,
        severity: n.severity,
        duration: n.duration
      }))
    };
  }

  getAllScenarioConfigs() {
    return Object.entries(this.scenarioConfig).map(([id, config]) => ({
      id,
      ...config
    }));
  }
}
