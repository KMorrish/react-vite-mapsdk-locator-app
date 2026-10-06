import type { SiteFields, YesNoField } from "../types";

const normalized = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const FUEL_FIELDS = [
  ["unleaded_91", "Unleaded 91"],
  ["unleaded_e10", "Unleaded E10"],
  ["unleaded_95", "Unleaded 95"],
  ["premium_98", "Premium 98"],
  ["diesel", "Diesel"],
  ["premium_diesel", "Premium Diesel"],
  ["high_flow_diesel", "High Flow Diesel"],
  ["autogas", "Autogas"],
  ["adblue_at_pump", "AdBlue at pump"],
  ["adblue_by_pack", "AdBlue by pack"],
] as const;

const SERVICE_FIELDS = [
  ["atm", "ATM"],
  ["toilets", "Toilets"],
  ["showers", "Showers"],
  ["carwash", "Car wash"],
  ["retail_shop", "Shop"],
  ["takeaway_food", "Takeaway food"],
  ["restaurant", "Restaurant"],
  ["weighbridge", "Weighbridge"],
  ["truck_parking", "Truck parking"],
] as const;

const TRUCK_FIELDS = [
  ["semi_trailer_accessible", "Semi-trailer"],
  ["b_double_accessible", "B-double"],
  ["road_train_accessible", "Road train"],
] as const;

function findField(fields: __esri.Field[], candidates: string[]): string | undefined {
  const names = candidates.map(normalized);
  return fields.find((field) => names.includes(normalized(field.name)))?.name
    ?? fields.find((field) => names.includes(normalized(field.alias ?? "")))?.name;
}

function findNamedField(fields: __esri.Field[], ...candidates: string[]): string | undefined {
  return findField(fields, candidates);
}

function groupFields(
  fields: __esri.Field[],
  definitions: ReadonlyArray<readonly [string, string]>,
  group: YesNoField["group"],
): YesNoField[] {
  return definitions.flatMap(([name, label]) => {
    const actualName = findField(fields, [name]);
    return actualName ? [{ name: actualName, label, group }] : [];
  });
}

export function discoverSiteFields(
  fields: __esri.Field[],
  objectIdField: string,
): SiteFields {
  const weekdays = [
    ["Monday", "mon"],
    ["Tuesday", "tue"],
    ["Wednesday", "wed"],
    ["Thursday", "thu"],
    ["Friday", "fri"],
    ["Saturday", "sat"],
    ["Sunday", "sun"],
  ] as const;

  return {
    name: findNamedField(fields, "displayname", "display name", "site name"),
    street: findNamedField(fields, "street", "street address"),
    suburb: findNamedField(fields, "suburb"),
    state: findNamedField(fields, "state"),
    postcode: findNamedField(fields, "postcode"),
    phone: findNamedField(fields, "phone"),
    status: findNamedField(fields, "status"),
    closedFrom: findNamedField(fields, "temp_closed_from"),
    closedTo: findNamedField(fields, "temp_closed_to"),
    open24Hours: findNamedField(fields, "open_24_hours"),
    hours: weekdays.flatMap(([day, abbreviation]) => {
      const opening = findNamedField(fields, `${abbreviation}_opening`);
      const closing = findNamedField(fields, `${abbreviation}_closing`);
      return opening || closing ? [{ day, opening, closing }] : [];
    }),
    yesNo: [
      ...groupFields(fields, FUEL_FIELDS, "fuel"),
      ...groupFields(fields, SERVICE_FIELDS, "service"),
      ...groupFields(fields, TRUCK_FIELDS, "truck"),
    ],
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
