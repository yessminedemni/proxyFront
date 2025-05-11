export interface Scenario {
    error: null
    isToggling: any
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


  
  
  