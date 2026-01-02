export const extractPlaceholders = (promptText: string): string[] => {
  const placeholders: { label: string; value: string }[] = [];
  
  // Pattern 1: "Label: [placeholder]" format
  const labelColonPattern = /^[\s\*\-]*(.+?):\s*\[([^\]]+)\]/gm;
  let match;
  while ((match = labelColonPattern.exec(promptText)) !== null) {
    const label = match[1].trim().replace(/^[\*\-\s]+/, ''); // Remove leading bullets/stars
    const placeholder = match[2].trim();
    placeholders.push({
      label: label,
      value: placeholder
    });
  }
  
  // Pattern 2: "**Label:**" followed by "- [placeholder]" on next lines
  const sectionHeaderPattern = /\*\*([^:]+):\*\*[\s\S]*?-\s*\[([^\]]+)\]/g;
  while ((match = sectionHeaderPattern.exec(promptText)) !== null) {
    const section = match[1].trim();
    const placeholder = match[2].trim();
    placeholders.push({
      label: section,
      value: placeholder
    });
  }
  
  // Pattern 3: Standalone [descriptive placeholder] (longer descriptions)
  const standalonePattern = /\[([^\]]{20,})\]/g;
  while ((match = standalonePattern.exec(promptText)) !== null) {
    const placeholder = match[1].trim();
    // Extract a shorter label from the placeholder
    const shortLabel = placeholder.split(/[,;\.]/)[0].trim();
    placeholders.push({
      label: shortLabel.length > 50 ? shortLabel.substring(0, 50) + '...' : shortLabel,
      value: placeholder
    });
  }
  
  // Pattern 4: Simple {placeholder} format
  const curlyMatches = promptText.match(/\{([^}]+)\}/g) || [];
  curlyMatches.forEach(match => {
    const placeholder = match.slice(1, -1).trim();
    placeholders.push({
      label: formatPlaceholder(placeholder),
      value: placeholder
    });
  });
  
  // Pattern 5: Short [placeholder] not caught above
  const shortSquareMatches = promptText.match(/\[([^\]]{1,19})\]/g) || [];
  shortSquareMatches.forEach(match => {
    const placeholder = match.slice(1, -1).trim();
    // Skip if already captured by other patterns
    if (!placeholders.some(p => p.value === placeholder)) {
      placeholders.push({
        label: formatPlaceholder(placeholder),
        value: placeholder
      });
    }
  });
  
  // Remove duplicates and return labels (which are more user-friendly)
  const uniquePlaceholders = Array.from(
    new Set(placeholders.map(p => p.label))
  );
  
  return uniquePlaceholders.sort();
};

export const getPlaceholderMapping = (promptText: string): { [label: string]: string } => {
  const mapping: { [label: string]: string } = {};
  const placeholders: { label: string; value: string }[] = [];
  
  // Pattern 1: "Label: [placeholder]" format
  const labelColonPattern = /^[\s\*\-]*(.+?):\s*\[([^\]]+)\]/gm;
  let match;
  while ((match = labelColonPattern.exec(promptText)) !== null) {
    const label = match[1].trim().replace(/^[\*\-\s]+/, '');
    const placeholder = match[2].trim();
    placeholders.push({ label, value: placeholder });
  }
  
  // Pattern 2: "**Label:**" followed by "- [placeholder]" on next lines
  const sectionHeaderPattern = /\*\*([^:]+):\*\*[\s\S]*?-\s*\[([^\]]+)\]/g;
  while ((match = sectionHeaderPattern.exec(promptText)) !== null) {
    const section = match[1].trim();
    const placeholder = match[2].trim();
    placeholders.push({ label: section, value: placeholder });
  }
  
  // Pattern 3: Standalone [descriptive placeholder] (longer descriptions)
  const standalonePattern = /\[([^\]]{20,})\]/g;
  while ((match = standalonePattern.exec(promptText)) !== null) {
    const placeholder = match[1].trim();
    const shortLabel = placeholder.split(/[,;\.]/)[0].trim();
    const finalLabel = shortLabel.length > 50 ? shortLabel.substring(0, 50) + '...' : shortLabel;
    placeholders.push({ label: finalLabel, value: placeholder });
  }
  
  // Pattern 4: Simple {placeholder} format
  const curlyMatches = promptText.match(/\{([^}]+)\}/g) || [];
  curlyMatches.forEach(match => {
    const placeholder = match.slice(1, -1).trim();
    const label = formatPlaceholder(placeholder);
    placeholders.push({ label, value: placeholder });
  });
  
  // Pattern 5: Short [placeholder] not caught above
  const shortSquareMatches = promptText.match(/\[([^\]]{1,19})\]/g) || [];
  shortSquareMatches.forEach(match => {
    const placeholder = match.slice(1, -1).trim();
    if (!placeholders.some(p => p.value === placeholder)) {
      const label = formatPlaceholder(placeholder);
      placeholders.push({ label, value: placeholder });
    }
  });
  
  // Create mapping from label to original placeholder value
  placeholders.forEach(p => {
    mapping[p.label] = p.value;
  });
  
  return mapping;
};

export const replacePlaceholdersInPrompt = (
  promptText: string,
  userInputs: { [label: string]: string }
): string => {
  let processedPrompt = promptText;
  const placeholderMapping = getPlaceholderMapping(promptText);
  
  Object.entries(userInputs).forEach(([label, userValue]) => {
    if (userValue.trim()) {
      const originalPlaceholder = placeholderMapping[label];
      if (originalPlaceholder) {
        // Replace [originalPlaceholder] with user input
        const regex = new RegExp(`\\[${originalPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
        processedPrompt = processedPrompt.replace(regex, userValue);
        
        // Also handle {originalPlaceholder} format
        const curlyRegex = new RegExp(`\\{${originalPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g');
        processedPrompt = processedPrompt.replace(curlyRegex, userValue);
      }
    }
  });
  
  return processedPrompt;
};

export const validatePromptText = (promptText: string): string[] => {
  const errors: string[] = [];
  
  // Check for unmatched curly braces
  const openCurly = (promptText.match(/\{/g) || []).length;
  const closeCurly = (promptText.match(/\}/g) || []).length;
  
  if (openCurly !== closeCurly) {
    errors.push('Unmatched curly braces detected in prompt');
  }
  
  // Check for unmatched square brackets
  const openSquare = (promptText.match(/\[/g) || []).length;
  const closeSquare = (promptText.match(/\]/g) || []).length;
  
  if (openSquare !== closeSquare) {
    errors.push('Unmatched square brackets detected in prompt');
  }
  
  // Check for empty placeholders
  const emptyCurlyPlaceholders = promptText.match(/\{\s*\}/g);
  const emptySquarePlaceholders = promptText.match(/\[\s*\]/g);
  
  if (emptyCurlyPlaceholders || emptySquarePlaceholders) {
    errors.push('Empty placeholders {} or [] found - please provide placeholder names');
  }
  
  return errors;
};

export const formatPlaceholder = (placeholder: string): string => {
  // Convert snake_case or camelCase to Title Case
  return placeholder
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
    .replace(/_/g, ' ') // snake_case to spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // title case
};