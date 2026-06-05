#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ArcGISHubClient } from './arcgis-client.js';
import {
  SearchDatasetsParamsSchema,
  GetDatasetParamsSchema,
  QueryFeatureServiceParamsSchema,
  GetDatasetCsvParamsSchema
} from './types.js';

// Get domain from environment variable
const ARCGIS_HUB_DOMAIN = process.env.ARCGIS_HUB_DOMAIN || 'data.chattanooga.gov';

// Initialize client
const client = new ArcGISHubClient(ARCGIS_HUB_DOMAIN);

// Create MCP server
const server = new Server(
  {
    name: 'arcgis-hub-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_collections',
        description: 'List available data collections from the ArcGIS Hub catalog (dataset, document, appAndMap, all)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'search_datasets',
        description: 'Search for datasets by text query. Returns compact results with queryable flag indicating Feature Service availability.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text search query (optional)'
            },
            collection: {
              type: 'string',
              enum: ['dataset', 'document', 'appAndMap', 'all'],
              description: 'Collection to search in',
              default: 'dataset'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Maximum number of results',
              default: 20
            },
            offset: {
              type: 'number',
              minimum: 0,
              description: 'Starting offset for pagination',
              default: 0
            }
          },
          required: []
        }
      },
      {
        name: 'get_dataset',
        description: 'Get detailed metadata for a dataset and learn how to access its data (Feature Service query vs CSV download)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Dataset ID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'query_feature_service',
        description: 'Query a Feature Service with spatial and attribute filters. Main tool for rich geospatial data access.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Dataset ID (alternative to serviceUrl)'
            },
            serviceUrl: {
              type: 'string',
              description: 'Feature Service URL (alternative to id)'
            },
            layerId: {
              type: 'number',
              description: 'Layer ID within the service',
              default: 0
            },
            where: {
              type: 'string',
              description: 'SQL WHERE clause for attribute filtering',
              default: '1=1'
            },
            outFields: {
              type: 'string',
              description: 'Output fields (* for all)',
              default: '*'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 1000,
              description: 'Maximum features to return',
              default: 50
            },
            offset: {
              type: 'number',
              minimum: 0,
              description: 'Starting offset for pagination',
              default: 0
            },
            point: {
              type: 'object',
              properties: {
                lon: { type: 'number', description: 'Longitude' },
                lat: { type: 'number', description: 'Latitude' }
              },
              description: 'Point location for spatial intersection query',
              required: ['lon', 'lat']
            }
          },
          required: []
        }
      },
      {
        name: 'get_dataset_csv',
        description: 'Download and process CSV dataset with optional column selection and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Dataset ID'
            },
            columns: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific columns to include (optional projection)'
            },
            limit: {
              type: 'number',
              minimum: 1,
              description: 'Maximum rows to return',
              default: 50
            },
            where: {
              type: 'string',
              description: 'Simple text filter (substring/equality match)'
            }
          },
          required: ['id']
        }
      }
    ]
  };
});

// Tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_collections': {
        const collections = await client.getCollections();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(collections, null, 2)
            }
          ]
        };
      }

      case 'search_datasets': {
        const params = SearchDatasetsParamsSchema.parse(args);
        const results = await client.searchItems(
          params.query,
          params.collection,
          params.limit,
          params.offset
        );

        // Format results compactly with queryable flag
        const formattedResults = {
          numberMatched: results.numberMatched,
          results: results.features.map(feature => ({
            id: feature.properties.id,
            title: feature.properties.title,
            type: feature.properties.type,
            snippet: feature.properties.snippet || '',
            owner: feature.properties.owner || '',
            modified: feature.properties.modified ? new Date(feature.properties.modified).toISOString() : '',
            queryable: client.isFeatureService(feature.properties.type) && Boolean(feature.properties.url)
          }))
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedResults, null, 2)
            }
          ]
        };
      }

      case 'get_dataset': {
        const params = GetDatasetParamsSchema.parse(args);

        // Get item details from search
        const searchResults = await client.searchItems(undefined, 'all', 100);
        const item = searchResults.features.find(f => f.properties.id === params.id);

        if (!item) {
          throw new Error(`Dataset with ID ${params.id} not found`);
        }

        const properties = item.properties;
        let accessInfo: any;

        if (client.isFeatureService(properties.type) && properties.url) {
          // Get service layers
          const serviceInfo = await client.getServiceInfo(properties.url);
          accessInfo = {
            mode: 'query',
            serviceUrl: properties.url,
            layers: serviceInfo.layers || []
          };
        } else if (client.isCsvDataset(properties.type)) {
          // Get CSV metadata for size
          const metadata = await client.getItemMetadata(params.id);
          accessInfo = {
            mode: 'download',
            csvUrl: `https://www.arcgis.com/sharing/rest/content/items/${params.id}/data`,
            sizeBytes: metadata.size || 0
          };
        } else {
          accessInfo = {
            mode: 'unsupported',
            reason: `Dataset type '${properties.type}' is not supported for data access`
          };
        }

        const result = {
          metadata: {
            id: properties.id,
            title: properties.title,
            type: properties.type,
            snippet: properties.snippet,
            description: properties.description,
            tags: properties.tags,
            owner: properties.owner,
            created: properties.created ? new Date(properties.created).toISOString() : undefined,
            modified: properties.modified ? new Date(properties.modified).toISOString() : undefined,
            size: properties.size,
            url: properties.url
          },
          access: accessInfo
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'query_feature_service': {
        const params = QueryFeatureServiceParamsSchema.parse(args);

        let serviceUrl: string;

        if (params.id) {
          // Look up service URL from item ID
          const searchResults = await client.searchItems(undefined, 'all', 100);
          const item = searchResults.features.find(f => f.properties.id === params.id);

          if (!item || !item.properties.url) {
            throw new Error(`Feature Service URL not found for dataset ID ${params.id}`);
          }
          serviceUrl = item.properties.url;
        } else if (params.serviceUrl) {
          serviceUrl = params.serviceUrl;
        } else {
          throw new Error('Either id or serviceUrl must be provided');
        }

        const features = await client.queryFeatureService(
          serviceUrl,
          params.layerId,
          params.where,
          params.outFields,
          params.limit,
          params.offset,
          params.point
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(features, null, 2)
            }
          ]
        };
      }

      case 'get_dataset_csv': {
        const params = GetDatasetCsvParamsSchema.parse(args);

        const options: any = { limit: params.limit };
        if (params.columns) options.columns = params.columns;
        if (params.where) options.where = params.where;

        const result = await client.downloadAndProcessCsv(params.id, options);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`ArcGIS Hub MCP server running for domain: ${ARCGIS_HUB_DOMAIN}`);
}

main().catch(console.error);