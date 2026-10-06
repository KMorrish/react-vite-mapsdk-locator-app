import type { SiteFields, YesNoField } from "../types";

const normalized = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const fieldName = (field: __esri.Field) =>
  `${field.name} ${field.alias ?? ""}`;

function findField(fields: __esri.Field[], candidates: string[]): string | undefined {
  const normalizedCandidates = candidates.map(normalized);
  return fields.find((field) =>
    normalizedCandidates.some((candidate) =>
      candidate === normalized(field.name) || candidate === normalized(field.alias ?? ""),
    ),
  )?.name ?? fields.find((field) =>
    normalizedCandidates.some((candidate) => normalized(fieldName(field)).includes(candidate)),
  )?.name;
}

function displayLabel(field: __esri.Field): string {
  const label = field.alias?.trim() || field.name.replace(/[_-]+/g, " ");
  return label.replace(/\s+/g, " ");
}

function classifyYesNoField(field: __esri.Field): YesNoField {
  const name = normalized(fieldName(field));
  const group = /truck|bdouble|roadtrain|vehicle|access|rigid|semi/.test(name)
    ? "truck"
    : /fuel|diesel|petrol|unleaded|premium|adblue|lpg|gasoline|ethanol|oil/.test(name)
      ? "fuel"
      : "service";

  return { name: field.name, label: displayLabel(field), group };
}

export function discoverSiteFields(
  fields: __esri.Field[],
  sample: Record<string, unknown>[],
  objectIdField: string,
): SiteFields {
  const candidates = fields
    .filter((field) => field.name !== objectIdField)
    .filter((field) => {
      let sawValue = false;
      for (const attributes of sample) {
        const value = attributes[field.name];
        if (value === null || value === undefined || value === "") continue;
        sawValue = true;
        if (!/^(yes|no)$/i.test(String(value).trim())) return false;
      }
      return sawValue;
    })
    .map(classifyYesNoField);

  const weekdays = [
    ["Monday", "mon"],
    ["Tuesday", "tue"],
    ["Wednesday", "wed"],
    ["Thursday", "thu"],
    ["Friday", "fri"],
    ["Saturday", "sat"],
    ["Sunday", "sun"],
  ] as const;

  const hours = weekdays.flatMap(([day, abbreviation]) => {
    const match = fields.find((field) => {
      const name = normalized(fieldName(field));
      const hasDay = name.includes(day.toLowerCase()) || name.includes(abbreviation);
      const hasHoursContext = /hour|trade|open|close/.test(name);
      const containsTime = sample.some((attributes) =>
        /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b|closed|24\s*hours/i.test(
          String(attributes[field.name] ?? ""),
        ),
      );
      return hasDay && (hasHoursContext || containsTime);
    });
    return match ? [{ day, field: match.name }] : [];
  });

  const status = findField(fields, ["status", "site status", "trading status"]);
  const closedFrom = fields.find((field) => {
    const name = normalized(fieldName(field));
    return /clos|temp/.test(name) && /from|start/.test(name);
  })?.name;
  const closedTo = fields.find((field) => {
    const name = normalized(fieldName(field));
    return /clos|temp/.test(name) && /to|end|until/.test(name);
  })?.name;

  return {
    name: findField(fields, ["name", "site name", "trading name"]),
    street: findField(fields, ["street", "street address", "address", "address line 1"]),
    suburb: findField(fields, ["suburb", "locality", "town"]),
    state: findField(fields, ["state", "territory"]),
    postcode: findField(fields, ["postcode", "post code", "postal code", "zip"]),
    phone: findField(fields, ["phone", "telephone", "phone number"]),
    status,
    closedFrom,
    closedTo,
    hours,
    yesNo: candidates,
    objectId: objectIdField,
  };
}

export function attributeValue(
  attributes: Record<string, unknown>,
  field?: string,
): string {
  if (!field) return "";
  const value = attributes[field];
  return value === null || value === undefined ? "" : String(value).trim();
}

export function formatAddress(
  attributes: Record<string, unknown>,
  fields: SiteFields,
): string {
  return [
    attributeValue(attributes, fields.street),
    [
      attributeValue(attributes, fields.suburb),
      attributeValue(attributes, fields.state),
      attributeValue(attributes, fields.postcode),
    ].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");
}

export function isYes(value: unknown): boolean {
  return String(value ?? "").trim().toLowerCase() === "yes";
}
