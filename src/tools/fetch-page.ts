import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';
import { formatProperties } from '../utils/format-properties.js';
import { formatBlocks } from '../utils/format-blocks.js';
import { truncateIfNeeded } from '../utils/format-response.js';

async function fetchBlocksRecursive(
  notion: any,
  blockId: string,
  maxDepth: number,
  currentDepth: number
): Promise<any[]> {
  const response = await notion.blocks.children.list({ block_id: blockId, page_size: 100 });
  const blocks: any[] = response.results ?? [];

  if (currentDepth < maxDepth) {
    for (const block of blocks) {
      if (block.has_children) {
        block._children = await fetchBlocksRecursive(
          notion,
          block.id,
          maxDepth,
          currentDepth + 1
        );
      }
    }
  }

  return blocks;
}

function flattenBlocks(blocks: any[]): any[] {
  const result: any[] = [];
  for (const block of blocks) {
    result.push(block);
    if (block._children && block._children.length > 0) {
      result.push(...flattenBlocks(block._children));
    }
  }
  return result;
}

export function register(server: McpServer): void {
  server.tool(
    'fetch_page',
    '페이지 또는 데이터베이스의 상세 정보를 조회합니다. 프로퍼티와 콘텐츠(블록)를 함께 반환합니다.',
    {
      page_id: z.string().describe('페이지 또는 데이터베이스 ID / Notion URL'),
      include_children: z
        .boolean()
        .optional()
        .default(true)
        .describe('페이지 콘텐츠 블록 포함 여부 (기본값 true)'),
      max_depth: z
        .number()
        .int()
        .min(1)
        .max(3)
        .optional()
        .default(2)
        .describe('블록 재귀 깊이 (1-3, 기본값 2)'),
    },
    async ({ page_id, include_children, max_depth }) => {
      try {
        const notion = getNotionClient();
        const parsedId = parseNotionId(page_id);

        let pageData: any;
        let objectType: string;

        try {
          pageData = await notion.pages.retrieve({ page_id: parsedId });
          objectType = 'page';
        } catch (err: any) {
          if (err?.status === 404 || err?.code === 'object_not_found') {
            pageData = await notion.databases.retrieve({ database_id: parsedId });
            objectType = 'database';
          } else {
            throw err;
          }
        }

        const lines: string[] = [];

        // Title
        const properties: Record<string, any> = pageData.properties ?? {};
        let title = 'Untitled';
        if (objectType === 'page') {
          for (const prop of Object.values(properties)) {
            if ((prop as any)?.type === 'title') {
              const texts: any[] = (prop as any).title ?? [];
              title = texts.map((t: any) => t?.plain_text ?? '').join('') || 'Untitled';
              break;
            }
          }
        } else {
          const titleArr: any[] = pageData.title ?? [];
          title = titleArr.map((t: any) => t?.plain_text ?? '').join('') || 'Untitled';
        }

        lines.push(`# ${title}`);
        lines.push('');
        lines.push(`**ID:** ${pageData.id}`);
        lines.push(`**Type:** ${objectType}`);
        lines.push(`**URL:** ${pageData.url ?? ''}`);
        lines.push(`**Created:** ${pageData.created_time ?? ''}`);
        lines.push(`**Last Edited:** ${pageData.last_edited_time ?? ''}`);
        lines.push('');

        // Properties
        if (Object.keys(properties).length > 0) {
          lines.push('## Properties');
          const formattedProps = formatProperties(properties);
          for (const [key, value] of Object.entries(formattedProps)) {
            if (value) {
              lines.push(`- **${key}:** ${value}`);
            }
          }
          lines.push('');
        }

        // Content blocks
        if (include_children && objectType === 'page') {
          const blocks = await fetchBlocksRecursive(notion, parsedId, max_depth, 1);
          const flatBlocks = flattenBlocks(blocks);
          if (flatBlocks.length > 0) {
            lines.push('## Content');
            lines.push('');
            lines.push(formatBlocks(flatBlocks));
          }
        }

        return {
          content: [{ type: 'text', text: truncateIfNeeded(lines.join('\n')) }],
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
