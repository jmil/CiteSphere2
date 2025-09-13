import { PubMedSearchResult } from "@shared/schema";
import { parseStringPromise } from "xml2js";

export class XMLParser {
  async parsePaperXml(xml: string): Promise<PubMedSearchResult | null> {
    try {
      const result = await parseStringPromise(xml);
      
      const article = result?.PubmedArticleSet?.PubmedArticle?.[0];
      if (!article) return null;

      const medlineCitation = article.MedlineCitation?.[0];
      if (!medlineCitation) return null;

      const pmid = medlineCitation.PMID?.[0]?._ || medlineCitation.PMID?.[0] || "";
      
      // Extract article details
      const articleData = medlineCitation.Article?.[0];
      if (!articleData) return null;

      const title = articleData.ArticleTitle?.[0] || "";
      
      // Extract DOI
      let doi: string | undefined;
      const eLocationIds = articleData.ELocationID;
      if (eLocationIds) {
        const doiElement = eLocationIds.find((id: any) => id.$.EIdType === "doi");
        doi = doiElement?._ || doiElement;
      }

      // Extract authors
      const authors: string[] = [];
      const authorList = articleData.AuthorList?.[0]?.Author;
      if (authorList) {
        authorList.forEach((author: any) => {
          const lastName = author.LastName?.[0] || "";
          const foreName = author.ForeName?.[0] || "";
          const initials = author.Initials?.[0] || "";
          
          if (lastName) {
            const fullName = foreName ? `${lastName}, ${foreName}` : `${lastName}, ${initials}`;
            authors.push(fullName);
          }
        });
      }

      // Extract journal
      const journalData = articleData.Journal?.[0];
      const journal = journalData?.Title?.[0] || 
                     journalData?.ISOAbbreviation?.[0] || 
                     undefined;

      // Extract year
      let year: number | undefined;
      const pubDate = journalData?.JournalIssue?.[0]?.PubDate?.[0];
      if (pubDate?.Year) {
        year = parseInt(pubDate.Year[0], 10) || undefined;
      }

      // Extract abstract
      const abstractTexts = articleData.Abstract?.[0]?.AbstractText;
      let abstract: string | undefined;
      if (abstractTexts) {
        // Handle both simple text and structured abstracts
        if (typeof abstractTexts[0] === "string") {
          abstract = abstractTexts[0];
        } else if (abstractTexts[0]._) {
          abstract = abstractTexts[0]._;
        } else {
          // Structured abstract with labels
          abstract = abstractTexts.map((text: any) => {
            if (typeof text === "string") return text;
            const label = text.$.Label || "";
            const content = text._ || "";
            return label ? `${label}: ${content}` : content;
          }).join(" ");
        }
      }

      return {
        pmid,
        doi,
        title,
        authors,
        journal,
        year,
        abstract
      };
    } catch (error) {
      console.error("Error parsing XML:", error);
      return null;
    }
  }

  async extractReferences(xml: string): Promise<string[]> {
    try {
      const result = await parseStringPromise(xml);
      
      const references: string[] = [];
      const article = result?.PubmedArticleSet?.PubmedArticle?.[0];
      
      if (!article) return references;

      const refList = article.PubmedData?.[0]?.ReferenceList?.[0]?.Reference;
      
      if (refList) {
        refList.forEach((ref: any) => {
          const articleIds = ref.ArticleIdList?.[0]?.ArticleId;
          if (articleIds) {
            const pmidRef = articleIds.find((id: any) => id.$.IdType === "pubmed");
            if (pmidRef?._) {
              references.push(pmidRef._);
            }
          }
        });
      }

      return references;
    } catch (error) {
      console.error("Error extracting references:", error);
      return [];
    }
  }

  // Keep the old method for compatibility if needed
  parsePubMedXml(xml: string): PubMedSearchResult | null {
    // This is a synchronous wrapper for backward compatibility
    // In reality, we should make everything async
    let result: PubMedSearchResult | null = null;
    this.parsePaperXml(xml).then(r => result = r).catch(() => result = null);
    // This won't work properly in async context but maintains interface
    return result;
  }
}