import { normalizeLlmName, getLlmDisplayName } from '../services/llmService';

// ...existing code...

function mapLlmDataForComparison(llmData) {
  return llmData.map(data => {
    // Normalize the LLM name to ensure consistent matching
    const normalizedName = normalizeLlmName(data.llm_name);
    const displayName = getLlmDisplayName(normalizedName);
    return {
      ...data,
      llm_name: normalizedName,
      llm_display_name: displayName,
      gen_time: data.durationMs, // Assuming 'durationMs' is the field for generation time
      // ...existing code...
    };
  });
}

// When filtering or finding LLM data, use the normalized names
function filterLlmDataByName(data, name) {
  const normalizedSearchName = normalizeLlmName(name);
  return data.filter(item => normalizeLlmName(item.llm_name) === normalizedSearchName);
}

// ...existing code...