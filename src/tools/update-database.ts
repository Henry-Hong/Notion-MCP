import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';

export function register(server: McpServer): void {
  server.tool(
    'update_database',
    '데이터베이스의 제목, 설명, 프로퍼티 스키마를 수정합니다.',
    {
      database_id: z.string().describe('수정할 데이터베이스 ID 또는 URL'),
      title: z.string().optional().describe('새 데이터베이스 제목 (선택)'),
      description: z.string().optional().describe('새 데이터베이스 설명 (선택)'),
      properties: z
        .record(z.any())
        .optional()
        .describe(
          '프로퍼티 스키마 변경사항 (선택). 추가/수정: {"NewProp": {"select": {...}}}, 삭제: {"OldProp": null}'
        ),
    },
    async ({ database_id, title, description, properties }) => {
      try {
        const notion = getNotionClient();
        const parsedId = parseNotionId(database_id);

        const updateParams: Record<string, any> = { database_id: parsedId };

        if (title !== undefined) {
          updateParams['title'] = [
            { type: 'text', text: { content: title } },
          ];
        }

        if (description !== undefined) {
          updateParams['description'] = [
            { type: 'text', text: { content: description } },
          ];
        }

        if (properties !== undefined) {
          updateParams['properties'] = properties;
        }

        const response = await notion.databases.update(updateParams as any);

        const responseTitle: string = (() => {
          const titleArr: any[] = (response as any).title ?? [];
          return titleArr.map((t: any) => t?.plain_text ?? '').join('') || '제목 없음';
        })();

        const responseDesc: string = (() => {
          const descArr: any[] = (response as any).description ?? [];
          return descArr.map((t: any) => t?.plain_text ?? '').join('');
        })();

        const propCount = Object.keys((response as any).properties ?? {}).length;
        const url: string = (response as any).url ?? '';

        const lines: string[] = [
          `## 데이터베이스 업데이트 완료`,
          `- ID: ${response.id}`,
          `- 제목: ${responseTitle}`,
        ];
        if (responseDesc) lines.push(`- 설명: ${responseDesc}`);
        lines.push(`- 프로퍼티 수: ${propCount}`);
        if (url) lines.push(`- URL: ${url}`);

        const changed: string[] = [];
        if (title !== undefined) changed.push('제목');
        if (description !== undefined) changed.push('설명');
        if (properties !== undefined) changed.push('프로퍼티 스키마');
        if (changed.length > 0) lines.push(`- 변경된 항목: ${changed.join(', ')}`);

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
