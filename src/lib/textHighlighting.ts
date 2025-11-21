/**
 * Text highlighting utilities for search result navigation
 */

export interface HighlightOptions {
  className?: string;
  caseSensitive?: boolean;
  wholeWords?: boolean;
  maxHighlights?: number;
}

export interface HighlightMatch {
  start: number;
  end: number;
  text: string;
}

/**
 * Highlights text matches in a string with HTML markup
 */
export function highlightText(
  text: string, 
  searchTerms: string[], 
  options: HighlightOptions = {}
): string {
  if (!text || !searchTerms || searchTerms.length === 0) {
    return text;
  }

  const {
    className = 'bg-yellow-200 text-yellow-900 px-1 rounded font-medium',
    caseSensitive = false,
    wholeWords = false,
    maxHighlights = 50
  } = options;

  let highlightedText = text;
  let highlightCount = 0;

  // Sort terms by length (longest first) to avoid partial replacements
  const sortedTerms = [...searchTerms].sort((a, b) => b.length - a.length);

  for (const term of sortedTerms) {
    if (highlightCount >= maxHighlights) break;
    
    const flags = caseSensitive ? 'g' : 'gi';
    const pattern = wholeWords ? `\\b${escapeRegExp(term)}\\b` : escapeRegExp(term);
    const regex = new RegExp(`(${pattern})`, flags);
    
    const matches = highlightedText.match(regex);
    if (matches) {
      highlightCount += matches.length;
      highlightedText = highlightedText.replace(
        regex,
        `<mark class="${className}" data-highlight="${escapeHtml(term)}">$1</mark>`
      );
    }
  }

  return highlightedText;
}

/**
 * Finds all highlight matches in text without modifying it
 */
export function findHighlightMatches(
  text: string,
  searchTerms: string[],
  options: { caseSensitive?: boolean; wholeWords?: boolean } = {}
): HighlightMatch[] {
  if (!text || !searchTerms || searchTerms.length === 0) {
    return [];
  }

  const { caseSensitive = false, wholeWords = false } = options;
  const matches: HighlightMatch[] = [];

  for (const term of searchTerms) {
    const flags = caseSensitive ? 'g' : 'gi';
    const pattern = wholeWords ? `\\b${escapeRegExp(term)}\\b` : escapeRegExp(term);
    const regex = new RegExp(pattern, flags);
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
  }

  // Sort matches by position
  return matches.sort((a, b) => a.start - b.start);
}

/**
 * Scrolls to the first highlight in an element
 */
export function scrollToFirstHighlight(
  container: HTMLElement,
  options: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition } = {}
): boolean {
  const firstHighlight = container.querySelector('[data-highlight]') as HTMLElement;
  
  if (firstHighlight) {
    firstHighlight.scrollIntoView({
      behavior: options.behavior || 'smooth',
      block: options.block || 'center'
    });
    
    // Add temporary visual emphasis
    firstHighlight.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-75');
    setTimeout(() => {
      firstHighlight.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75');
    }, 2000);
    
    return true;
  }
  
  return false;
}

/**
 * Creates a context snippet around highlights
 */
export function createContextSnippet(
  text: string,
  searchTerms: string[],
  options: {
    contextLength?: number;
    maxSnippets?: number;
    separator?: string;
  } = {}
): string {
  const {
    contextLength = 100,
    maxSnippets = 3,
    separator = ' ... '
  } = options;

  const matches = findHighlightMatches(text, searchTerms);
  if (matches.length === 0) {
    return text.substring(0, contextLength * 2);
  }

  const snippets: string[] = [];
  let lastEnd = 0;

  for (let i = 0; i < Math.min(matches.length, maxSnippets); i++) {
    const match = matches[i];
    const start = Math.max(0, match.start - contextLength);
    const end = Math.min(text.length, match.end + contextLength);
    
    // Avoid overlapping snippets
    if (start <= lastEnd + contextLength) {
      // Extend the last snippet
      if (snippets.length > 0) {
        const lastSnippetEnd = snippets[snippets.length - 1].length;
        snippets[snippets.length - 1] = text.substring(
          snippets[snippets.length - 1].indexOf(text.substring(lastEnd - contextLength)) + lastEnd - contextLength,
          end
        );
      }
    } else {
      snippets.push(text.substring(start, end));
    }
    
    lastEnd = end;
  }

  return snippets.join(separator);
}

/**
 * Removes all highlights from text
 */
export function removeHighlights(html: string): string {
  return html.replace(/<mark[^>]*>(.*?)<\/mark>/gi, '$1');
}

/**
 * Gets all highlighted terms from HTML
 */
export function getHighlightedTerms(html: string): string[] {
  const matches = html.match(/data-highlight="([^"]+)"/g);
  if (!matches) return [];
  
  return matches.map(match => {
    const termMatch = match.match(/data-highlight="([^"]+)"/);
    return termMatch ? unescapeHtml(termMatch[1]) : '';
  }).filter(Boolean);
}

/**
 * Escapes special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escapes HTML characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Unescapes HTML characters
 */
function unescapeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Highlights search terms in a React component's text content
 */
export function useTextHighlighting(
  text: string,
  searchTerms: string[],
  options: HighlightOptions = {}
) {
  if (!searchTerms || searchTerms.length === 0) {
    return { highlightedText: text, hasHighlights: false };
  }

  const highlightedText = highlightText(text, searchTerms, options);
  const hasHighlights = highlightedText !== text;

  return { highlightedText, hasHighlights };
}