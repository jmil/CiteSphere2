import { PubMedSearchResult } from "@shared/schema";

export class XMLParser {
  parsePaperXml(xml: string): PubMedSearchResult | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      
      const article = doc.querySelector("PubmedArticle");
      if (!article) return null;

      const pmid = article.querySelector("PMID")?.textContent || "";
      const title = article.querySelector("ArticleTitle")?.textContent || "";
      
      // Extract DOI
      const articleIds = Array.from(article.querySelectorAll("ArticleId"));
      const doiElement = articleIds.find(id => id.getAttribute("IdType") === "doi");
      const doi = doiElement?.textContent || undefined;

      // Extract authors
      const authorList = article.querySelectorAll("Author");
      const authors: string[] = [];
      authorList.forEach(author => {
        const lastName = author.querySelector("LastName")?.textContent || "";
        const foreName = author.querySelector("ForeName")?.textContent || "";
        const initials = author.querySelector("Initials")?.textContent || "";
        
        if (lastName) {
          const fullName = foreName ? `${lastName}, ${foreName}` : `${lastName}, ${initials}`;
          authors.push(fullName);
        }
      });

      // Extract journal
      const journal = article.querySelector("Journal Title")?.textContent || 
                    article.querySelector("ISOAbbreviation")?.textContent || 
                    undefined;

      // Extract year
      const pubDate = article.querySelector("PubDate");
      let year: number | undefined;
      if (pubDate) {
        const yearElement = pubDate.querySelector("Year");
        if (yearElement) {
          year = parseInt(yearElement.textContent || "0", 10) || undefined;
        }
      }

      // Extract abstract
      const abstractElement = article.querySelector("Abstract AbstractText");
      const abstract = abstractElement?.textContent || undefined;

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

  extractReferences(xml: string): string[] {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      
      const references: string[] = [];
      const refElements = doc.querySelectorAll("ReferenceList Reference");
      
      refElements.forEach(ref => {
        const pmidElement = ref.querySelector("ArticleIdList ArticleId[IdType='pubmed']");
        if (pmidElement?.textContent) {
          references.push(pmidElement.textContent);
        }
      });

      return references;
    } catch (error) {
      console.error("Error extracting references:", error);
      return [];
    }
  }
}
