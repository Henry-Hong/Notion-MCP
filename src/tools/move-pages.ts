import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';

export function register(server: McpServer): void {
  server.tool(
    'move_pages',
    '페이지를 다른 부모로 이동합니다.',
    {
      page_ids: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe('이동할 페이지 ID 목록 (최소 1개, 최대 50개)'),
      parent_type: z
        .enum(['page_id', 'database_id'])
        .describe('새 부모의 유형: "page_id" 또는 "database_id"'),
      parent_id: z.string().describe('새 부모 페이지 또는 데이터베이스 ID / URL'),
    },
    async ({ page_ids, parent_type, parent_id }) => {
      try {
        const notion = getNotionClient();
        const parsedParentId = parseNotionId(parent_id);

        const parent: Record<string, any> =
          parent_type === 'database_id'
            ? { type: 'database_id', database_id: parsedParentId }
            : { type: 'page_id', page_id: parsedParentId };

        const results: Array<{ id: string; success: boolean; message: string }> = [];

        for (const rawPageId of page_ids) {
          const parsedPageId = parseNotionId(rawPageId);
          try {
            await notion.pages.update({
              page_id: parsedPageId,
              parent: parent as any,
            } as any);
            results.push({ id: parsedPageId, success: true, message: '이동 완료' });
          } catch (err) {
            results.push({
              id: parsedPageId,
              success: false,
              message: formatApiError(err),
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.length - successCount;

        const lines: string[] = [
          `## 페이지 이동 결과`,
          `- 성공: ${successCount}개 / 실패: ${failCount}개`,
          `- 대상 부모: ${parent_type} = ${parsedParentId}`,
          '',
        ];

        for (const result of results) {
          const status = result.success ? '성공' : '실패';
          lines.push(`- [${status}] ${result.id}: ${result.message}`);
        }

        if (failCount > 0) {
          lines.push('');
          lines.push(
            '참고: Notion API는 페이지 부모 변경에 제한이 있을 수 있습니다. ' +
              '특히 다른 워크스페이스나 공유 권한이 다른 페이지로의 이동은 지원되지 않습니다.'
          );
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
