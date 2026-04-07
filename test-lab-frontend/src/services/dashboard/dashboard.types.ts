export interface IDashboardResponse {
  statistics: {
    activeProjects: {
      count: number;
      badge: string;
      change: number; // positive or negative number for change indicator
    };
    testCases: {
      count: number;
      badge: string;
      newCases: number;
    };
    coverage: {
      percentage: number;
      badge: string;
      target: number;
    };
    lastExecution: {
      time: string; // "16:20" format
      badge: string;
      testCount: number;
    };
  };
  executionTrend: {
    period: string; // "30 jours", "7 jours", etc.
    data: Array<{
      month: string; // "Apr", "May", etc. or could be date string
      value: number;
      date?: string; // ISO date string for more precision
    }>;
  };
}
