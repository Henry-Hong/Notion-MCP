import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';

export function register(server: McpServer): void {
  server.tool(
    'create_comment',
    '페이지에 댓글을 추가합니다.',
    {
      page_id: z.string().describe('댓글을 추가할 페이지 ID 또는 URL'),
      text: z.string().describe('댓글 내용 (plain text)'),
      discussion_id: z
        .string()
        .optional()
        .describe('기존 토론에 답글 달기 위한 discussion ID (선택)'),
    },
    async ({ page_id, text, discussion_id }) => {
      try {
        const notion = getNotionClient();
        const parsedPageId = parseNotionId(page_id);

        const rich_text = [
          {
            type: 'text' as const,
            text: { content: text },
          },
        ];

        let response: any;
        if (discussion_id) {
          response = await notion.comments.create({
            discussion_id,
            rich_text,
          } as any);
        } else {
          response = await notion.comments.create({
            parent: { page_id: parsedPageId },
            rich_text,
          } as any);
        }

        const lines: string[] = [
          `## 댓글 추가 완료`,
          `- 댓글 ID: ${response.id}`,
          `- 페이지 ID: ${parsedPageId}`,
          `- 내용: ${text}`,
          `- 생성 시간: ${response.created_time ?? ''}`,
        ];
        if (discussion_id) lines.push(`- 토론 ID: ${discussion_id}`);

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
