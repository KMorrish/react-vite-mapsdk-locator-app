import { useCallback, useEffect, useRef, useState } from "react";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import type MapView from "@arcgis/core/views/MapView.js";
import SearchControls from "./components/SearchControls";
import SiteDetail from "./components/SiteDetail";
import SiteFilters from "./components/SiteFilters";
import ResultsList from "./components/ResultsList";
import type { SearchPointData, SiteFields, SiteResult } from "./types";
import { attributeValue, formatAddress, isYes } from "./utils/siteFields";

const WEBMAP_ID = "cee7757ff62743b2b26013e560914faa";
const RADII_KM = [5, 10, 20, 50];

type LoadState = "loading" | "ready" | "error";

export default function App() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const layerRef = useRef<FeatureLayer | null>(null);
  const highlightRef = useRef<__esri.Handle | null>(null);
  const querySequenceRef = useRef(0);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [siteFields, setSiteFields] = useState<SiteFields | null>(null);
  const [filterFields, setFilterFields] = useState<SiteFields["yesNo"]>([]);
  const [searchPoint, setSearchPoint] = useState<SearchPointData | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [matchAny, setMatchAny] = useState(false);
  const [results, setResults] = useState<SiteResult[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let view: MapView | undefined;

    void (async () => {
      const [
        { default: WebMap },
        { default: MapView },
        { default: FeatureLayerClass },
        { default: esriConfig },
      ] = await Promise.all([
        import("@arcgis/core/WebMap.js"),
        import("@arcgis/core/views/MapView.js"),
        import("@arcgis/core/layers/FeatureLayer.js"),
        import("@arcgis/core/config.js"),
      ]);
      if (cancelled || !mapContainerRef.current) return;
      if (import.meta.env.VITE_ARCGIS_API_KEY) {
        esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;
      }

      const webmap = new WebMap({ portalItem: { id: WEBMAP_ID } });
      await webmap.load();
      if (cancelled) return;
      let layer: FeatureLayer | undefined;
      for (const candidate of webmap.allLayers) {
        if (candidate instanceof FeatureLayerClass) {
          layer = candidate;
          break;
        }
      }
      if (!layer) throw new Error("The web map does not contain a feature layer for sites.");
      await layer.load();
      if (cancelled) return;

      view = new MapView({
        container: mapContainerRef.current,
        map: webmap,
      });
      await view.when();
      if (cancelled) {
        view.destroy();
        return;
      }

      const objectIdField = layer.objectIdField;
      if (!objectIdField) throw new Error("The sites layer does not define an object ID field.");
      const discovered = (await import("./utils/siteFields")).discoverSiteFields(layer.fields, objectIdField);
      viewRef.current = view;
      layerRef.current = layer;
      setSiteFields(discovered);
      setFilterFields(discovered.yesNo.filter((field) => field.group !== "truck"));
      setMapReady(true);
      setLoadState("ready");
    })().catch((error: unknown) => {
      if (!cancelled) {
        setLoadError(error instanceof Error ? error.message : "The map could not be loaded.");
        setLoadState("error");
      }
    });

    return () => {
      cancelled = true;
      highlightRef.current?.remove();
      highlightRef.current = null;
      viewRef.current = null;
      layerRef.current = null;
      view?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!searchPoint || !siteFields) return;
    let cancelled = false;
    const sequence = ++querySequenceRef.current;
    const layer = layerRef.current;
    setSearching(true);
    setSearchError("");

    void (async () => {
      if (!layer) throw new Error("The sites layer is not ready.");
      const [{ default: Point }, geometryEngine, geodesicUtils] = await Promise.all([
        import("@arcgis/core/geometry/Point.js"),
        import("@arcgis/core/geometry/geometryEngine.js"),
        import("@arcgis/core/geometry/support/geodesicUtils.js"),
      ]);
      const point = new Point({
        x: searchPoint.x,
        y: searchPoint.y,
        spatialReference: { wkid: searchPoint.wkid },
      });
      const bufferedArea = geometryEngine.geodesicBuffer(point, radiusKm, "kilometers");
      const searchArea = Array.isArray(bufferedArea) ? bufferedArea[0] : bufferedArea;
      if (!searchArea) throw new Error("A search area could not be created for this location.");
      const query = layer.createQuery();
      query.geometry = searchArea;
      query.spatialRelationship = "intersects";
      const ids = await layer.queryObjectIds(query);
      const fetched: SiteResult[] = [];

      for (let offset = 0; offset < ids.length; offset += 200) {
        const batchQuery = layer.createQuery();
        batchQuery.objectIds = ids.slice(offset, offset + 200);
        batchQuery.outFields = ["*"];
        batchQuery.returnGeometry = true;
        batchQuery.outSpatialReference = point.spatialReference;
        const batch = await layer.queryFeatures(batchQuery);
        for (const feature of batch.features) {
          if (!feature.geometry) continue;
          const sitePoint = feature.geometry.type === "point"
            ? feature.geometry
            : feature.geometry.extent?.center;
          if (!sitePoint) continue;
          const matches = selectedFilters.map((field) =>
            isYes(feature.attributes[field]),
          );
          if (
            matches.length > 0 &&
            (matchAny ? !matches.some(Boolean) : !matches.every(Boolean))
          ) {
            continue;
          }
          const distance = geodesicUtils.geodesicDistance(
            point,
            sitePoint,
            "kilometers",
          ).distance;
          if (distance === undefined || !Number.isFinite(distance)) continue;
          const objectId = feature.attributes[siteFields.objectId];
          if (typeof objectId !== "number" && typeof objectId !== "string") continue;
          fetched.push({
            attributes: { ...feature.attributes },
            geometry: feature.geometry.toJSON(),
            objectId,
            distanceKm: distance,
          });
        }
      }

      fetched.sort((a, b) => a.distanceKm - b.distanceKm);
      if (!cancelled && sequence === querySequenceRef.current) {
        setResults(fetched);
        setSelectedSite((current) =>
          current && fetched.some((site) => site.objectId === current.objectId) ? current : null,
        );
      }
    })().catch((error: unknown) => {
      if (!cancelled && sequence === querySequenceRef.current) {
        setResults([]);
        setSearchError(error instanceof Error ? error.message : "Sites could not be searched.");
      }
    }).finally(() => {
      if (!cancelled && sequence === querySequenceRef.current) setSearching(false);
    });

    return () => {
      cancelled = true;
    };
  }, [searchPoint, siteFields, radiusKm, selectedFilters, matchAny]);

  useEffect(() => {
    const view = viewRef.current;
    const layer = layerRef.current;
    if (!view || !layer) return;
    highlightRef.current?.remove();
    highlightRef.current = null;
    if (!selectedSite) return;

    let cancelled = false;
    void view.whenLayerView(layer).then((layerView) => {
      if (cancelled) return;
      void Promise.all([
        import("@arcgis/core/Graphic.js"),
        import("@arcgis/core/geometry/support/jsonUtils.js"),
      ]).then(([{ default: Graphic }, { fromJSON }]) => {
        if (cancelled) return;
        const graphic = new Graphic({
          geometry: fromJSON(selectedSite.geometry),
          attributes: selectedSite.attributes,
        });
        highlightRef.current = layerView.highlight(graphic);
      }).catch((error: unknown) => {
        if (!cancelled) {
          setSearchError(error instanceof Error ? error.message : "The selected site could not be highlighted.");
        }
      });
    }).catch((error: unknown) => {
      if (!cancelled) {
        setSearchError(error instanceof Error ? error.message : "The selected site could not be highlighted.");
      }
    });
    return () => {
      cancelled = true;
      highlightRef.current?.remove();
      highlightRef.current = null;
    };
  }, [selectedSite, mapReady]);

  const onSearch = useCallback((point: SearchPointData) => {
    setSelectedSite(null);
    setSearchPoint(point);
    void import("@arcgis/core/geometry/Point.js").then(({ default: Point }) => {
      const view = viewRef.current;
      if (!view) return;
      return view.goTo({
        center: new Point({
          x: point.x,
          y: point.y,
          spatialReference: { wkid: point.wkid },
        }),
        zoom: 10,
      });
    }).catch((error: unknown) => {
      setSearchError(error instanceof Error ? error.message : "The map could not move to the search location.");
    });
  }, []);

  function zoomToSite(site: SiteResult) {
    const view = viewRef.current;
    if (!view) return;
    void import("@arcgis/core/geometry/support/jsonUtils.js").then(({ fromJSON }) => {
      const geometry = fromJSON(site.geometry);
      return view.goTo({ target: geometry, zoom: 15 });
    }).catch((error: unknown) => {
      setSearchError(error instanceof Error ? error.message : "The map could not zoom to this site.");
    });
  }

  function openDirections(site: SiteResult) {
    if (!siteFields) return;
    const destination = formatAddress(site.attributes, siteFields)
      || attributeValue(site.attributes, siteFields.name);
    if (!destination) {
      setSearchError("Directions are unavailable because this site has no address.");
      return;
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <div className="panel-scroll">
          <header className="app-heading">
            <div>
              <p className="eyebrow">FIND YOUR NEXT STOP</p>
              <h1>Fuel Site Locator</h1>
            </div>
          </header>
          <section className="search-card" aria-label="Search for a fuel site">
            <SearchControls view={mapReady ? viewRef.current : null} onSearch={onSearch} disabled={!mapReady} />
            <div className="radius-control">
              <label className="field-label" htmlFor="search-radius">Search within</label>
              <select
                id="search-radius"
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                disabled={!mapReady}
              >
                {RADII_KM.map((radius) => <option key={radius} value={radius}>{radius} km</option>)}
              </select>
            </div>
          </section>
          {filterFields.length > 0 && (
            <SiteFilters
              fields={filterFields}
              selected={selectedFilters}
              onChange={setSelectedFilters}
              matchAny={matchAny}
              onMatchAnyChange={setMatchAny}
            />
          )}
          {searching && <p className="status-message" role="status"><span className="status-dot" />Finding the closest sites...</p>}
          {searchError && <p className="inline-error" role="alert">{searchError}</p>}
          {siteFields && (
            selectedSite ? (
              <SiteDetail
                site={selectedSite}
                fields={siteFields}
                onBack={() => setSelectedSite(null)}
                onZoom={() => zoomToSite(selectedSite)}
                onDirections={() => openDirections(selectedSite)}
              />
            ) : (
              <ResultsList
                results={results}
                fields={siteFields}
                onSelect={setSelectedSite}
              />
            )
          )}
        </div>
      </aside>
      <section className="map-region" aria-label="Map">
        <div className="map-view" ref={mapContainerRef} />
        {loadState !== "ready" && (
          <div className="map-overlay" role={loadState === "error" ? "alert" : "status"}>
            {loadState === "loading" ? (
              <>
                <span className="loading-spinner" aria-hidden="true" />
                <span>Loading map and sites...</span>
              </>
            ) : (
              <span>Map unavailable: {loadError}</span>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
