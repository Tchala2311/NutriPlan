/**
 * Utility functions for detecting and extracting URLs from text
 */

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]{1,2048}/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : []; // Deduplicate URLs
}

export function isRecipeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // List of common recipe sites
    const recipeHosts = [
      'recipe',
      'cook',
      'food',
      'culinar',
      'bon-appetit',
      'tasty',
      'serious-eats',
      'allrecipes',
      'epicurious',
      'foodnetwork',
      'williams-sonoma',
      'seriouseats',
      'saveur',
      'acouplecooks',
      'budgetbytes',
      'copykat',
      'delish',
      'food52',
      'pinch-of-yum',
      'minimalist-baker',
      'oh-she-glows',
      'simple-recipes',
      'smittenkitchen',
      'smitten-kitchen',
      'whatsgabycooking',
      'culinarychasing',
      'recipetineats',
      'skinnytaste',
      'rasa-malaysia',
      'thewoksoflife',
      'redhousespice',
      'dishingout',
      'chefsteps',
    ];

    return recipeHosts.some((host) => hostname.includes(host));
  } catch {
    return false;
  }
}

export interface TextPart {
  type: 'text' | 'url';
  content: string;
}

export function extractTextParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let lastIndex = 0;

  const matches = [...text.matchAll(URL_REGEX)];

  matches.forEach((match) => {
    const url = match[0];
    const startIndex = match.index!;

    // Add text before URL
    if (startIndex > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, startIndex) });
    }

    // Add URL
    parts.push({ type: 'url', content: url });

    lastIndex = startIndex + url.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
