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
      <div className="filter-options">
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
      </div>
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
      <div className="filters-heading">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h2 className="section-heading">Refine your search</h2>
        </div>
        {selected.length > 0 && (
          <button className="clear-filters" type="button" onClick={() => onChange([])}>Clear all</button>
        )}
      </div>
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
          <span>{matchAny ? "Match any selected option" : "Match all selected options"}</span>
        </label>
      )}
      <p className="filter-hint">Choose one or more options to narrow your results.</p>
    </section>
  );
}
