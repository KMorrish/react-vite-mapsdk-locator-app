import { useState } from "react";
import type { SiteFields, SiteResult } from "../types";
import { attributeValue, formatAddress } from "../utils/siteFields";

interface Props {
  results: SiteResult[];
  fields: SiteFields;
}

export default function PdfExport({ results, fields }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function exportPdf() {
    setExporting(true);
    setError("");
    try {
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const document = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      document.setFont("helvetica", "bold");
      document.setFontSize(17);
      document.text("Fuel Site Search Results", 14, 18);
      document.setFont("helvetica", "normal");
      document.setFontSize(10);
      document.text(`Sites: ${results.length}`, 14, 25);

      autoTable(document, {
        startY: 31,
        head: [["Name", "Address", "Phone", "Distance (km)"]],
        body: results.map((site) => [
          attributeValue(site.attributes, fields.name),
          formatAddress(site.attributes, fields),
          attributeValue(site.attributes, fields.phone),
          site.distanceKm.toFixed(2),
        ]),
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
        headStyles: { fillColor: [64, 64, 64] },
        columnStyles: {
          0: { cellWidth: 39 },
          1: { cellWidth: 74 },
          2: { cellWidth: 33 },
          3: { cellWidth: 27 },
        },
        margin: { left: 14, right: 14, bottom: 20 },
      });

      const pageCount = document.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        document.setPage(page);
        document.setFont("helvetica", "normal");
        document.setFontSize(8);
        document.text(
          `Information valid as of ${new Date().toLocaleDateString("en-AU")}`,
          14,
          document.internal.pageSize.getHeight() - 10,
        );
      }
      document.save("fuel-site-search-results.pdf");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The PDF could not be exported.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {error && <span className="pdf-error" role="alert">{error}</span>}
      <button
        className="pdf-button"
        type="button"
        onClick={() => void exportPdf()}
        disabled={exporting}
        aria-label="Export search results to PDF"
      >
        {exporting ? "..." : "PDF"}
      </button>
    </>
  );
}
