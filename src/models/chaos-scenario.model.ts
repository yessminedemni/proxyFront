export interface ChaosScenario {
    id: string
    name: string
    description: string
    category?: string
    enabled: boolean
    details?: {
      [key: string]: string | number | boolean
    }
    severity?: "low" | "medium" | "high" | "critical"
    createdAt?: Date
    updatedAt?: Date
  }
  
  