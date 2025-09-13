const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static('public'));

const CACHE_DIR = './pubmed_cache';

async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

async function doiToPmid(doi) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi)}&retmode=json`;
  const response = await axios.get(url);
  const data = response.data;
  
  if (data.esearchresult && data.esearchresult.idlist && data.esearchresult.idlist.length > 0) {
    return data.esearchresult.idlist[0];
  }
  throw new Error('PMID not found for DOI');
}

async function fetchPubMedXML(pmid) {
  const cacheFile = path.join(CACHE_DIR, `${pmid}.xml`);
  
  try {
    const cached = await fs.readFile(cacheFile, 'utf-8');
    console.log(`Using cached XML for PMID ${pmid}`);
    return cached;
  } catch {
    console.log(`Fetching XML for PMID ${pmid} from PubMed`);
  }
  
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
  const response = await axios.get(url);
  const xml = response.data;
  
  await ensureCacheDir();
  await fs.writeFile(cacheFile, xml);
  
  return xml;
}

async function getCitingPapers(pmid) {
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?dbfrom=pubmed&db=pubmed&id=${pmid}&linkname=pubmed_pubmed_citedin&retmode=json`;
    const response = await axios.get(url);
    const data = response.data;
    
    const pmids = [];
    if (data.linksets && data.linksets[0] && data.linksets[0].linksetdbs) {
      for (const linkset of data.linksets[0].linksetdbs) {
        if (linkset.links) {
          pmids.push(...linkset.links);
        }
      }
    }
    return pmids;
  } catch (error) {
    console.error('Error fetching citing papers:', error.message);
    return []; // Return empty array on error
  }
}

async function getRelatedPapers(pmid) {
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?dbfrom=pubmed&db=pubmed&id=${pmid}&linkname=pubmed_pubmed&retmode=json`;
    const response = await axios.get(url);
    const data = response.data;
    
    const pmids = [];
    if (data.linksets && data.linksets[0] && data.linksets[0].linksetdbs) {
      for (const linkset of data.linksets[0].linksetdbs) {
        if (linkset.links) {
          pmids.push(...linkset.links.slice(0, 10)); // Limit to 10 related papers
        }
      }
    }
    return pmids;
  } catch (error) {
    console.error('Error fetching related papers:', error.message);
    return []; // Return empty array on error
  }
}

async function extractReferencesFromXML(xml) {
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);
  const references = [];
  
  try {
    const article = result.PubmedArticleSet?.PubmedArticle?.[0]?.MedlineCitation?.[0]?.Article?.[0];
    if (article?.ReferenceList?.[0]?.Reference) {
      for (const ref of article.ReferenceList[0].Reference) {
        if (ref.ArticleIdList?.[0]?.ArticleId) {
          for (const id of ref.ArticleIdList[0].ArticleId) {
            if (id.$.IdType === 'pubmed') {
              references.push(id._);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error extracting references:', e);
  }
  
  return references;
}

async function extractBasicInfoFromXML(xml) {
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xml);
  
  try {
    const article = result.PubmedArticleSet?.PubmedArticle?.[0]?.MedlineCitation?.[0]?.Article?.[0];
    const title = article?.ArticleTitle?.[0] || 'Unknown Title';
    const year = article?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0] || 'Unknown Year';
    
    const authors = [];
    if (article?.AuthorList?.[0]?.Author) {
      for (const author of article.AuthorList[0].Author.slice(0, 3)) {
        const lastName = author.LastName?.[0] || '';
        const initials = author.Initials?.[0] || '';
        if (lastName) {
          authors.push(`${lastName} ${initials}`);
        }
      }
    }
    
    return {
      title,
      year,
      authors: authors.join(', ') || 'Unknown Authors',
      xmlExcerpt: xml.substring(0, 500)
    };
  } catch (e) {
    console.error('Error extracting info from XML:', e);
    return {
      title: 'Error parsing XML',
      year: 'Unknown',
      authors: 'Unknown',
      xmlExcerpt: xml.substring(0, 500)
    };
  }
}

async function fetchPaperInfo(pmids) {
  const papers = [];
  for (const pmid of pmids.slice(0, 5)) { // Limit to 5 papers for performance
    try {
      const xml = await fetchPubMedXML(pmid);
      const info = await extractBasicInfoFromXML(xml);
      papers.push({
        pmid,
        ...info
      });
    } catch (e) {
      papers.push({
        pmid,
        title: 'Failed to fetch',
        year: 'Unknown',
        authors: 'Unknown',
        xmlExcerpt: ''
      });
    }
  }
  return papers;
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { doi } = req.body;
    
    if (!doi) {
      return res.status(400).json({ error: 'DOI is required' });
    }
    
    // Step 1: Convert DOI to PMID
    const pmid = await doiToPmid(doi);
    
    // Step 2: Fetch root paper XML
    const rootXml = await fetchPubMedXML(pmid);
    const rootInfo = await extractBasicInfoFromXML(rootXml);
    
    // Step 3: Get citing papers
    const citingPmids = await getCitingPapers(pmid);
    
    // Step 4: Get references from XML
    const referencePmids = await extractReferencesFromXML(rootXml);
    
    // Step 5: Get related papers
    const relatedPmids = await getRelatedPapers(pmid);
    
    // Step 6: Fetch info for a sample of papers
    const citingPapers = await fetchPaperInfo(citingPmids);
    const referencePapers = await fetchPaperInfo(referencePmids);
    const relatedPapers = await fetchPaperInfo(relatedPmids);
    
    res.json({
      rootPaper: {
        pmid,
        ...rootInfo
      },
      citingPapers: {
        total: citingPmids.length,
        papers: citingPapers
      },
      referencePapers: {
        total: referencePmids.length,
        papers: referencePapers
      },
      relatedPapers: {
        total: relatedPmids.length,
        papers: relatedPapers
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});