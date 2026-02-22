import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';

export function register(server: McpServer): void {
  server.tool(
    'create_database',
    '새 데이터베이스를 생성합니다.',
    {
      parent_page_id: z.string().describe('부모 페이지 ID 또는 URL'),
      title: z.string().describe('데이터베이스 제목'),
      properties: z
        .record(z.any())
        .describe(
          '프로퍼티 스키마 정의. 예: {"Name": {"title": {}}, "Status": {"select": {"options": [{"name":"Todo","color":"red"}]}}}'
        ),
    },
    async ({ parent_page_id, title, properties }) => {
      try {
        const notion = getNotionClient();
        const parentId = parseNotionId(parent_page_id);

        const response = await notion.databases.create({
          parent: { type: 'page_id', page_id: parentId },
          title: [
            {
              type: 'text',
              text: { content: title },
            },
          ],
          properties: properties as any,
        });

        const url = (response as any).url ?? '';
        const lines: string[] = [
          `## 데이터베이스 생성 완료`,
          `- ID: ${response.id}`,
          `- 제목: ${title}`,
        ];
        if (url) lines.push(`- URL: ${url}`);
        lines.push(`- 프로퍼티 수: ${Object.keys(response.properties ?? {}).length}`);

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
