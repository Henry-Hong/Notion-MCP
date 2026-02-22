import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';
import { formatQueryResults, truncateIfNeeded } from '../utils/format-response.js';

export function register(server: McpServer): void {
  server.tool(
    'query_database',
    '데이터베이스를 필터, 정렬, 페이지네이션으로 쿼리합니다. 프로퍼티 기반 정밀 필터링이 가능합니다.',
    {
      database_id: z.string().describe('데이터베이스 ID 또는 Notion URL'),
      filter: z
        .record(z.any())
        .optional()
        .describe(
          'Notion 필터 객체. 단일: {"property": "Status", "select": {"equals": "Done"}}, ' +
            '복합: {"and": [{"property": "Status", "select": {"equals": "Done"}}, ...]}'
        ),
      sorts: z
        .array(z.record(z.any()))
        .optional()
        .describe(
          '정렬 배열. 예: [{"property": "Name", "direction": "ascending"}] 또는 ' +
            '[{"timestamp": "created_time", "direction": "descending"}]'
        ),
      start_cursor: z.string().optional().describe('페이지네이션 커서'),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(50)
        .describe('반환할 결과 수 (1-100, 기본값 50)'),
    },
    async ({ database_id, filter, sorts, start_cursor, page_size }) => {
      try {
        const notion = getNotionClient();
        const parsedId = parseNotionId(database_id);

        const queryParams: any = {
          database_id: parsedId,
          page_size,
        };
        if (filter !== undefined) queryParams.filter = filter;
        if (sorts !== undefined) queryParams.sorts = sorts;
        if (start_cursor !== undefined) queryParams.start_cursor = start_cursor;

        const response = await notion.databases.query(queryParams);
        const formatted = formatQueryResults(response);
        return {
          content: [{ type: 'text', text: truncateIfNeeded(formatted) }],
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
