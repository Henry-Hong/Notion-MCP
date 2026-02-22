# @devheerim/notion-mcp-server

[![npm version](https://img.shields.io/npm/v/@devheerim/notion-mcp-server.svg)](https://www.npmjs.com/package/@devheerim/notion-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Notion 공식 API를 래핑한 MCP(Model Context Protocol) 서버입니다. 기본 제공되는 Notion MCP를 대체하며, **데이터베이스 쿼리 기능이 훨씬 더 강력합니다.**

## 주요 기능

- **`query_database`**: 필터, 정렬, 페이지네이션을 완벽하게 지원하는 데이터베이스 쿼리
- **프로퍼티 기반 필터링**: 복잡한 AND/OR 조건으로 정밀한 데이터 조회
- **전체 12개 도구**: 페이지 CRUD, 댓글, 사용자 관리 등 포괄적인 기능

## 설치

```bash
npm install -g @devheerim/notion-mcp-server
```

## 설정

### 1. Notion Integration 토큰 발급

1. [Notion Integrations](https://www.notion.so/my-integrations)에서 새 통합 생성
2. 생성된 **Internal Integration Secret** 복사 (`ntn_` 으로 시작)

### 2. Notion에서 Integration 연결

접근할 페이지/데이터베이스마다:
1. 우측 상단 **...** > **연결** 클릭
2. 생성한 Integration 선택

### 3. MCP 클라이언트에 등록

#### Claude Desktop / Claude Code

`claude_desktop_config.json` 또는 `~/.claude/settings.json`에 추가:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@devheerim/notion-mcp-server"],
      "env": {
        "NOTION_API_KEY": "ntn_your_token_here"
      }
    }
  }
}
```

#### 직접 실행

```bash
NOTION_API_KEY=ntn_your_token_here notion-mcp-server
```

## 도구 목록

| 도구 | 설명 |
|------|------|
| `query_database` | 데이터베이스를 필터, 정렬, 페이지네이션으로 쿼리 |
| `fetch_page` | 페이지 상세 정보 및 블록 콘텐츠 조회 |
| `search` | 워크스페이스 전체 검색 |
| `create_page` | 새 페이지 생성 |
| `update_page` | 기존 페이지 수정 |
| `create_database` | 새 데이터베이스 생성 |
| `update_database` | 데이터베이스 스키마 및 속성 수정 |
| `create_comment` | 페이지에 댓글 추가 |
| `get_comments` | 페이지의 모든 댓글 조회 |
| `get_users` | 워크스페이스 사용자 조회 |
| `move_pages` | 페이지를 다른 위치로 이동 |
| `duplicate_page` | 기존 페이지 복제 |

## 사용 예시

### 상태가 "완료"인 작업 조회

```
query_database:
  database_id: "12345678901234567890123456789012"
  filter:
    property: "Status"
    select:
      equals: "완료"
```

### 복합 필터 + 정렬

```
query_database:
  database_id: "12345678901234567890123456789012"
  filter:
    and:
      - property: "Priority"
        select:
          equals: "높음"
      - property: "Status"
        select:
          equals: "미완료"
  sorts:
    - property: "Created"
      direction: "descending"
```

### 날짜 기반 필터 + 페이지네이션

```
query_database:
  database_id: "12345678901234567890123456789012"
  filter:
    property: "Due Date"
    date:
      before: "2026-02-22"
  page_size: 25
```

## 기술 스택

- **TypeScript** + **Node.js**
- **@modelcontextprotocol/sdk** - MCP 서버 프레임워크
- **@notionhq/client** - Notion 공식 API 클라이언트
- **Zod** - 입력 스키마 검증

## 라이선스

MIT
