import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, formatApiError } from '../notion-client.js';
import { formatSearchResults, truncateIfNeeded } from '../utils/format-response.js';

export function register(server: McpServer): void {
  server.tool(
    'search',
    '워크스페이스에서 페이지/데이터베이스를 검색합니다.',
    {
      query: z.string().optional().describe('검색어 (선택)'),
      filter_object_type: z
        .enum(['page', 'database'])
        .optional()
        .describe('검색 대상 타입 필터: "page" 또는 "database"'),
      sort_direction: z
        .enum(['ascending', 'descending'])
        .optional()
        .default('descending')
        .describe('정렬 방향 (기본값 descending)'),
      start_cursor: z.string().optional().describe('페이지네이션 커서'),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe('반환할 결과 수 (1-100, 기본값 20)'),
    },
    async ({ query, filter_object_type, sort_direction, start_cursor, page_size }) => {
      try {
        const notion = getNotionClient();

        const searchParams: any = {
          page_size,
          sort: {
            direction: sort_direction,
            timestamp: 'last_edited_time',
          },
        };

        if (query !== undefined) searchParams.query = query;
        if (filter_object_type !== undefined) {
          searchParams.filter = {
            value: filter_object_type,
            property: 'object',
          };
        }
        if (start_cursor !== undefined) searchParams.start_cursor = start_cursor;

        const response = await notion.search(searchParams);
        const formatted = formatSearchResults(response);
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
