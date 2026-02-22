export function formatBlocks(blocks: any[]): string {
  const lines: string[] = [];
  let numberedListCounter = 0;

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    const type: string = block.type;

    // Reset numbered list counter when we hit a non-numbered block
    if (type !== 'numbered_list_item') {
      numberedListCounter = 0;
    }

    switch (type) {
      case 'paragraph': {
        const text = richTextToString(block.paragraph?.rich_text ?? []);
        lines.push(text);
        lines.push('');
        break;
      }

      case 'heading_1': {
        const text = richTextToString(block.heading_1?.rich_text ?? []);
        lines.push(`# ${text}`);
        lines.push('');
        break;
      }

      case 'heading_2': {
        const text = richTextToString(block.heading_2?.rich_text ?? []);
        lines.push(`## ${text}`);
        lines.push('');
        break;
      }

      case 'heading_3': {
        const text = richTextToString(block.heading_3?.rich_text ?? []);
        lines.push(`### ${text}`);
        lines.push('');
        break;
      }

      case 'bulleted_list_item': {
        const text = richTextToString(block.bulleted_list_item?.rich_text ?? []);
        lines.push(`- ${text}`);
        break;
      }

      case 'numbered_list_item': {
        numberedListCounter++;
        const text = richTextToString(block.numbered_list_item?.rich_text ?? []);
        lines.push(`${numberedListCounter}. ${text}`);
        break;
      }

      case 'to_do': {
        const checked: boolean = block.to_do?.checked ?? false;
        const text = richTextToString(block.to_do?.rich_text ?? []);
        lines.push(`- [${checked ? 'x' : ' '}] ${text}`);
        break;
      }

      case 'toggle': {
        const text = richTextToString(block.toggle?.rich_text ?? []);
        lines.push(`> ${text}`);
        if (block.has_children) {
          lines.push('> *(has children)*');
        }
        lines.push('');
        break;
      }

      case 'code': {
        const text = richTextToString(block.code?.rich_text ?? []);
        const language: string = block.code?.language ?? '';
        lines.push('```' + language);
        lines.push(text);
        lines.push('```');
        lines.push('');
        break;
      }

      case 'quote': {
        const text = richTextToString(block.quote?.rich_text ?? []);
        lines.push(`> ${text}`);
        lines.push('');
        break;
      }

      case 'callout': {
        const text = richTextToString(block.callout?.rich_text ?? []);
        const emoji: string = block.callout?.icon?.emoji ?? '';
        lines.push(`> ${emoji} ${text}`.trim());
        lines.push('');
        break;
      }

      case 'divider': {
        lines.push('---');
        lines.push('');
        break;
      }

      case 'image': {
        const image = block.image;
        let url = '';
        if (image?.type === 'external') {
          url = image.external?.url ?? '';
        } else if (image?.type === 'file') {
          url = image.file?.url ?? '';
        }
        const caption = richTextToString(image?.caption ?? []);
        lines.push(`![${caption || 'image'}](${url})`);
        lines.push('');
        break;
      }

      case 'bookmark': {
        const url: string = block.bookmark?.url ?? '';
        const caption = richTextToString(block.bookmark?.caption ?? []);
        lines.push(`[${caption || 'bookmark'}](${url})`);
        lines.push('');
        break;
      }

      case 'table': {
        // Table rows are nested as children; the table block itself just has metadata
        // We emit a note; actual rows come as child blocks
        lines.push('');
        break;
      }

      case 'table_row': {
        const cells: any[][] = block.table_row?.cells ?? [];
        const cellStrings = cells.map((cell: any[]) => richTextToString(cell));
        lines.push(`| ${cellStrings.join(' | ')} |`);
        break;
      }

      case 'child_page': {
        const title: string = block.child_page?.title ?? 'Untitled';
        lines.push(`📄 Page: ${title}`);
        lines.push('');
        break;
      }

      case 'child_database': {
        const title: string = block.child_database?.title ?? 'Untitled';
        lines.push(`📊 Database: ${title}`);
        lines.push('');
        break;
      }

      case 'embed': {
        const url: string = block.embed?.url ?? '';
        lines.push(`[embed](${url})`);
        lines.push('');
        break;
      }

      case 'video': {
        const video = block.video;
        let url = '';
        if (video?.type === 'external') {
          url = video.external?.url ?? '';
        } else if (video?.type === 'file') {
          url = video.file?.url ?? '';
        }
        lines.push(`[video](${url})`);
        lines.push('');
        break;
      }

      case 'file': {
        const file = block.file;
        let url = '';
        if (file?.type === 'external') {
          url = file.external?.url ?? '';
        } else if (file?.type === 'file') {
          url = file.file?.url ?? '';
        }
        lines.push(`[file](${url})`);
        lines.push('');
        break;
      }

      case 'pdf': {
        const pdf = block.pdf;
        let url = '';
        if (pdf?.type === 'external') {
          url = pdf.external?.url ?? '';
        } else if (pdf?.type === 'file') {
          url = pdf.file?.url ?? '';
        }
        lines.push(`[pdf](${url})`);
        lines.push('');
        break;
      }

      case 'link_preview': {
        const url: string = block.link_preview?.url ?? '';
        lines.push(`[link](${url})`);
        lines.push('');
        break;
      }

      case 'synced_block': {
        // Children are the actual content; mark as synced
        if (block.has_children) {
          lines.push('*(synced block with children)*');
        }
        break;
      }

      case 'column_list':
      case 'column': {
        // Children hold the actual content
        if (block.has_children) {
          lines.push('');
        }
        break;
      }

      case 'equation': {
        const expression: string = block.equation?.expression ?? '';
        lines.push(`$${expression}$`);
        lines.push('');
        break;
      }

      case 'table_of_contents': {
        lines.push('[TOC]');
        lines.push('');
        break;
      }

      case 'breadcrumb': {
        // Skip breadcrumb blocks
        break;
      }

      case 'unsupported': {
        lines.push('[unsupported block]');
        lines.push('');
        break;
      }

      default: {
        lines.push('[unsupported block]');
        lines.push('');
        break;
      }
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function richTextToString(richText: any[]): string {
  if (!Array.isArray(richText)) return '';
  return richText.map((t: any) => t?.plain_text ?? '').join('');
}
