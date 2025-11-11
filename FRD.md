## 1. Project Overview

- **Purpose:** Digitalize branch shortage logging. Each branch supervisor completes a form (modeled on the provided Excel), submitting daily shortages, which can then be exported as PDF and shared via WhatsApp.
- **Frontend:** React.js, Tailwind CSS.
- **Backend:** Appwrite (managing users, authentication, and storage).
- **Users:** Branch supervisors only (set up in backend, no self-registration or reset).

---

## 2. User Authentication

- **Login Flow:**
  - Login is username/password only. Credentials are pre-set in Appwrite backend by admin.
  - No registration, no password reset, no password change UI.
  - Only authenticated user can view, create, and edit (draft) their own forms.
  - Logout available via UI button.
- **Permissions:**
  - All data/forms are user-specific. No admin/HQ dashboard, no shared views, no roles except basic users.

---

## 3. Form Page & Layout

### Header Section

- **اسم الفرع:** Dropdown select with fixed branch names.
- **اسم المدخل:** Text input.
- **التاريخ:** Date input (default: today).
- All fields are required except اسم المدخل (which can be auto-filled from session, if desired).

### Table Columns (Right to Left)

- **تسلسل:** Auto-number (row index, non-editable).
- **الصنف:** Text input.
- **الباركود:** Text/number input.
- **الكمية:** Number input.
- **التعبئة:** Dropdown, options: "حبة", "كرتون", "شد".
- **اسم الشركة:** Text input.
- **الشركة البديلة:** Text input.
- **ملاحظات:** (Optional) Textarea or input, not required.

#### Behavior

- Default: 30 rows, user can add/remove rows (minimum 1).
- No validation rules (all columns optional except what's required for business flow).
- All fields fully support Arabic entry, UI/UX direction is RTL.

---

## 4. Form Actions

### Save & Storage

- **Save as Draft:** User can save progress (draft) locally (Appwrite Database, keyed by user).
- **Submit/Generate PDF:** Converts current form state to downloadable PDF (jsPDF/html2pdf) with correct RTL layout.

### WhatsApp Share

- **Button:** "Send via WhatsApp"
- **Contact Picker:** Dropdown with configured WhatsApp names/numbers.
- **Behavior:** On click, try to open WhatsApp Web (or Mobile) to selected contact using the wa.me URL, and prompt user to attach or send the PDF file manually.
  - Direct file upload to WhatsApp Web is **not** universally supported programmatically for PDF, but open chat with pre-filled text and instructions is possible. The user must attach the PDF themselves due to browser restrictions.

---

## 5. Data Persistence

- **Auth:** Handled by Appwrite; users only see and manage their own data.
- **Storage:** Forms/drafts stored per-user (Appwrite collections). No HQ/admin access.
- **PDF Export:** Runs fully on client-side, no server-side rendering needed.
- **Contact List:** Editable only from backend/config (not user-editable in-app).

---

## 6. Out-of-Scope / Not Included

- No user registration or password reset flows.
- No admin roles or multi-user management dashboards.
- No analytics, notifications, or multi-recipient WhatsApp sending.
- No attachments or media uploads except optional notes field.

---

## 7. Implementation Steps

1. **Setup Appwrite Backend**

   - Configure user accounts (pre-generated credentials).
   - Add collection(s) for form data, set rules so only owner can read/write their documents.
   - Store WhatsApp contact list for the dropdown.

2. **Build Authentication UI (React/Tailwind)**

   - Simple login form (username/password).
   - Auth persistence and protected routes.

3. **Multi-Step Form UI**

   - RTL, table-like form with above-mentioned columns, editable 30+ rows.
   - Optional notes per row.
   - Branch dropdown (option list from Appwrite or hardcoded).

4. **Appwrite Integration**

   - On Save/Submit: Save form data (as draft or final) to user's Appwrite collection.

5. **PDF Generation**

   - Convert filled form and header to an RTL PDF.
   - Filename should include date and branch for clarity.

6. **WhatsApp Integration**

   - Next to PDF button: Contact dropdown, "Send via WhatsApp" opens wa.me/number link.
   - Prefill chat message with short message/instructions; user attaches PDF.

7. **UI Polish**
   - Tailwind styling, field labels in Arabic, full mobile-responsiveness.

---

## 8. Open Questions / To Confirm

- Do you want اسم المدخل to appear as the logged-in username by default or allow manual entry? allow manual entry
- Should branches, contacts, and users be editable from a control panel or only hardcoded/configured in backend? hardcoded
- Any special branding, logo, or theme requirements? just use the react.svg for now as a logo
