export type FieldGroup = "fuel" | "service" | "truck";

export interface YesNoField {
  name: string;
  label: string;
  group: FieldGroup;
}

export interface SiteFields {
  name?: string;
  street?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  status?: string;
  closedFrom?: string;
  closedTo?: string;
  open24Hours?: string;
  hours: Array<{ day: string; opening?: string; closing?: string }>;
  yesNo: YesNoField[];
  objectId: string;
}

export interface SiteResult {
  attributes: Record<string, unknown>;
  geometry: __esri.GeometryProperties;
  objectId: number | string;
  distanceKm: number;
}

export interface SearchPointData {
  x: number;
  y: number;
  wkid: number;
}
