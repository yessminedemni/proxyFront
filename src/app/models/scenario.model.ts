export interface Scenario {
    id?: number
    name: string
    enabled: boolean
    description?: string
    category?: string
    impact?: "low" | "medium" | "high" | "critical"
  }
 
  
  export interface StressTestStatus {
    running: boolean;
    activeThreads: number;
    queriesExecuted: number;
    startTime?: Date;
    runningTime?: string;
  }


  
  
  