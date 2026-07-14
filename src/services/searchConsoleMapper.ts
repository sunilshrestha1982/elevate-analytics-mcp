import type { SearchConsoleRow, SearchConsoleSummary } from './searchConsoleService.js';

export class SearchConsoleMapper {
  mapRows(rows: Array<Record<string, unknown>>, request: { sort?: string; regex?: { query?: string; page?: string } }, dimension: 'query' | 'page' | 'country' | 'device' | 'searchAppearance') {
    const mapped = rows.map((row) => {
      const keys = Array.isArray(row.keys) ? row.keys : [];
      const query = typeof keys[0] === 'string' ? keys[0] : '';
      const page = typeof keys[1] === 'string' ? keys[1] : '';
      const country = typeof keys[0] === 'string' ? keys[0] : '';
      const device = typeof keys[0] === 'string' ? keys[0] : '';
      const searchAppearance = typeof keys[0] === 'string' ? keys[0] : '';
      return {
        query: dimension === 'query' ? query : '',
        page: dimension === 'page' ? page : '',
        country: dimension === 'country' ? country : '',
        device: dimension === 'device' ? device : '',
        searchAppearance: dimension === 'searchAppearance' ? searchAppearance : '',
        clicks: Number(row.clicks ?? 0),
        impressions: Number(row.impressions ?? 0),
        ctr: Number(row.ctr ?? 0),
        position: Number(row.position ?? 0),
      } satisfies SearchConsoleRow;
    });

    const sortKey = request.sort ?? 'clicks';
    return mapped.sort((left, right) => {
      const leftValue = Number((left as Record<string, unknown>)[sortKey] ?? 0);
      const rightValue = Number((right as Record<string, unknown>)[sortKey] ?? 0);
      return rightValue - leftValue;
    });
  }

  mapSummary(summary: Partial<SearchConsoleSummary>): SearchConsoleSummary {
    return {
      clicks: Number(summary.clicks ?? 0),
      impressions: Number(summary.impressions ?? 0),
      ctr: Number(summary.ctr ?? 0),
      position: Number(summary.position ?? 0),
    };
  }
}
