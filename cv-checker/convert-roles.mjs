// convert-roles.mjs
// Re-run this whenever Cruise_Hotel_CV_Reference_Data.xlsx is updated
// (e.g. after re-running the Cowork scan and exporting the Google Sheet).
//
// Usage:
//   npm install xlsx
//   node convert-roles.mjs ./Cruise_Hotel_CV_Reference_Data.xlsx ./src/data/cruise-roles.json

import * as XLSX from "xlsx";
import fs from "fs";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node convert-roles.mjs <input.xlsx> <output.json>");
  process.exit(1);
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const splitBullets = (val) => {
  if (!val) return [];
  return String(val)
    .split("\n")
    .map((p) => p.replace(/^•\s*/, "").trim())
    .filter(Boolean);
};

const splitKeywords = (val) => {
  if (!val) return [];
  return String(val)
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
};

const splitLinks = (val) => {
  if (!val) return [];
  return String(val)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
};

const workbook = XLSX.readFile(inputPath);

const roles = [];

for (const sheetName of workbook.SheetNames) {
  if (sheetName === "Raw Postings") continue;

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const data = {};
  for (const row of rows) {
    if (row[0] && row[1] !== undefined && row[1] !== null) {
      data[row[0]] = row[1];
    }
  }

  const roleName = String(data["Role"] || sheetName).trim();

  roles.push({
    slug: slugify(roleName),
    role: roleName,
    summary: String(data["Role Summary"] || "").trim(),
    experienceRequirements: splitBullets(data["Common Experience Requirements"]),
    cvExpectations: splitBullets(data["Common CV Expectations"]),
    certifications: splitBullets(data["Required Certifications"]),
    languages: String(data["Languages Required"] || "").trim(),
    keywords: splitKeywords(data["Master Keyword List"]),
    sourceCount: data["Source Count"],
    sourceLinks: splitLinks(data["Source Links"]),
  });
}

fs.writeFileSync(outputPath, JSON.stringify({ roles }, null, 2));
console.log(`Converted ${roles.length} roles -> ${outputPath}`);
