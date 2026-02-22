import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getNotionClient, parseNotionId, formatApiError } from '../notion-client.js';

function formatUser(user: any): string[] {
  const lines: string[] = [];
  const name: string = user?.name ?? '이름 없음';
  const type: string = user?.type ?? 'unknown';
  const id: string = user?.id ?? '';
  const avatarUrl: string = user?.avatar_url ?? '';

  lines.push(`- 이름: ${name}`);
  lines.push(`- 유형: ${type}`);
  lines.push(`- ID: ${id}`);

  if (type === 'person') {
    const email: string = user?.person?.email ?? '';
    if (email) lines.push(`- 이메일: ${email}`);
  } else if (type === 'bot') {
    const ownerType: string = user?.bot?.owner?.type ?? '';
    if (ownerType) lines.push(`- 봇 소유자 유형: ${ownerType}`);
    const workspaceName: string = user?.bot?.workspace_name ?? '';
    if (workspaceName) lines.push(`- 워크스페이스: ${workspaceName}`);
  }

  if (avatarUrl) lines.push(`- 아바타: ${avatarUrl}`);
  return lines;
}

export function register(server: McpServer): void {
  server.tool(
    'get_users',
    '워크스페이스 사용자 목록을 조회하거나 특정 사용자 정보를 가져옵니다.',
    {
      user_id: z.string().optional().describe('특정 사용자 ID (선택, 생략 시 전체 목록)'),
      start_cursor: z.string().optional().describe('페이지네이션 커서 (선택)'),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(50)
        .describe('반환할 사용자 수 (1-100, 기본값 50)'),
    },
    async ({ user_id, start_cursor, page_size }) => {
      try {
        const notion = getNotionClient();

        if (user_id) {
          const parsedId = parseNotionId(user_id);
          const user = await notion.users.retrieve({ user_id: parsedId });

          const lines: string[] = [`## 사용자 정보`, '', ...formatUser(user)];
          return {
            content: [{ type: 'text', text: lines.join('\n') }],
          };
        }

        const params: Record<string, any> = {
          page_size: page_size ?? 50,
        };
        if (start_cursor) params['start_cursor'] = start_cursor;

        const response = await notion.users.list(params as any);
        const users: any[] = response?.results ?? [];
        const hasMore: boolean = response?.has_more ?? false;
        const nextCursor: string | null = response?.next_cursor ?? null;

        if (users.length === 0) {
          return {
            content: [{ type: 'text', text: '사용자가 없습니다.' }],
          };
        }

        const lines: string[] = [`## 사용자 목록 (${users.length}명)`, ''];

        for (let i = 0; i < users.length; i++) {
          lines.push(`### ${i + 1}. ${users[i]?.name ?? '이름 없음'}`);
          lines.push(...formatUser(users[i]));
          lines.push('');
        }

        if (hasMore) {
          lines.push(`*더 많은 사용자가 있습니다. Next cursor: ${nextCursor ?? ''}*`);
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
