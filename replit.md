# Overview

This is a scientific citation network visualization tool that allows researchers to explore academic paper relationships through interactive network graphs. The application takes a DOI (Digital Object Identifier) as input and generates a visual network showing how papers cite each other, helping users understand research connections and influence patterns in academic literature.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using React with TypeScript, utilizing a modern component-based architecture. The UI is powered by shadcn/ui components built on top of Radix UI primitives, providing accessible and customizable interface elements. The application uses Wouter for lightweight client-side routing and TanStack Query for server state management and caching. D3.js handles the complex network visualization, creating interactive force-directed graphs that users can manipulate.

## Backend Architecture
The server follows a REST API pattern using Express.js with TypeScript. The architecture separates concerns through dedicated service layers - a PubMedService handles external API interactions with the NIH's PubMed database, while an XMLParser processes the returned scientific paper metadata. The storage layer abstracts database operations through a unified interface, making it easy to swap storage implementations.

## Data Storage
The application uses PostgreSQL as its primary database with Drizzle ORM for type-safe database operations. The schema includes two main entities: papers (storing individual research paper metadata) and citation networks (storing complete network graphs with nodes and edges). Neon Database provides the PostgreSQL hosting, and the system implements caching strategies to reduce API calls to PubMed.

## Network Generation Process
Citation networks are built by starting with a root paper (identified by DOI) and recursively discovering connected papers through citation relationships. The system fetches paper metadata from PubMed, extracts citation information, and builds a graph structure with configurable depth levels. The resulting network includes paper details, author information, publication years, and citation counts.

## Data Visualization
The network visualization uses D3.js force simulation to create interactive graphs where nodes represent papers and edges represent citation relationships. Users can adjust visualization parameters like showing labels, highlighting citation patterns, and clustering papers by publication year. The system supports drag interactions, zoom capabilities, and dynamic node selection for detailed paper information.

# External Dependencies

- **PubMed API**: NIH's E-utilities API for fetching scientific paper metadata and citation information
- **Neon Database**: Serverless PostgreSQL hosting for data persistence
- **Shadcn/ui**: Component library built on Radix UI for consistent, accessible interface elements
- **D3.js**: Data visualization library for creating interactive network graphs
- **TanStack Query**: Server state management for API calls and caching
- **Drizzle ORM**: Type-safe PostgreSQL database operations and schema management
- **Wouter**: Lightweight client-side routing for single-page application navigation