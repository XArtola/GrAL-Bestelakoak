export interface TestCase {
  orderInFile?: number;
  actionableCommands: number;
  commands: string[];
}

export interface TestFile {
  totalTests: number;
  tests: Record<string, TestCase>;
}

export interface TestMetricsSummary {
  totalTestFiles: number;
  totalTestCases: number;
  totalActionableCommands: number;
  averageCommandsPerTest: number;
  fileBreakdown: Record<string, { actionableCommands: number; itBlockCount: number }>;
}

export interface TestMetricsResult {
  testFiles: Record<string, TestFile>;
  summary: TestMetricsSummary;
  actionableCommandTypes: string[];
  excludedCommands: string[];
}

export interface VisitorContext {
  currentTestName: string | null;
  currentFilePath: string;
  testFiles: Record<string, TestFile>;
  actionableCommands: Set<string>;
  excludedCommands: Set<string>;
}
