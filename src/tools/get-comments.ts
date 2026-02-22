import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';

function richTextToPlain(richText: any[]): string {
  if (!Array.isArray(richText)) return '';
  return richText.map((t: any) => t?.plain_text ?? '').join('');
}

export function register(server: McpServer): void {
  server.tool(
    'get_comments',
    '페이지 또는 블록의 댓글을 조회합니다.',
    {
      block_id: z.string().describe('댓글을 조회할 페이지 또는 블록 ID / URL'),
      start_cursor: z.string().optional().describe('페이지네이션 커서 (선택)'),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(50)
        .describe('반환할 댓글 수 (1-100, 기본값 50)'),
    },
    async ({ block_id, start_cursor, page_size }) => {
      try {
        const notion = getNotionClient();
        const parsedId = parseNotionId(block_id);

        const params: Record<string, any> = {
          block_id: parsedId,
          page_size: page_size ?? 50,
        };
        if (start_cursor) params['start_cursor'] = start_cursor;

        const response = await (notion.comments as any).list(params);

        const comments: any[] = response?.results ?? [];
        const hasMore: boolean = response?.has_more ?? false;
        const nextCursor: string | null = response?.next_cursor ?? null;

        if (comments.length === 0) {
          return {
            content: [{ type: 'text', text: '댓글이 없습니다.' }],
          };
        }

        const lines: string[] = [
          `## 댓글 목록 (${comments.length}개)`,
          '',
        ];

        for (let i = 0; i < comments.length; i++) {
          const comment = comments[i];
          const author = comment?.created_by?.name ?? comment?.created_by?.id ?? '알 수 없음';
          const createdTime: string = comment?.created_time ?? '';
          const text = richTextToPlain(comment?.rich_text ?? []);

          lines.push(`### ${i + 1}. ${author}`);
          lines.push(`- 시간: ${createdTime}`);
          lines.push(`- 내용: ${text}`);
          lines.push(`- ID: ${comment?.id ?? ''}`);
          if (comment?.discussion_id) {
            lines.push(`- 토론 ID: ${comment.discussion_id}`);
          }
          lines.push('');
        }

        if (hasMore) {
          lines.push(`*더 많은 댓글이 있습니다. Next cursor: ${nextCursor ?? ''}*`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n').trim() }],
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
