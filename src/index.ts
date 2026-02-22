#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import all tool registrations
import { register as registerQueryDatabase } from './tools/query-database.js';
import { register as registerFetchPage } from './tools/fetch-page.js';
import { register as registerSearch } from './tools/search.js';
import { register as registerCreatePage } from './tools/create-page.js';
import { register as registerUpdatePage } from './tools/update-page.js';
import { register as registerCreateDatabase } from './tools/create-database.js';
import { register as registerCreateComment } from './tools/create-comment.js';
import { register as registerGetComments } from './tools/get-comments.js';
import { register as registerGetUsers } from './tools/get-users.js';
import { register as registerMovePages } from './tools/move-pages.js';
import { register as registerDuplicatePage } from './tools/duplicate-page.js';
import { register as registerUpdateDatabase } from './tools/update-database.js';

const server = new McpServer({
  name: 'notion-mcp-server',
  version: '1.0.0',
});

// Register all tools
registerQueryDatabase(server);
registerFetchPage(server);
registerSearch(server);
registerCreatePage(server);
registerUpdatePage(server);
registerCreateDatabase(server);
registerCreateComment(server);
registerGetComments(server);
registerGetUsers(server);
registerMovePages(server);
registerDuplicatePage(server);
registerUpdateDatabase(server);

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
