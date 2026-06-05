# ArcGIS Hub MCP Server

A Model Context Protocol (MCP) server that provides access to ArcGIS Hub open data platforms used by thousands of US cities and counties. Works with any ArcGIS Hub site by simply changing the domain configuration.

## What is ArcGIS Hub?

ArcGIS Hub is Esri's platform for open government data. Cities and counties across the US use identical APIs, making this one server universally applicable to the civic data community. Examples include:

- **City of Chattanooga**: `data.chattanooga.gov`
- **City of Austin**: `data.austintexas.gov`  
- **Cook County, IL**: `datacatalog.cookcountyil.gov`
- **State of Connecticut**: `data.ct.gov`

## Features

- **Universal compatibility**: Works with any ArcGIS Hub domain
- **Rich geospatial queries**: Query Feature Services with spatial and attribute filters
- **CSV data access**: Download and process CSV datasets with filtering
- **Search and discovery**: Browse data catalogs and collections
- **Point-in-polygon lookups**: Find which district/zone contains a location
- **Pagination support**: Handle large datasets efficiently

## Installation

```bash
npm install -g arcgis-hub-mcp
# or locally
npm install arcgis-hub-mcp
```

## Configuration

### Environment Variables

- `ARCGIS_HUB_DOMAIN`: The ArcGIS Hub domain (default: `data.chattanooga.gov`)

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arcgis-hub": {
      "command": "arcgis-hub-mcp",
      "env": {
        "ARCGIS_HUB_DOMAIN": "data.chattanooga.gov"
      }
    }
  }
}
```

### Claude Code Configuration  

Add to your project's `.claude/settings.json`:

```json
{
  "mcp": {
    "arcgis-hub": {
      "command": ["npx", "arcgis-hub-mcp"],
      "env": {
        "ARCGIS_HUB_DOMAIN": "data.austintexas.gov"  
      }
    }
  }
}
```

## Available Tools

### `list_collections`
Returns available data collections (dataset, document, appAndMap, all).

### `search_datasets` 
Search for datasets by text query.

**Parameters:**
- `query` (optional): Text search terms
- `collection` (optional): Collection to search (`dataset`, `document`, `appAndMap`, `all`) 
- `limit` (optional): Max results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Returns:** Compact results with `queryable` flag indicating Feature Service availability.

### `get_dataset`
Get detailed metadata and learn how to access a dataset's data.

**Parameters:**
- `id`: Dataset ID

**Returns:** Full metadata plus `access` block indicating query vs download mode.

### `query_feature_service`
Query Feature Services with spatial and attribute filters. The flagship tool for rich geospatial data.

**Parameters:**
- `id` OR `serviceUrl`: Dataset ID or direct service URL (one required)
- `layerId` (optional): Layer ID within service (default: 0)
- `where` (optional): SQL WHERE clause (default: "1=1")  
- `outFields` (optional): Fields to return (default: "*")
- `limit` (optional): Max features (default: 50, max: 1000)
- `offset` (optional): Pagination offset (default: 0)
- `point` (optional): `{lon, lat}` for spatial intersection queries

**Returns:** GeoJSON FeatureCollection with features and geometry.

### `get_dataset_csv`
Download and process CSV datasets with optional filtering.

**Parameters:**
- `id`: Dataset ID
- `columns` (optional): Array of column names to include
- `limit` (optional): Max rows (default: 50)
- `where` (optional): Simple text filter for substring/equality matching

**Returns:** Processed CSV rows as JSON with metadata about truncation.

## Usage Examples

### Find all permit-related datasets
```javascript
// Search for permit data
await search_datasets({
  query: "permit",
  collection: "dataset", 
  limit: 10
})

// Get details for a specific dataset
await get_dataset({
  id: "abcd1234-5678-90ef-ghij-klmnopqrstuv"
})
```

### Query geospatial data
```javascript
// Find which council district contains a location
await query_feature_service({
  id: "council-districts-id",
  point: { lon: -85.3097, lat: 35.0456 }
})

// Get recent 311 service requests  
await query_feature_service({
  id: "311-requests-id",
  where: "created_date > '2024-01-01'",
  limit: 100
})
```

### Access CSV data
```javascript
// Get partial 311 data with specific columns
await get_dataset_csv({
  id: "311-requests-csv-id",
  columns: ["request_type", "status", "created_date"],
  limit: 100,
  where: "pothole"
})
```

## Remote HTTP Upgrade Path

This stdio MCP server can be easily redeployed as a streamable HTTP endpoint on platforms like:
- Cloudflare Workers (with Durable Objects for state)
- Express.js servers 
- Vercel/Netlify functions

The core `ArcGISHubClient` class is transport-agnostic and ready for HTTP wrapper deployment.

## Development

```bash
git clone <repository>
cd arcgis-hub-mcp
npm install
npm run dev
```

## License

MIT © 2026 Aaron Sachs / Wyre Technology