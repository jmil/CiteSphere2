# Scientific Citation Network Visualization Tool

## Overview

A web-based tool that enables researchers to explore and visualize citation relationships between academic papers. The application helps researchers understand research influence patterns and discover related work by fetching and displaying citation data from PubMed. Currently in Phase 1 of development, focusing on data collection and basic display of citation relationships.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Architecture
- **Backend**: Node.js with Express.js server providing RESTful API endpoints
- **Frontend**: Static HTML/CSS/JavaScript served from Express static middleware
- **Data Flow**: Client-side form submission → Express API → PubMed API integration → XML processing → Response display

### Data Collection Pipeline
- **DOI Resolution**: Converts DOI input to PMID using NCBI E-utilities API
- **PubMed Integration**: Fetches XML data for papers using NCBI efetch API
- **Citation Discovery**: Extracts citing papers, referenced papers, and related papers from PubMed data
- **XML Processing**: Uses xml2js library to parse PubMed XML responses into JavaScript objects

### Caching Strategy
- **File-Based Caching**: Local filesystem cache for PubMed XML responses to reduce API calls
- **Cache Directory**: `./pubmed_cache/` with individual XML files named by PMID
- **Cache-First Approach**: Checks local cache before making API requests

### Data Processing
- **Asynchronous Processing**: Uses async/await pattern for API calls and file operations
- **Error Handling**: Implements try-catch blocks for API failures and data parsing errors
- **XML Parsing**: Converts PubMed XML responses to JavaScript objects for data extraction

### Display Architecture
- **Flat List Display**: Shows papers grouped by category (root, citing, references, related)
- **Raw Data Verification**: Displays XML excerpts for data validation
- **Real-time Updates**: Client-side JavaScript handles form submission and result display

## External Dependencies

### Third-Party APIs
- **NCBI E-utilities**: Primary data source for PubMed paper metadata and citation relationships
  - esearch API for DOI to PMID conversion
  - efetch API for retrieving full paper XML data

### NPM Dependencies
- **express**: Web framework for Node.js server and API endpoints
- **axios**: HTTP client for making requests to external APIs
- **xml2js**: XML parsing library for converting PubMed XML to JavaScript objects

### File System Dependencies
- **Local Cache**: File system storage for caching PubMed XML responses
- **Static Assets**: Public directory for serving HTML, CSS, and JavaScript files

### Development Architecture
- **Single-Server Setup**: All functionality contained in single Express.js application
- **No Database**: Currently uses file-based caching instead of database storage
- **Phase-Based Development**: Designed for incremental feature additions in future phases