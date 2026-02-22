export function formatProperties(properties: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, property] of Object.entries(properties)) {
    result[key] = formatProperty(property);
  }

  return result;
}

function formatProperty(property: any): string {
  if (!property || typeof property !== 'object') {
    return String(property ?? '');
  }

  const type: string = property.type;

  switch (type) {
    case 'title': {
      const texts: any[] = property.title ?? [];
      return texts.map((t: any) => t.plain_text ?? '').join('');
    }

    case 'rich_text': {
      const texts: any[] = property.rich_text ?? [];
      return texts.map((t: any) => t.plain_text ?? '').join('');
    }

    case 'number': {
      const num = property.number;
      return num === null || num === undefined ? '' : String(num);
    }

    case 'select': {
      return property.select?.name ?? '';
    }

    case 'multi_select': {
      const options: any[] = property.multi_select ?? [];
      return options.map((o: any) => o.name ?? '').join(', ');
    }

    case 'date': {
      const date = property.date;
      if (!date) return '';
      if (date.end) {
        return `${date.start} ~ ${date.end}`;
      }
      return date.start ?? '';
    }

    case 'people': {
      const people: any[] = property.people ?? [];
      return people
        .map((p: any) => p.name ?? p.id ?? '')
        .filter(Boolean)
        .join(', ');
    }

    case 'files': {
      const files: any[] = property.files ?? [];
      return files
        .map((f: any) => {
          if (f.type === 'external') return f.external?.url ?? '';
          if (f.type === 'file') return f.file?.url ?? '';
          return '';
        })
        .filter(Boolean)
        .join(', ');
    }

    case 'checkbox': {
      return property.checkbox ? 'Yes' : 'No';
    }

    case 'url': {
      return property.url ?? '';
    }

    case 'email': {
      return property.email ?? '';
    }

    case 'phone_number': {
      return property.phone_number ?? '';
    }

    case 'formula': {
      const formula = property.formula;
      if (!formula) return '';
      switch (formula.type) {
        case 'string':
          return formula.string ?? '';
        case 'number':
          return formula.number === null || formula.number === undefined
            ? ''
            : String(formula.number);
        case 'boolean':
          return formula.boolean ? 'true' : 'false';
        case 'date':
          if (formula.date?.end) {
            return `${formula.date.start} ~ ${formula.date.end}`;
          }
          return formula.date?.start ?? '';
        default:
          return '';
      }
    }

    case 'relation': {
      const relations: any[] = property.relation ?? [];
      return relations.map((r: any) => r.id ?? '').filter(Boolean).join(', ');
    }

    case 'rollup': {
      const rollup = property.rollup;
      if (!rollup) return '';
      switch (rollup.type) {
        case 'number':
          return rollup.number === null || rollup.number === undefined
            ? ''
            : String(rollup.number);
        case 'date':
          if (rollup.date?.end) {
            return `${rollup.date.start} ~ ${rollup.date.end}`;
          }
          return rollup.date?.start ?? '';
        case 'array': {
          const items: any[] = rollup.array ?? [];
          return items
            .map((item: any) => formatProperty(item))
            .filter(Boolean)
            .join(', ');
        }
        default:
          return '';
      }
    }

    case 'status': {
      return property.status?.name ?? '';
    }

    case 'created_time': {
      return property.created_time ?? '';
    }

    case 'created_by': {
      return property.created_by?.name ?? property.created_by?.id ?? '';
    }

    case 'last_edited_time': {
      return property.last_edited_time ?? '';
    }

    case 'last_edited_by': {
      return property.last_edited_by?.name ?? property.last_edited_by?.id ?? '';
    }

    case 'unique_id': {
      const uid = property.unique_id;
      if (!uid) return '';
      if (uid.prefix) {
        return `${uid.prefix}-${uid.number}`;
      }
      return String(uid.number ?? '');
    }

    default: {
      try {
        return JSON.stringify(property);
      } catch {
        return '';
      }
    }
  }
}
