// ★ DESIGN DECISION (owner: you) ───────────────────────────────
// How should we shape a large CSV (up to ~50k rows / 10MB) so it's
// useful to the model without flooding context? Current default is
// naive head-truncation. Consider: server-side-ish filtering, column
// stats/sampling, or returning an aggregate summary instead of raw rows.
// Tradeoff: completeness vs token budget. Refine this function.
// ───────────────────────────────────────────────────────────────

export interface CsvShapeOptions {
  columns?: string[];
  limit?: number;
  where?: string;
}

export interface CsvRow {
  [key: string]: string | number | null;
}

/**
 * Shape CSV data for model context consumption.
 * Current implementation: naive head truncation after column projection and simple filtering.
 */
export function shapeCsvForContext(
  rows: Record<string, unknown>[],
  options: CsvShapeOptions = {}
): {
  data: CsvRow[];
  truncated: boolean;
  totalRows: number;
  selectedColumns?: string[];
} {
  const { columns, limit = 50, where } = options;
  let processedRows = rows;

  // Apply column projection if specified
  if (columns && columns.length > 0) {
    processedRows = rows.map(row => {
      const projected: Record<string, unknown> = {};
      for (const col of columns) {
        if (col in row) {
          projected[col] = row[col];
        }
      }
      return projected;
    });
  }

  // Apply simple where filtering (substring match or equality)
  if (where && where.trim()) {
    const whereClause = where.toLowerCase().trim();
    processedRows = processedRows.filter(row => {
      return Object.values(row).some(value => {
        if (value == null) return false;
        return String(value).toLowerCase().includes(whereClause);
      });
    });
  }

  const totalRows = processedRows.length;
  const truncated = totalRows > limit;
  const finalRows = processedRows.slice(0, limit);

  // Convert to consistent format
  const data: CsvRow[] = finalRows.map(row => {
    const converted: CsvRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined || value === '') {
        converted[key] = null;
      } else if (typeof value === 'number') {
        converted[key] = value;
      } else {
        converted[key] = String(value);
      }
    }
    return converted;
  });

  return {
    data,
    truncated,
    totalRows,
    ...(columns && { selectedColumns: columns })
  };
}