# Fuel Site Locator

A Vite + React prototype using the ArcGIS Maps SDK for JavaScript and the public
web map `cee7757ff62743b2b26013e560914faa`.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env.local` and add an ArcGIS API key as
   `VITE_ARCGIS_API_KEY` if your ArcGIS account requires one for geocoding.
3. Run `npm install`, then `npm run dev`.

The map and SDK modules load on demand. The first feature layer in the web map
provides the site schema. Yes/No attributes are discovered from a sample of its
features; fuel, service, and truck fields are grouped from their field names
and aliases so the app does not depend on a fixed service schema.
