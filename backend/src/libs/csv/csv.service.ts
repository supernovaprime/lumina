import { Injectable } from '@nestjs/common';

export interface CsvColumn<T = any> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

@Injectable()
export class CsvService {
  generate<T>(data: T[], columns: CsvColumn<T>[]): string {
    if (data.length === 0 || columns.length === 0) return '';

    const headers = columns.map((c) => c.header);
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = col.accessor(row);
        return this.escapeField(val);
      }).join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  generateFromKeys(data: Record<string, any>[], excludeKeys: string[] = []): string {
    if (data.length === 0) return '';

    const keys = Object.keys(data[0]).filter(
      (k) => !k.startsWith('_') && !excludeKeys.includes(k),
    );

    const rows = data.map((row) =>
      keys.map((k) => this.escapeField(row[k])).join(','),
    );

    return [keys.join(','), ...rows].join('\n');
  }

  toBuffer(csv: string): Buffer {
    return Buffer.from(csv, 'utf-8');
  }

  private escapeField(val: any): string {
    if (val === null || val === undefined) return '';
    if (val instanceof Date) return `"${val.toISOString()}"`;
    if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
