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

export function renderTextWithLinks(
  text: string,
  onUrl?: (url: string) => React.ReactNode
): (string | React.ReactNode)[] {
  const parts: (string | React.ReactNode)[] = [];
  let lastIndex = 0;

  const matches = [...text.matchAll(URL_REGEX)];

  matches.forEach((match) => {
    const url = match[0];
    const startIndex = match.index!;

    // Add text before URL
    if (startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, startIndex));
    }

    // Add URL component or rendered link
    if (onUrl) {
      parts.push(onUrl(url));
    } else {
      parts.push(
        <a
          key={`${url}-${startIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sage-400 hover:text-sage-500 underline break-all"
        >
          {url}
        </a>
      );
    }

    lastIndex = startIndex + url.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
