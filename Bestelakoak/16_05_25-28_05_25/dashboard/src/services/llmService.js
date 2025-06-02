export function normalizeLlmName(llmName) {
  if (!llmName) return '';
  
  const name = llmName.toLowerCase().trim();

  if (name.includes('claude')) {
    // Handle with most specific names first to ensure correct mapping

    // Handle 3.7 sonnet thinking
    if ((name.includes('3.7') || name.includes('3_7') || name.includes('3-7')) && 
        (name.includes('sonnet') || name.includes('sonet')) && 
        name.includes('thinking')) {
      return 'claude-3-7-sonnet-thinking';
    }

    // Handle 3.7 sonnet
    if ((name.includes('3.7') || name.includes('3_7') || name.includes('3-7')) && 
        (name.includes('sonnet') || name.includes('sonet'))) {
      return 'claude-3-7-sonnet';
    }

    // Handle 3.5 sonnet variations
    if ((name.includes('3.5') || name.includes('3_5') || name.includes('3-5')) && 
        (name.includes('sonnet') || name.includes('sonet'))) {
      return 'claude-3-5-sonnet';
    }

    // Handle sonnet 4 variations
    if ((name.includes('sonnet') || name.includes('sonet')) && 
        (name.includes('4') || name.includes('four') || name.includes('v4') || name.includes('sonnet4'))) {
      return 'claude-sonnet-4';
    }
    
    // Special case for general Claude 3 models (after specific versioned Sonnets)
    // This handles names like "Claude 3 Opus", "Claude 3 Sonnet" (non-versioned), "Claude 3 Haiku"
    if (name.includes('3')) {
      if (name.includes('opus')) return 'claude-3-opus';
      if (name.includes('sonnet')) return 'claude-3-sonnet'; // Catches "Claude 3 Sonnet" if not a more specific version
      if (name.includes('haiku')) return 'claude-3-haiku';
    }
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
    'claude-3-7-sonnet-thinking': 'matched_data_claude_3_7_sonnet_thinking.json',
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
