import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';
import { formatProperties } from '../utils/format-properties.js';

export function register(server: McpServer): void {
  server.tool(
    'update_page',
    '기존 페이지의 프로퍼티를 업데이트합니다. 아카이브/복원도 가능합니다.',
    {
      page_id: z.string().describe('업데이트할 페이지 ID 또는 Notion URL'),
      properties: z
        .record(z.any())
        .optional()
        .describe('업데이트할 프로퍼티 객체 (변경할 항목만 포함)'),
      archived: z
        .boolean()
        .optional()
        .describe('true: 페이지 아카이브, false: 복원'),
      icon: z
        .record(z.any())
        .optional()
        .describe('아이콘 설정. 예: {"type": "emoji", "emoji": "🎯"}'),
      cover: z
        .record(z.any())
        .optional()
        .describe('커버 설정. 예: {"type": "external", "external": {"url": "https://..."}}'),
    },
    async ({ page_id, properties, archived, icon, cover }) => {
      try {
        const notion = getNotionClient();
        const parsedId = parseNotionId(page_id);

        const updateParams: any = { page_id: parsedId };
        if (properties !== undefined) updateParams.properties = properties;
        if (archived !== undefined) updateParams.archived = archived;
        if (icon !== undefined) updateParams.icon = icon;
        if (cover !== undefined) updateParams.cover = cover;

        const response: any = await notion.pages.update(updateParams);

        const formattedProps = formatProperties(response.properties ?? {});
        const lines: string[] = [
          '## 페이지 업데이트 완료',
          `- ID: ${response.id}`,
          `- URL: ${response.url ?? ''}`,
          `- 수정 시간: ${response.last_edited_time ?? ''}`,
          `- 아카이브 상태: ${response.archived ? '아카이브됨' : '활성'}`,
          '',
          '### 현재 프로퍼티',
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
