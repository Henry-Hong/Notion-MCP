# Notion MCP Server

Notion 공식 API를 래핑한 커스텀 MCP 서버입니다. 기본 제공되는 Notion MCP를 대체하며, 데이터베이스 쿼리 기능이 훨씬 더 강력합니다.

## 주요 기능

기존 Notion MCP 대비 다음 기능이 개선되었습니다:

- **`query_database` 도구**: 필터, 정렬, 페이지네이션을 완벽하게 지원하는 데이터베이스 쿼리
- **프로퍼티 기반 필터링**: 복잡한 조건으로 정밀한 데이터 조회 가능
- **전체 12개 도구**: 페이지 생성/수정, 댓글, 사용자 관리 등 포괄적인 기능

## 설치

### 1단계: 저장소 복제

```bash
git clone https://github.com/yourusername/notion-mcp-server.git
cd notion-mcp-server
```

### 2단계: 의존성 설치

```bash
npm install
```

### 3단계: 빌드

```bash
npm run build
```

빌드 후 `dist/` 디렉토리에 컴파일된 파일이 생성됩니다.

## 설정

### 1단계: Notion Integration 토큰 발급

1. [Notion 통합 페이지](https://www.notion.so/my-integrations)로 이동
2. **새로운 통합 생성** 클릭
3. 통합 이름 입력 (예: "Claude MCP")
4. 기능 설정 (기본값 권장)
5. **제출** 후 생성된 **Internal Integration Secret** 복사

### 2단계: 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성:

```bash
NOTION_API_KEY=ntn_your_token_here
```

`ntn_your_token_here` 부분을 발급받은 토큰으로 교체하세요.

### 3단계: Claude Code에 MCP 서버 등록

`~/.claude/settings.json`에 다음을 추가:

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["/path/to/notion-mcp-server/dist/index.js"],
      "env": {
        "NOTION_API_KEY": "ntn_your_token_here"
      }
    }
  }
}
```

**경로 주의**: `/path/to/notion-mcp-server`를 실제 프로젝트 경로로 변경하세요.

예: `"args": ["/Users/username/devheerim/notion-mcp-server/dist/index.js"]`

### 4단계: Notion에서 Integration 연결

각 페이지 또는 데이터베이스마다:

1. 페이지/DB 우측 상단의 **공유** 또는 **+ 추가** 클릭
2. 검색창에서 생성한 Integration 이름 검색
3. Integration 선택 → **초대**

Integration이 접근할 수 있는 모든 페이지/DB를 이 과정을 통해 명시적으로 연결해야 합니다.

## 도구 목록

총 12개의 MCP 도구를 제공합니다:

| 도구 | 설명 |
|------|------|
| `query_database` | 데이터베이스를 필터, 정렬, 페이지네이션으로 쿼리 |
| `fetch_page` | 페이지 상세 정보 및 블록 콘텐츠 조회 |
| `search` | 워크스페이스 전체 검색 |
| `create_page` | 새 페이지 생성 |
| `update_page` | 기존 페이지 수정 |
| `create_database` | 새 데이터베이스 생성 |
| `create_comment` | 페이지에 댓글 추가 |
| `get_comments` | 페이지의 모든 댓글 조회 |
| `get_users` | 워크스페이스 사용자 조회 |
| `move_pages` | 페이지를 다른 위치로 이동 |
| `duplicate_page` | 기존 페이지 복제 |
| `update_database` | 데이터베이스 스키마 및 속성 수정 |

## 사용 예시

### 예시 1: 상태가 "완료"인 작업 조회

```bash
query_database:
  database_id: "12345678901234567890123456789012"
  filter:
    property: "Status"
    select:
      equals: "완료"
```

**결과**: 상태가 "완료"로 설정된 모든 항목 반환

### 예시 2: 우선순위 높음 + 상태 미완료인 작업 조회 (정렬 포함)

```bash
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

**결과**: 조건을 만족하는 항목들을 최신순으로 정렬하여 반환

### 예시 3: 기한이 오늘 이전인 작업 조회

```bash
query_database:
  database_id: "12345678901234567890123456789012"
  filter:
    property: "Due Date"
    date:
      before: "2026-02-22"
  page_size: 25
```

**결과**: 기한이 오늘 이전인 항목들을 25개씩 페이지네이션하여 반환

## 기술 스택

- **Node.js** - JavaScript 런타임
- **TypeScript** - 타입 안전성 제공
- **@modelcontextprotocol/sdk** - MCP 서버 프레임워크
- **@notionhq/client** - Notion 공식 API 클라이언트
- **Zod** - 입력 스키마 검증

## 라이선스

MIT
# Notion-MCP
