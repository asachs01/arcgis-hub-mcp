import { parse } from 'csv-parse/sync';
import { fetchJson, fetchWithTimeout, FetchError } from './fetch-utils.js';
import { shapeCsvForContext, CsvShapeOptions, CsvRow } from './csv-shape.js';
import {
  CollectionsResponse,
  CollectionsResponseSchema,
  SearchItemsResponse,
  SearchItemsResponseSchema,
  ItemProperties,
  ServiceInfo,
  ServiceInfoSchema,
  LayerInfo,
  GeoJsonFeatureCollection,
  GeoJsonFeatureCollectionSchema,
  ItemMetadata,
  ItemMetadataSchema
} from './types.js';

export class ArcGISHubClient {
  private readonly searchBase: string;

  constructor(domain: string = 'data.chattanooga.gov') {
    this.searchBase = `https://${domain}/api/search/v1`;
  }

  async getCollections(): Promise<CollectionsResponse> {
    try {
      const url = `${this.searchBase}/collections`;
      const response = await fetchJson<unknown>(url);
      return CollectionsResponseSchema.parse(response);
    } catch (error) {
      if (error instanceof FetchError) {
        throw new Error(`Failed to fetch collections: ${error.message}`);
      }
      throw error;
    }
  }

  async searchItems(
    query?: string,
    collection: string = 'dataset',
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchItemsResponse> {
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      params.set('limit', limit.toString());
      if (offset > 0) params.set('startindex', offset.toString());

      const url = `${this.searchBase}/collections/${collection}/items?${params}`;
      const response = await fetchJson<unknown>(url);
      return SearchItemsResponseSchema.parse(response);
    } catch (error) {
      if (error instanceof FetchError) {
        throw new Error(`Failed to search items: ${error.message}`);
      }
      throw error;
    }
  }

  async getItemById(id: string): Promise<ItemProperties | null> {
    try {
      // Search for the specific item by ID
      const response = await this.searchItems(undefined, 'all', 1);
      const item = response.features.find(f => f.properties.id === id);
      return item ? item.properties : null;
    } catch (error) {
      if (error instanceof FetchError) {
        throw new Error(`Failed to get item ${id}: ${error.message}`);
      }
      throw error;
    }
  }

  async getServiceInfo(serviceUrl: string): Promise<ServiceInfo> {
    try {
      const url = `${serviceUrl}?f=json`;
      const response = await fetchJson<unknown>(url);
      return ServiceInfoSchema.parse(response);
    } catch (error) {
      if (error instanceof FetchError) {
        throw new Error(`Failed to get service info from ${serviceUrl}: ${error.message}`);
      }
      throw error;
    }
  }

  async queryFeatureService(
    serviceUrl: string,
    layerId: number = 0,
    where: string = '1=1',
    outFields: string = '*',
    limit: number = 50,
    offset: number = 0,
    spatialFilter?: { lon: number; lat: number }
  ): Promise<GeoJsonFeatureCollection> {
    try {
      const params = new URLSearchParams({
        where,
        outFields,
        f: 'geojson',
        resultRecordCount: limit.toString()
      });

      if (offset > 0) {
        params.set('resultOffset', offset.toString());
      }

      if (spatialFilter) {
        params.set('geometry', `${spatialFilter.lon},${spatialFilter.lat}`);
        params.set('geometryType', 'esriGeometryPoint');
        params.set('inSR', '4326');
        params.set('spatialRel', 'esriSpatialRelIntersects');
      }

      const url = `${serviceUrl}/${layerId}/query?${params}`;
      const response = await fetchJson<unknown>(url);
      return GeoJsonFeatureCollectionSchema.parse(response);
    } catch (error) {
      if (error instanceof FetchError) {
        throw new Error(`Failed to query feature service: ${error.message}`);
      }
      throw error;
    }
  }

  async getItemMetadata(id: string): Promise<ItemMetadata> {
    try {
      const url = `https://www.arcgis.com/sharing/rest/content/items/${id}?f=json`;
      const response = await fetchJson<unknown>(url);
      return ItemMetadataSchema.parse(response);
    } catch (error) {
      if (error instanceof FetchError) {
        throw new Error(`Failed to get item metadata for ${id}: ${error.message}`);
      }
      throw error;
    }
  }

  async downloadAndProcessCsv(
    id: string,
    options: CsvShapeOptions = {}
  ): Promise<{
    data: CsvRow[];
    truncated: boolean;
    totalRows: number;
    selectedColumns?: string[];
    sizeBytes: number;
  }> {
    try {
      const url = `https://www.arcgis.com/sharing/rest/content/items/${id}/data`;
      const response = await fetchWithTimeout(url, { timeout: 60000 }); // Longer timeout for large CSVs

      if (!response.ok) {
        throw new FetchError(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();
      const sizeBytes = new Blob([csvText]).size;

      // Parse CSV
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        cast: true,
        cast_date: false // Keep dates as strings for simplicity
      });

      const result = shapeCsvForContext(records, options);

      return {
        ...result,
        sizeBytes
      };
    } catch (error) {
      if (error instanceof FetchError) {
        throw new Error(`Failed to download/process CSV for ${id}: ${error.message}`);
      }
      throw error;
    }
  }

  isFeatureService(type: string): boolean {
    return type === 'Feature Service' || type === 'Map Service';
  }

  isCsvDataset(type: string): boolean {
    return type === 'CSV' || type.includes('CSV');
  }
}