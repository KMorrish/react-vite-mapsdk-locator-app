import { useEffect, useRef, useState } from "react";
import type { SearchPointData } from "../types";

interface Props {
  view: __esri.MapView | null;
  onSearch: (point: SearchPointData) => void;
  disabled: boolean;
}

export default function SearchControls({ view, onSearch, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<__esri.widgetsSearch | null>(null);
  const callbackRef = useRef(onSearch);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    callbackRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (!view || !containerRef.current) return;
    let cancelled = false;
    let widget: __esri.widgetsSearch | undefined;

    void (async () => {
      const [{ default: Search }, { default: LocatorSearchSource }] = await Promise.all([
        import("@arcgis/core/widgets/Search.js"),
        import("@arcgis/core/widgets/Search/LocatorSearchSource.js"),
      ]);
      if (cancelled || !containerRef.current) return;
      const searchWidget = new Search({
        view,
        container: containerRef.current,
        includeDefaultSources: false,
        allPlaceholder: "Search an Australian address",
        sources: [
          new LocatorSearchSource({
            url: "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer",
            countryCode: "AU",
            name: "Australia",
            placeholder: "Search an Australian address",
            singleLineFieldName: "SingleLine",
            maxResults: 6,
            maxSuggestions: 6,
          }),
        ],
      });
      widget = searchWidget;
      searchWidget.on("select-result", (event) => {
        const point = event.result.feature.geometry;
        if (point?.type !== "point") return;
        callbackRef.current({
          x: point.x,
          y: point.y,
          wkid: point.spatialReference?.wkid ?? 4326,
        });
        setSearchError("");
      });
      widgetRef.current = searchWidget;
    })().catch((error: unknown) => {
      if (!cancelled) {
        setSearchError(error instanceof Error ? error.message : "Address search could not be loaded.");
      }
    });

    return () => {
      cancelled = true;
      widget?.destroy();
      widgetRef.current = null;
    };
  }, [view]);

  useEffect(() => {
    if (widgetRef.current) widgetRef.current.disabled = disabled;
  }, [disabled]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setSearchError("Location services are not available in this browser.");
      return;
    }
    setLocating(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        callbackRef.current({ x: coords.longitude, y: coords.latitude, wkid: 4326 });
        setLocating(false);
      },
      (error) => {
        setSearchError(error.message || "Your location could not be determined.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <section className="search-section" aria-label="Site search">
      <p className="field-label">Where are you headed?</p>
      <div className="search-widget" role="group" aria-label="Search an Australian address" ref={containerRef} />
      <button className="location-button" type="button" onClick={useMyLocation} disabled={disabled || locating}>
        <span aria-hidden="true">◎</span>
        {locating ? "Finding your location..." : "Use my current location"}
      </button>
      {searchError && <p className="inline-error" role="alert">{searchError}</p>}
    </section>
  );
}
