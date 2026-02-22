import { Client } from '@notionhq/client';

let notionClient: Client | null = null;

export function getNotionClient(): Client {
  if (!notionClient) {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }
    notionClient = new Client({ auth: apiKey });
  }
  return notionClient;
}

export function parseNotionId(input: string): string {
  if (!input) return input;

  let cleaned = input.trim();

  // Strip query params
  const qIndex = cleaned.indexOf('?');
  if (qIndex !== -1) {
    cleaned = cleaned.slice(0, qIndex);
  }

  // Strip hash fragments
  const hashIndex = cleaned.indexOf('#');
  if (hashIndex !== -1) {
    cleaned = cleaned.slice(0, hashIndex);
  }

  // Handle full Notion URLs:
  // https://www.notion.so/workspace/Page-Title-abc123def456...
  // https://notion.so/abc123def456...
  // https://www.notion.so/abc123def456...
  const urlPattern = /notion\.so\/(?:[^/]+\/)*([a-f0-9]{32}|[a-f0-9-]{36})\s*$/i;
  const urlMatch = cleaned.match(urlPattern);
  if (urlMatch) {
    cleaned = urlMatch[1];
  }

  // Also handle the case where the ID is embedded at the end of a slug with dashes:
  // e.g. "Page-Title-abc123def456" -> last 32 hex chars
  const slugPattern = /[^a-f0-9]([a-f0-9]{32})$/i;
  const slugMatch = cleaned.match(slugPattern);
  if (slugMatch) {
    cleaned = slugMatch[1];
  }

  // Strip dashes from UUID format: 12345678-90ab-cdef-1234-567890abcdef
  const uuidWithDashes = /^([a-f0-9]{8})-([a-f0-9]{4})-([a-f0-9]{4})-([a-f0-9]{4})-([a-f0-9]{12})$/i;
  if (uuidWithDashes.test(cleaned)) {
    return cleaned.replace(/-/g, '');
  }

  // Already a 32-char hex string (UUID without dashes)
  const uuidNoDashes = /^[a-f0-9]{32}$/i;
  if (uuidNoDashes.test(cleaned)) {
    return cleaned;
  }

  // Return as-is if we couldn't parse it (let Notion API produce the error)
  return cleaned;
}

export function formatApiError(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as Record<string, any>;

    // @notionhq/client throws APIResponseError with status, code, message
    const status: number | undefined = err['status'];
    const code: string | undefined = err['code'];
    const message: string | undefined = err['message'];

    if (status !== undefined && message) {
      if (code) {
        return `Notion API Error (${status}): [${code}] ${message}`;
      }
      return `Notion API Error (${status}): ${message}`;
    }

    if (message) {
      return `Notion API Error: ${message}`;
    }

    // Fallback for generic Error instances
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
  }

  return `Unknown error: ${String(error)}`;
}
