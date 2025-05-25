export function normalizeLlmName(llmName) {
  if (!llmName) return '';
  
  const name = llmName.toLowerCase().trim();

  // Expanded handling for Claude Sonnet 4 and 3.5 variations
  if (name.includes('claude')) {
    // Handle 3.5 sonnet variations (e.g., "claude 3.5 sonnet", "claude sonnet 3.5")
    if ((name.includes('3.5') || name.includes('3_5') || name.includes('3-5')) && (name.includes('sonnet') || name.includes('sonet'))) {
      return 'claude-sonnet-4'; // Map 3.5 sonnet to sonnet-4 for consistency
    }
    // Handle sonnet 4 variations (e.g., "claude sonnet 4", "claude sonet four", "claude sonnet4", "claude sonnet v4")
    if ((name.includes('sonnet') || name.includes('sonet')) && (name.includes('4') || name.includes('four') || name.includes('v4') || name.includes('sonnet4'))) {
      return 'claude-sonnet-4';
    }
  }
  
  // Special case for Claude 3 models
  if (name.includes('claude') && name.includes('3')) {
    if (name.includes('opus')) return 'claude-3-opus';
    if (name.includes('sonnet')) return 'claude-3-sonnet';
    if (name.includes('haiku')) return 'claude-3-haiku';
  }
  
  // Handle other common LLM name variations
  // Replace spaces with dashes and remove special characters
  return name.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

// Map normalized LLM names to their corresponding matched_data filenames
export function getMatchedDataFilename(normalizedName) {
  // Add mappings for special cases
  const mapping = {
    'claude-sonnet-4': 'matched_data_claude_sonnet_4.json',
    'claude-3-5-sonnet': 'matched_data_claude_3_5_sonnet.json',
    'claude-3-7-sonnet': 'matched_data_claude_3_7_sonnet.json',
    // Add more mappings as needed
  };
  if (mapping[normalizedName]) return mapping[normalizedName];
  // Default: replace dashes with underscores and prepend
  return `matched_data_${normalizedName.replace(/-/g, '_')}.json`;
}

// Make sure to use the normalization function when querying and comparing LLM data
export async function getLlmTestResults(llmName) {
  const normalizedName = normalizeLlmName(llmName);
  const filename = getMatchedDataFilename(normalizedName);
  // ...load and return data from matched_data/filename...
  // ...existing code...
}

// Display name mapping for UI friendliness
export function getLlmDisplayName(normalizedName) {
  // Capitalizar la primera letra de cada palabra y reemplazar guiones bajos con espacios
  const displayName = normalizedName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Eliminar espacios al principio y al final
  return displayName.trim();
}
