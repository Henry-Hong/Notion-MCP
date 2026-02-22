import { formatProperties } from './format-properties.js';

export function formatQueryResults(response: any): string {
  const results: any[] = response?.results ?? [];
  const total: number = response?.total_count ?? results.length;
  const hasMore: boolean = response?.has_more ?? false;
  const nextCursor: string | null = response?.next_cursor ?? null;

  const lines: string[] = [];

  const showing = results.length;
  lines.push(`## Query Results (${total} total, showing 1-${showing})`);
  lines.push('');

  for (let i = 0; i < results.length; i++) {
    const page = results[i];
    const properties = page?.properties ?? {};
    const formattedProps = formatProperties(properties);

    // Find the title property
    const title = findTitle(properties, formattedProps);

    lines.push(`### ${i + 1}. ${title || 'Untitled'}`);

    for (const [key, value] of Object.entries(formattedProps)) {
      if (value) {
        lines.push(`- ${key}: ${value}`);
      }
    }

    lines.push(`  ID: ${page?.id ?? ''}`);
    lines.push('');
  }

  if (hasMore) {
    lines.push(`*More results available. Next cursor: ${nextCursor ?? ''}*`);
  }

  return lines.join('\n').trim();
}

export function formatSearchResults(response: any): string {
  const results: any[] = response?.results ?? [];
  const hasMore: boolean = response?.has_more ?? false;
  const nextCursor: string | null = response?.next_cursor ?? null;

  const lines: string[] = [];

  lines.push(`## Search Results (${results.length} found)`);
  lines.push('');

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const objectType: string = item?.object ?? 'unknown';
    const id: string = item?.id ?? '';
    const lastEdited: string = item?.last_edited_time ?? '';

    let title = 'Untitled';
    if (objectType === 'page') {
      const properties = item?.properties ?? {};
      title = extractPageTitle(properties) || item?.title?.[0]?.plain_text || 'Untitled';
    } else if (objectType === 'database') {
      const titleArr: any[] = item?.title ?? [];
      title = titleArr.map((t: any) => t?.plain_text ?? '').join('') || 'Untitled';
    }

    lines.push(`${i + 1}. **${title}** (${objectType})`);
    lines.push(`   Last edited: ${lastEdited} | ID: ${id}`);
    lines.push('');
  }

  if (hasMore) {
    lines.push(`*More results available. Next cursor: ${nextCursor ?? ''}*`);
  }

  return lines.join('\n').trim();
}

export function truncateIfNeeded(text: string, maxLength: number = 50000): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  return truncated + `\n\n...[truncated, ${text.length - maxLength} characters omitted]`;
}

function findTitle(
  properties: Record<string, any>,
  formattedProps: Record<string, string>
): string {
  // Try to find a 'title' type property first
  for (const [key, prop] of Object.entries(properties)) {
    if (prop?.type === 'title') {
      return formattedProps[key] ?? '';
    }
  }
  // Fall back to a key literally named "Name" or "Title"
  return formattedProps['Name'] ?? formattedProps['Title'] ?? '';
}

function extractPageTitle(properties: Record<string, any>): string {
  for (const prop of Object.values(properties)) {
    if (prop?.type === 'title') {
      const texts: any[] = prop.title ?? [];
      return texts.map((t: any) => t?.plain_text ?? '').join('');
    }
  }
  return '';
}
