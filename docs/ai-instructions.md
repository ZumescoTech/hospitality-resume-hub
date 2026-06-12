# Resume Builder SaaS – AI Instructions

## Product Overview
This is a hospitality-focused resume builder SaaS designed for:
- Waiters
- Sommeliers
- Bartenders
- Chefs
- Front-of-house staff

The app allows users to:
- Input resume data through a multi-step form
- Preview resumes in real time
- Switch between templates
- Export resumes as PDF

---

## Tech Stack
- React (frontend)
- Tailwind CSS (styling)
- Vercel (deployment)
- Supabase (backend & auth)

---

## Architecture Rules

### 1. Component Design
- All UI must be component-based
- Components must be reusable and modular
- No large monolithic files

### 2. Folder Structure
- `/components` → UI components
- `/templates` → resume templates
- `/pages` → main views
- `/lib` → utilities and helpers

---

## Form System Rules
- Forms must use controlled inputs
- Data must be stored in structured JSON
- Support dynamic fields (add/remove entries)
- Each section must be its own component

Sections:
- Personal Details
- Professional Summary
- Experience
- Education
- Skills
- Certifications

---

## Template System Rules
- Templates must NOT be hardcoded
- Use a renderer pattern:
  - Input: JSON data
  - Output: Styled resume layout

- Each template must:
  - Support profile image
  - Have unique layout
  - Be switchable dynamically

---

## UI/UX Rules
- Clean and minimal design
- Mobile responsive
- Clear labels for all inputs
- Use cards and spacing for readability

---

## Code Quality Rules
- Keep code clean and readable
- Avoid duplication
- Use reusable hooks where needed
- Follow consistent naming conventions

---

## When Generating Code
Always:
- Explain structure briefly
- Keep components small
- Ensure responsiveness
- Avoid unnecessary complexity

---

## Goal
Build a scalable SaaS resume builder with:
- 10+ templates
- Real-time preview
- PDF export