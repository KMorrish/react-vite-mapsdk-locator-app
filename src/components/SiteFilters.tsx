import type { YesNoField } from "../types";

interface Props {
  fields: YesNoField[];
  selected: string[];
  onChange: (selected: string[]) => void;
  matchAny: boolean;
  onMatchAnyChange: (matchAny: boolean) => void;
}

function FilterGroup({
  title,
  fields,
  selected,
  onChange,
}: {
  title: string;
  fields: YesNoField[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      {fields.map((field) => (
        <label className="checkbox-row" key={field.name}>
          <input
            type="checkbox"
            checked={selected.includes(field.name)}
            onChange={(event) => {
              onChange(
                event.target.checked
                  ? [...selected, field.name]
                  : selected.filter((name) => name !== field.name),
              );
            }}
          />
          <span>{field.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function SiteFilters({
  fields,
  selected,
  onChange,
  matchAny,
  onMatchAnyChange,
}: Props) {
  return (
    <section className="filters-section" aria-label="Site filters">
      <h2 className="section-heading">Filters</h2>
      <FilterGroup
        title="Fuel types"
        fields={fields.filter((field) => field.group === "fuel")}
        selected={selected}
        onChange={onChange}
      />
      <FilterGroup
        title="Services"
        fields={fields.filter((field) => field.group === "service")}
        selected={selected}
        onChange={onChange}
      />
      {selected.length > 0 && (
        <label className="match-toggle">
          <input
            type="checkbox"
            role="switch"
            checked={matchAny}
            onChange={(event) => onMatchAnyChange(event.target.checked)}
          />
          <span>Match any selected filter (off = match all)</span>
        </label>
      )}
      {fields.filter((field) => field.group === "truck").length > 0 && (
        <p className="truck-filter-note">Truck access is shown in each site's details.</p>
      )}
    </section>
  );
}
