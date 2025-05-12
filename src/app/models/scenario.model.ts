export interface Scenario {
    id: number;
    name: string;
    originalName: string;
    enabled: boolean;
    description: string;
    error: string | null;
    isToggling: boolean;
    category?: string;
    impact?: string;
    
}

export interface StressTestStatus {
    running: boolean;
    activeThreads: number;
    queriesExecuted: number;
    startTime?: Date;
    runningTime?: string;
}


  
  
  