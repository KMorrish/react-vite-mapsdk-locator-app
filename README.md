# Fuel Site Locator

A responsive React + Vite fuel locator powered by the ArcGIS Maps SDK for
JavaScript and web map `cee7757ff62743b2b26013e560914faa`. Search by an
Australian address or current location, set a 5, 10, 20, or 50 km radius, and
filter nearby sites by fuel and services. Results are sorted by distance and
can be opened for site details, directions, and map zoom. Export the current
results to PDF from the results header.

## Run locally

1. Install Node.js 20 or newer.
2. Set `VITE_ARCGIS_API_KEY` in `.env.local` if your ArcGIS account requires
   an API key for the map or address geocoding.
3. Run `npm install`, then `npm run dev`.

The site layer's fields are matched to the locator's published fuel, service,
truck-access, status, address, phone, and trading-hours labels. Only known
fuel, service, and truck-access fields are shown, and Yes/No values are
displayed only when they are Yes.
