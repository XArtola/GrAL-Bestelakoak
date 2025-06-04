```javascript
// ...existing code...

// Add efficiency table creation
export function createEfficiencyTable() {
  const createTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS efficiency_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      llm_model TEXT NOT NULL,
      generation_time INTEGER NOT NULL,
      execution_time INTEGER NOT NULL,
      passed BOOLEAN NOT NULL,
      actions_used INTEGER NOT NULL,
      generation_efficiency REAL,
      execution_efficiency REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  createTable.run();
}

export function insertEfficiencyMetrics(metrics) {
  const insert = db.prepare(`
    INSERT INTO efficiency_metrics 
    (test_name, file_path, llm_model, generation_time, execution_time, passed, actions_used, generation_efficiency, execution_efficiency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((metricsArray) => {
    for (const metric of metricsArray) {
      insert.run(
        metric.testName,
        metric.filePath,
        metric.llmModel,
        metric.generationTime,
        metric.executionTime,
        metric.passed ? 1 : 0,
        metric.actionsUsed,
        metric.generationEfficiency,
        metric.executionEfficiency
      );
    }
  });
  
  insertMany(metrics);
}

export function getEfficiencyMetrics(llmModel = null) {
  let query = 'SELECT * FROM efficiency_metrics';
  if (llmModel) {
    query += ' WHERE llm_model = ?';
    return db.prepare(query).all(llmModel);
  }
  return db.prepare(query).all();
}

export function getEfficiencySummary() {
  const query = `
    SELECT 
      llm_model,
      COUNT(*) as total_tests,
      SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed_tests,
      AVG(generation_efficiency) as avg_generation_efficiency,
      AVG(execution_efficiency) as avg_execution_efficiency,
      AVG(generation_time) as avg_generation_time,
      AVG(execution_time) as avg_execution_time,
      AVG(actions_used) as avg_actions_used
    FROM efficiency_metrics 
    GROUP BY llm_model
    ORDER BY avg_generation_efficiency DESC, avg_execution_efficiency DESC
  `;
  return db.prepare(query).all();
}

// ...existing code...
```