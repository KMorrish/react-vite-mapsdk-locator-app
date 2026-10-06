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
  const closed = /temporarily\s*closed/i.test(attributeValue(site.attributes, fields.status));
  const fuels = yesItems(site, fields.yesNo.filter((field) => field.group === "fuel"));
  const services = yesItems(site, fields.yesNo.filter((field) => field.group === "service"));
  const trucks = yesItems(site, fields.yesNo.filter((field) => field.group === "truck"));
  const tradingHours = fields.hours
    .map(({ day, field }) => ({ day, value: attributeValue(site.attributes, field) }))
    .filter(({ value }) => value);

  return (
    <section className="detail-view" aria-label={`${name} details`}>
      <button className="back-button" type="button" onClick={onBack}>Back to results</button>
      <div className="detail-content">
        <h2 className="detail-name">{name}</h2>
        <p className="detail-address">{formatAddress(site.attributes, fields)}</p>
        {phone && <a className="detail-phone" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>}
        <div className="detail-actions">
          <button className="primary-button" type="button" onClick={onDirections}>DIRECTIONS</button>
          <button className="primary-button" type="button" onClick={onZoom}>ZOOM TO SITE</button>
        </div>

        {closed && (
          <div className="closed-banner">
            <strong>Temporarily Closed</strong>
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
            <ul>{fuels.map((field) => <li key={field.name}>{field.label}</li>)}</ul>
          </DetailSection>
        )}
        {services.length > 0 && (
          <DetailSection title="Services & Amenities">
            <ul>{services.map((field) => <li key={field.name}>{field.label}</li>)}</ul>
          </DetailSection>
        )}
        {trucks.length > 0 && (
          <DetailSection title="Truck Size">
            <ul>{trucks.map((field) => <li key={field.name}>{field.label}</li>)}</ul>
          </DetailSection>
        )}
      </div>
    </section>
  );
}
