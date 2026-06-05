# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-05

### Added
- Initial release of ArcGIS Hub MCP server
- Support for any ArcGIS Hub domain via `ARCGIS_HUB_DOMAIN` environment variable
- Five core tools for comprehensive data access:
  - `list_collections`: Browse data catalog collections
  - `search_datasets`: Full-text search across datasets with pagination
  - `get_dataset`: Detailed metadata and access mode detection
  - `query_feature_service`: Rich geospatial queries with spatial and attribute filters
  - `get_dataset_csv`: CSV download with column projection and filtering
- Point-in-polygon spatial queries for location-based lookups
- Robust error handling with clear upstream error messages
- TypeScript implementation with strict type safety
- Configurable CSV row shaping with naive head-truncation default
- Support for Feature Services, Map Services, and CSV datasets
- Comprehensive documentation and usage examples

### Technical Details
- Built with @modelcontextprotocol/sdk and zod for input validation
- Stdio transport for Claude Desktop and Claude Code integration
- Timeout-protected fetch wrapper preventing silent failures
- CSV parsing with csv-parse library
- Node 18+ compatibility with native fetch support