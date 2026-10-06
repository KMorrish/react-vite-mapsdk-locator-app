import type { SiteFields, SiteResult, YesNoField } from "../types";
import { attributeValue, formatAddress, isYes } from "../utils/siteFields";
import type { ReactNode } from "react";

interface Props {
  site: SiteResult;
  fields: SiteFields;
  onBack: () => void;
  onZoom: () => void;
  onDirections: () => void;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function yesItems(site: SiteResult, fields: YesNoField[]) {
  return fields.filter((field) => isYes(site.attributes[field.name]));
}

function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const date = value instanceof Date
    ? value
    : new Date(typeof value === "number" ? value : String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-AU");
}

function dateFieldValue(site: SiteResult, field?: string): string {
  return field ? formatDate(site.attributes[field]) : "";
}

export default function SiteDetail({ site, fields, onBack, onZoom, onDirections }: Props) {
  const name = attributeValue(site.attributes, fields.name) || "Unnamed site";
  const phone = attributeValue(site.attributes, fields.phone);
  const status = attributeValue(site.attributes, fields.status);
  const closed = /temp|closure|closed/i.test(status);
  const open24Hours = fields.open24Hours
    ? isYes(site.attributes[fields.open24Hours])
    : false;
  const fuels = yesItems(site, fields.yesNo.filter((field) => field.group === "fuel"));
  const services = yesItems(site, fields.yesNo.filter((field) => field.group === "service"));
  const trucks = yesItems(site, fields.yesNo.filter((field) => field.group === "truck"));
  const tradingHours = fields.hours
    .map(({ day, opening, closing }) => ({
      day,
      value: [
        attributeValue(site.attributes, opening),
        attributeValue(site.attributes, closing),
      ].filter(Boolean).join(" – "),
    }))
    .filter(({ value }) => value);

  return (
    <section className="detail-view" aria-label={`${name} details`}>
      <button className="back-button" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to results
      </button>
      <div className="detail-content">
        <div className="detail-kicker">FUEL SITE</div>
        <h2 className="detail-name">{name}</h2>
        <p className="detail-address">{formatAddress(site.attributes, fields) || "Address unavailable"}</p>
        <div className="detail-meta">
          {status && (
            <span className={`status-badge ${closed ? "is-closed" : "is-open"}`}>
              <span className="status-indicator" />
              {closed ? "Temp Closure" : "Open"}
            </span>
          )}
          {open24Hours && <span className="status-badge is-open">Open 24 hours</span>}
          <span className="detail-distance">{site.distanceKm.toFixed(1)} km away</span>
        </div>
        {phone && (
          <a className="detail-phone" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
            <span aria-hidden="true">☎</span> {phone}
          </a>
        )}
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={onDirections}>Get directions <span aria-hidden="true">↗</span></button>
          <button className="secondary-button" type="button" onClick={onZoom}>Zoom to site</button>
        </div>

        {closed && (
          <div className="closed-banner">
            <strong>Temporarily closed</strong>
            {(fields.closedFrom || fields.closedTo) && (
              <span>
                {dateFieldValue(site, fields.closedFrom)
                  ? `From ${dateFieldValue(site, fields.closedFrom)}`
                  : ""}
                {dateFieldValue(site, fields.closedFrom) && dateFieldValue(site, fields.closedTo)
                  ? " - "
                  : ""}
                {dateFieldValue(site, fields.closedTo)
                  ? `To ${dateFieldValue(site, fields.closedTo)}`
                  : ""}
              </span>
            )}
          </div>
        )}

        {tradingHours.length > 0 && (
          <DetailSection title="Trading Hours">
            <dl className="hours-list">
              {tradingHours.map(({ day, value }) => (
                <div key={day}><dt>{day}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </DetailSection>
        )}
        {fuels.length > 0 && (
          <DetailSection title="Fuel Types">
            <div className="detail-chips">{fuels.map((field) => <span className="detail-chip fuel-chip" key={field.name}>{field.label}</span>)}</div>
          </DetailSection>
        )}
        {services.length > 0 && (
          <DetailSection title="Services & Amenities">
            <div className="detail-chips">
              {services.map((field) => <span className="detail-chip" key={field.name}>{field.label}</span>)}
            </div>
          </DetailSection>
        )}
        {trucks.length > 0 && (
          <DetailSection title="Truck access">
            <div className="detail-chips">{trucks.map((field) => <span className="detail-chip" key={field.name}>{field.label}</span>)}</div>
          </DetailSection>
        )}
      </div>
    </section>
  );
}
