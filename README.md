# Scientific Citation Network Visualization Tool

## Product Requirements Document (PRD)

### Executive Summary
A web-based tool that enables researchers to explore and visualize citation relationships between academic papers, helping them understand research influence patterns and discover related work.

### Implementation Phases

#### Phase 1: Data Collection & Display (Current)
**Goal**: Build robust data collection pipeline and display raw citation data.

**Features**:
- Accept DOI input and retrieve PMID
- Fetch root paper XML from PubMed
- Collect citing papers (PMIDs)
- Collect reference papers (PMIDs from XML)
- Collect related papers (PMIDs)
- Fetch XML for all discovered PMIDs
- Display as flat lists grouped by category
- Show XML excerpts for verification

**Display Format**:
```
ROOT PAPER
- PMID, Title, Authors, Year
- XML excerpt (first 500 chars)

PAPERS CITING THIS
- List of PMIDs with titles when available

REFERENCES/CITED BY THIS
- List of PMIDs with titles when available

RELATED PAPERS
- List of PMIDs with titles when available
```

#### Phase 2: Data Processing & Analysis
- Complete XML parsing for all metadata
- Build citation graph structure
- Calculate citation metrics
- Enhanced display with tables and filters

#### Phase 3: Visualization Prototype
- Interactive network visualization
- Force-directed graph layout
- Visual encodings for paper attributes

### Technical Stack
- Node.js/Express backend
- Simple HTML/CSS frontend
- PubMed API for data
- File-based caching for XML