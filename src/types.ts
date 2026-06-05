import { z } from 'zod';

// Collections API
export const CollectionsResponseSchema = z.object({
  collections: z.array(z.object({
    id: z.string(),
    title: z.string()
  }))
});

export type CollectionsResponse = z.infer<typeof CollectionsResponseSchema>;

// Search Items API
export const ItemPropertiesSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  snippet: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  owner: z.string().optional(),
  source: z.string().optional(),
  created: z.number().optional(),
  modified: z.number().optional(),
  size: z.number().optional(),
  extent: z.any().optional(),
  url: z.string().nullable().optional()
});

export const FeatureSchema = z.object({
  properties: ItemPropertiesSchema
});

export const SearchItemsResponseSchema = z.object({
  numberMatched: z.number().optional(),
  features: z.array(FeatureSchema)
});

export type SearchItemsResponse = z.infer<typeof SearchItemsResponseSchema>;
export type ItemProperties = z.infer<typeof ItemPropertiesSchema>;

// Feature Service Metadata
export const LayerInfoSchema = z.object({
  id: z.number(),
  name: z.string()
});

export const ServiceInfoSchema = z.object({
  layers: z.array(LayerInfoSchema).optional(),
  tables: z.array(LayerInfoSchema).optional()
});

export type LayerInfo = z.infer<typeof LayerInfoSchema>;
export type ServiceInfo = z.infer<typeof ServiceInfoSchema>;

// Feature Service Query Response (GeoJSON)
export const GeoJsonFeatureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.record(z.unknown()).optional(),
  geometry: z.any().optional()
});

export const GeoJsonFeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJsonFeatureSchema)
});

export type GeoJsonFeature = z.infer<typeof GeoJsonFeatureSchema>;
export type GeoJsonFeatureCollection = z.infer<typeof GeoJsonFeatureCollectionSchema>;

// Item metadata from arcgis.com
export const ItemMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  description: z.string().optional(),
  snippet: z.string().optional(),
  tags: z.array(z.string()).optional(),
  owner: z.string().optional(),
  created: z.number().optional(),
  modified: z.number().optional(),
  size: z.number().optional(),
  url: z.string().optional()
});

export type ItemMetadata = z.infer<typeof ItemMetadataSchema>;

// Tool parameter schemas
export const SearchDatasetsParamsSchema = z.object({
  query: z.string().optional(),
  collection: z.enum(['dataset', 'document', 'appAndMap', 'all']).default('dataset'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export const GetDatasetParamsSchema = z.object({
  id: z.string()
});

export const QueryFeatureServiceParamsSchema = z.object({
  id: z.string().optional(),
  serviceUrl: z.string().optional(),
  layerId: z.number().default(0),
  where: z.string().default('1=1'),
  outFields: z.string().default('*'),
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  point: z.object({
    lon: z.number(),
    lat: z.number()
  }).optional()
}).refine(data => data.id || data.serviceUrl, {
  message: "Either 'id' or 'serviceUrl' must be provided"
});

export const GetDatasetCsvParamsSchema = z.object({
  id: z.string(),
  columns: z.array(z.string()).optional(),
  limit: z.number().min(1).default(50),
  where: z.string().optional()
});

export type SearchDatasetsParams = z.infer<typeof SearchDatasetsParamsSchema>;
export type GetDatasetParams = z.infer<typeof GetDatasetParamsSchema>;
export type QueryFeatureServiceParams = z.infer<typeof QueryFeatureServiceParamsSchema>;
export type GetDatasetCsvParams = z.infer<typeof GetDatasetCsvParamsSchema>;