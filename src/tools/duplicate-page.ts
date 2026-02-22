import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';

// Block types that cannot be appended via the API
const UNSUPPORTED_BLOCK_TYPES = new Set([
  'synced_block',
  'child_page',
  'child_database',
  'template',
  'link_to_page',
]);

async function fetchBlocksRecursive(
  notion: any,
  blockId: string,
  depth: number
): Promise<any[]> {
  if (depth <= 0) return [];

  const blocks: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const params: Record<string, any> = { block_id: blockId, page_size: 100 };
    if (cursor) params['start_cursor'] = cursor;

    const response = await notion.blocks.children.list(params);
    const results: any[] = response?.results ?? [];
    blocks.push(...results);

    cursor = response?.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  // Recursively fetch children up to the given depth
  for (const block of blocks) {
    if (block.has_children && depth > 1) {
      block._children = await fetchBlocksRecursive(notion, block.id, depth - 1);
    }
  }

  return blocks;
}

function stripBlockForCreate(block: any): any | null {
  const type: string = block.type;
  if (UNSUPPORTED_BLOCK_TYPES.has(type)) return null;

  const content = block[type];
  if (!content) return null;

  const newBlock: Record<string, any> = { type, [type]: { ...content } };

  // Attach children if available
  if (block._children && block._children.length > 0) {
    const childBlocks: any[] = [];
    for (const child of block._children) {
      const stripped = stripBlockForCreate(child);
      if (stripped) childBlocks.push(stripped);
    }
    if (childBlocks.length > 0) {
      newBlock['children'] = childBlocks;
    }
  }

  // Remove fields not allowed in create requests
  delete newBlock[type].rich_text_annotations; // not a real field, just safety
  delete newBlock['id'];
  delete newBlock['created_time'];
  delete newBlock['last_edited_time'];
  delete newBlock['created_by'];
  delete newBlock['last_edited_by'];
  delete newBlock['parent'];
  delete newBlock['object'];
  delete newBlock['has_children'];

  return newBlock;
}

function extractTitleFromProperties(properties: Record<string, any>): string {
  for (const prop of Object.values(properties)) {
    if (prop?.type === 'title') {
      const texts: any[] = prop.title ?? [];
      return texts.map((t: any) => t?.plain_text ?? '').join('');
    }
  }
  return '';
}

function overrideTitleInProperties(
  properties: Record<string, any>,
  newTitle: string
): Record<string, any> {
  const updated = { ...properties };
  for (const [key, prop] of Object.entries(updated)) {
    if (prop?.type === 'title') {
      updated[key] = {
        ...prop,
        title: [{ type: 'text', text: { content: newTitle } }],
      };
      break;
    }
  }
  return updated;
}

function sanitizePropertiesForCreate(properties: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, prop] of Object.entries(properties)) {
    if (!prop || typeof prop !== 'object') continue;
    const type: string = prop.type;
    // Only include writable property types
    const writableTypes = new Set([
      'title', 'rich_text', 'number', 'select', 'multi_select',
      'date', 'people', 'files', 'checkbox', 'url', 'email',
      'phone_number', 'relation', 'status',
    ]);
    if (!writableTypes.has(type)) continue;
    result[key] = prop;
  }
  return result;
}

export function register(server: McpServer): void {
  server.tool(
    'duplicate_page',
    '페이지를 복제합니다.',
    {
      page_id: z.string().describe('복제할 페이지 ID 또는 URL'),
      new_title: z
        .string()
        .optional()
        .describe('새 페이지 제목 (기본값: "원본제목 (복사)")'),
    },
    async ({ page_id, new_title }) => {
      try {
        const notion = getNotionClient();
        const parsedId = parseNotionId(page_id);

        // 1. Retrieve original page
        const originalPage = await notion.pages.retrieve({ page_id: parsedId });
        const originalProperties: Record<string, any> = (originalPage as any).properties ?? {};
        const originalParent: any = (originalPage as any).parent ?? {};

        // 2. Determine title
        const originalTitle = extractTitleFromProperties(originalProperties);
        const finalTitle = new_title ?? `${originalTitle || 'Untitled'} (복사)`;

        // 3. Override title in properties
        let newProperties = sanitizePropertiesForCreate(originalProperties);
        newProperties = overrideTitleInProperties(newProperties, finalTitle);

        // 4. Fetch blocks (recursive, depth 2)
        const blocks = await fetchBlocksRecursive(notion, parsedId, 2);
        const skippedTypes: string[] = [];
        const childrenBlocks: any[] = [];
        for (const block of blocks) {
          if (UNSUPPORTED_BLOCK_TYPES.has(block.type)) {
            skippedTypes.push(block.type);
            continue;
          }
          const stripped = stripBlockForCreate(block);
          if (stripped) childrenBlocks.push(stripped);
        }

        // 5. Create new page
        const createParams: Record<string, any> = {
          parent: originalParent,
          properties: newProperties,
        };

        // Notion API allows max 100 children in create
        if (childrenBlocks.length > 0) {
          createParams['children'] = childrenBlocks.slice(0, 100);
        }

        const newPage = await notion.pages.create(createParams as any);
        const newPageUrl: string = (newPage as any).url ?? '';

        // 6. Append remaining blocks in batches of 100
        const remaining = childrenBlocks.slice(100);
        let appendedExtra = 0;
        for (let i = 0; i < remaining.length; i += 100) {
          const batch = remaining.slice(i, i + 100);
          await notion.blocks.children.append({
            block_id: newPage.id,
            children: batch as any,
          });
          appendedExtra += batch.length;
        }

        const lines: string[] = [
          `## 페이지 복제 완료`,
          `- 새 페이지 ID: ${newPage.id}`,
          `- 새 페이지 제목: ${finalTitle}`,
        ];
        if (newPageUrl) lines.push(`- URL: ${newPageUrl}`);
        lines.push(`- 복사된 블록: ${childrenBlocks.length}개`);
        if (appendedExtra > 0) lines.push(`  (초기 100개 + 추가 ${appendedExtra}개 append)`);
        if (skippedTypes.length > 0) {
          lines.push(`- 건너뛴 블록 유형 (API 미지원): ${[...new Set(skippedTypes)].join(', ')}`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: formatApiError(error) }],
          isError: true,
        };
      }
    }
  );
}
