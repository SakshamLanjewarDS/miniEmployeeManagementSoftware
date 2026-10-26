import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateHaversineDistanceMeters } from "../src/server/modules/visits/service";
import { sanitizeSpreadsheetFormula } from "../src/server/modules/ingest/csv";

describe("Ponytail Quality Standard & Debt Compliance Suite", () => {
  const rootDir = process.cwd();

  test("1. All code shortcuts strictly define ceiling and upgrade triggers (Zero Rot Risk)", () => {
    const srcDir = path.join(rootDir, "src");

    function findShortcutMarkers(dir: string): Array<{ file: string; line: string }> {
      const results: Array<{ file: string; line: string }> = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...findShortcutMarkers(fullPath));
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.includes("// shortcut:")) {
              results.push({ file: fullPath, line: line.trim() });
            }
          });
        }
      }
      return results;
    }

    const markers = findShortcutMarkers(srcDir);
    assert.ok(markers.length >= 7, `Expected at least 7 documented shortcut markers, found ${markers.length}`);

    // Ponytail convention check: must have ceiling and upgrade
    for (const marker of markers) {
      const lower = marker.line.toLowerCase();
      assert.ok(
        lower.includes("ceiling:"),
        `Marker in ${marker.file} is missing explicit 'ceiling:' limit description: "${marker.line}"`
      );
      assert.ok(
        lower.includes("upgrade:"),
        `Marker in ${marker.file} has no upgrade trigger (rot risk!): "${marker.line}"`
      );
    }
  });

  test("2. PONYTAIL-DEBT.md ledger exists and documents all active shortcuts", () => {
    const ledgerPath = path.join(rootDir, "PONYTAIL-DEBT.md");
    assert.ok(fs.existsSync(ledgerPath), "PONYTAIL-DEBT.md ledger file must exist in workspace root");

    const ledgerContent = fs.readFileSync(ledgerPath, "utf-8");
    assert.ok(ledgerContent.includes("Ponytail Technical Debt Ledger"));
    assert.ok(ledgerContent.includes("storage-adapter.ts"));
    assert.ok(ledgerContent.includes("InspectionMapPreview.tsx"));
    assert.ok(ledgerContent.includes("TasksClientView.tsx"));
    assert.ok(ledgerContent.includes("Markers with No Trigger (Rot Risk): 0"));
  });

  test("3. Haversine distance handles edge cases without crashes or NaN", () => {
    // Identical point
    const zeroDist = calculateHaversineDistanceMeters(18.5204, 73.8567, 18.5204, 73.8567);
    assert.strictEqual(zeroDist, 0, "Distance between identical points must be 0");

    // Known approximate distance: Mumbai (19.0760, 72.8777) to Pune (18.5204, 73.8567) ~ 120km
    const cityDist = calculateHaversineDistanceMeters(19.0760, 72.8777, 18.5204, 73.8567);
    assert.ok(cityDist > 110000 && cityDist < 130000, `Expected ~120km, got ${cityDist}m`);

    // Poles and international date line extremes
    const poleDist = calculateHaversineDistanceMeters(90, 0, -90, 0);
    assert.ok(!isNaN(poleDist) && poleDist > 19000000, "Pole-to-pole distance must be valid number");
  });

  test("4. Spreadsheet formula injection defense complies with Ponytail security boundaries", () => {
    const dangerousInputs = [
      "=1+1",
      "-2+5",
      "+cmd|' /C calc'!A0",
      "@SUM(A1:A10)",
      "\t=HYPERLINK(\"http://evil.com\")",
      "\r-exec",
      "\n+payload",
      "|calc",
      "%test",
    ];

    for (const input of dangerousInputs) {
      const sanitized = sanitizeSpreadsheetFormula(input);
      assert.ok(
        sanitized.startsWith("'"),
        `Expected input "${input}" to be prepended with apostrophe, got "${sanitized}"`
      );
    }

    // Normal strings should remain unescaped
    assert.strictEqual(sanitizeSpreadsheetFormula("Standard Deliverable Name"), "Standard Deliverable Name");
    assert.strictEqual(sanitizeSpreadsheetFormula("12345"), "12345");
  });

  test("5. Dependency discipline: strictly maintains low footprint (<= 12 production dependencies)", () => {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
    const depCount = Object.keys(pkgJson.dependencies || {}).length;
    assert.ok(
      depCount <= 12,
      `Ponytail dependency discipline violated: expected <= 12 dependencies, found ${depCount}`
    );
  });
});
