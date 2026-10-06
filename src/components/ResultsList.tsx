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
        <div>
          <p className="eyebrow">NEAR YOU</p>
          <h2>Search results</h2>
        </div>
        <span className="result-count" aria-label={`${results.length} sites found`}>{results.length}</span>
        <PdfExport results={results} fields={fields} />
      </header>
      <div className="results-content">
        {results.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-mark" aria-hidden="true">⌖</span>
            <strong>No sites found yet</strong>
            <p>Search an Australian address or use your location to find nearby fuel sites.</p>
          </div>
        ) : (
          results.map((site) => {
            const name = attributeValue(site.attributes, fields.name) || "Unnamed site";
            return (
              <button
                className="site-card"
                key={site.objectId}
                onClick={() => onSelect(site)}
                type="button"
              >
                <span className="site-card-main">
                  <span className="site-name">{name}</span>
                  <span className="site-address">{formatAddress(site.attributes, fields) || "Address unavailable"}</span>
                  <span className="site-distance">{site.distanceKm.toFixed(1)} km away</span>
                </span>
                <span className="site-card-arrow" aria-hidden="true">→</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
