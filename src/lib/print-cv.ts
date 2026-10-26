// print-cv.ts
// PDF export = the browser's print dialog ("Save as PDF") over the hidden
// full-size copy of the preview rendered by <PrintableCv>. Print CSS in
// styles.css hides everything else, so the PDF matches the preview exactly.

/** Default PDF file name: Chrome and Edge use document.title. */
export function cvFileTitle(fullName?: string): string {
  const base = (fullName ?? "").trim().replace(/\s+/g, "_") || "resume";
  return `${base}_CV`;
}

export function printCv(fullName?: string): void {
  const previousTitle = document.title;
  document.title = cvFileTitle(fullName);
  const restore = () => {
    document.title = previousTitle;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
