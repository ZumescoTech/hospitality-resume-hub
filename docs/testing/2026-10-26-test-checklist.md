# Test checklist: changes from 22 to 26 October

Deploy first (`npm run deploy`), then test on the live site. Tick each box as you go.
You'll need one real CV file, one non-CV file (e.g. a cover letter or invoice), and one job ad to paste.

## 1. CV checker (`/tools/cruise-cv-checker`)

- [ ] Upload a **cover letter or invoice** → no score; you see a reason plus **Start a CV from scratch** and **Try again with a different file**.
- [ ] Upload a **real CV** → you get a score.
- [ ] The score ring says **CV readiness** (not "ATS Score").
- [ ] Under the score: "…not a cruise line's official ATS score or a prediction of being hired."
- [ ] In the keyword results: "Not mentioned isn't the same as not having it…"

## 2. Import CV (`/builder`)

- [ ] Click **Import CV** and pick your CV → the form fills in, with no red error.

## 3. Download PDF

- [ ] Click **Download PDF** → the print window opens.
- [ ] Choose **Save as PDF** → the file looks the same as the preview.
- [ ] The PDF has **only the CV**, with no buttons, menus or form fields.
- [ ] Try **2 or 3 other templates** → each PDF matches its preview.
- [ ] Move your photo position → the PDF shows the photo in the new position.
- [ ] The printer icon is **gone** from the preview toolbar.

## 4. Customize button

- [ ] Desktop: **Customize** is the first button at the top of the preview → it opens the style panel.
- [ ] Phone: tap **Preview** → **Customize** is at the top right.

## 5. Customise CV to this job

- [ ] With **Target job ad** empty → the green button is greyed out.
- [ ] Paste a job ad → the button turns **green**.
- [ ] Click it → a **review window** opens showing **Now** vs **Suggested**.
- [ ] Job titles, employers and dates are **unchanged** in the suggestion.
- [ ] Click **Keep my original** → your CV doesn't change.
- [ ] Click the button again, tick one skill, then **Apply changes** → the CV updates and only that skill is added.
- [ ] Any `[X]` shows where you need to type a real number.
- [ ] Click **Undo** in the message → your original text comes back.

## 6. Hospitality section

- [ ] On a new, empty CV, open **Hospitality** → wine and spirits show **Not stated** (not "None").

## 7. Logs page (`/tools/logs`)

- [ ] The page opens and shows entries.
- [ ] After importing a CV: an `[ai-router] groq ok` line appears (allow about a minute).
- [ ] After moving the photo: **no** `Buffer is not defined` lines.

## If something fails

Note which box failed and what you saw. Then check `/tools/logs` for red **ERROR** lines at that time and paste them in.
