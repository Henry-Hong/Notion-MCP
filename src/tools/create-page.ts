import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';
import { formatProperties } from '../utils/format-properties.js';

export function register(server: McpServer): void {
  server.tool(
    'create_page',
    '새 페이지를 생성합니다. 데이터베이스 내 항목 또는 독립 페이지 생성 가능.',
    {
      parent_type: z
        .enum(['database_id', 'page_id'])
        .describe('부모 타입: "database_id" (DB 항목) 또는 "page_id" (하위 페이지)'),
      parent_id: z.string().describe('부모 DB 또는 페이지의 ID / Notion URL'),
      properties: z
        .record(z.any())
        .describe(
          '페이지 프로퍼티 객체. 예시:\n' +
            '  title: {"Name": {"title": [{"text": {"content": "제목"}}]}}\n' +
            '  select: {"Status": {"select": {"name": "Done"}}}\n' +
            '  multi_select: {"Tags": {"multi_select": [{"name": "A"}, {"name": "B"}]}}\n' +
            '  date: {"Due": {"date": {"start": "2024-01-01"}}}\n' +
            '  number: {"Count": {"number": 42}}\n' +
            '  checkbox: {"Done": {"checkbox": true}}\n' +
            '  url: {"Link": {"url": "https://example.com"}}'
        ),
      children: z
        .array(z.record(z.any()))
        .optional()
        .describe('페이지 콘텐츠 블록 배열 (선택)'),
    },
    async ({ parent_type, parent_id, properties, children }) => {
      try {
        const notion = getNotionClient();
        const parsedParentId = parseNotionId(parent_id);

        const createParams: any = {
          parent: { [parent_type]: parsedParentId },
          properties,
        };
        if (children && children.length > 0) {
          createParams.children = children;
        }

        const response: any = await notion.pages.create(createParams);

        const formattedProps = formatProperties(response.properties ?? {});
        const lines: string[] = [
          '## 페이지 생성 완료',
          `- ID: ${response.id}`,
          `- URL: ${response.url ?? ''}`,
          `- 생성 시간: ${response.created_time ?? ''}`,
          '',
          '### 프로퍼티',
        ];
        for (const [key, value] of Object.entries(formattedProps)) {
          if (value) lines.push(`- ${key}: ${value}`);
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
