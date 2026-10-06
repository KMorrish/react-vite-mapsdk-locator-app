import type { SiteFields, SiteResult } from "../types";
import { attributeValue, formatAddress } from "../utils/siteFields";
import PdfExport from "./PdfExport";

interface Props {
  results: SiteResult[];
  fields: SiteFields;
  onSelect: (site: SiteResult) => void;
}

export default function ResultsList({ results, fields, onSelect }: Props) {
  return (
    <section className="results-section" aria-label="Search results">
      <header className="results-header">
        <h2>SEARCH RESULTS</h2>
        <span className="result-count">{results.length}</span>
        <PdfExport results={results} fields={fields} />
      </header>
      <div className="results-content">
        {results.length === 0 ? (
          <p className="no-results">No results found.</p>
        ) : (
          results.map((site) => {
            const name = attributeValue(site.attributes, fields.name) || "Unnamed site";
            const phone = attributeValue(site.attributes, fields.phone);
            return (
              <article
                className="site-card"
                key={site.objectId}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(site)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(site);
                  }
                }}
              >
                <span className="site-name">{name}</span>
                <span className="site-address">{formatAddress(site.attributes, fields)}</span>
                {phone && (
                  <a
                    className="site-phone"
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {phone}
                  </a>
                )}
                <span className="site-distance">{site.distanceKm.toFixed(2)} km</span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
