export interface Problem {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  link: string;
  date: string; // YYYY-MM-DD
}

export interface Solution {
  author: string;
  code: string;
  language: string;
  aiExplanation?: string;
  notes?: string;
  status?: "DONE" | "TLE" | "MLE" | "FAILED" | "FAILED_CONSTRAINTS";
  cpuUsage?: number; // 0-100
  memoryUsage?: number; // 0-100
  date: string;
}
