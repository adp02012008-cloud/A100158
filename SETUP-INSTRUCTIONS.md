# Bug Slayers Team Hub setup

## Final permissions

- Public viewer: Dashboard and Leaderboard only.
- Registered group member: view and directly add Hackathons, Gallery, Projects, Certificates and Opportunities.
- Admin in Admin View: view, directly add and permanently delete records.
- No approval workflow is used.

## 1. Copy frontend files

Copy the included `src` files into the matching locations in your project. Keep your existing files that are not present in this package.

## 2. Install the Apps Script backend

1. Open the Google Sheet.
2. Select **Extensions → Apps Script**.
3. Delete the empty content in `Code.gs`.
4. Paste the complete content from `backend/Code.gs`.
5. Save.
6. Select the `setupTeamSheets` function and click **Run** once.
7. Accept the Google permissions.

The setup function adds any missing technical columns such as `OPPORTUNITY_ID`, `CREATED_BY` and `CREATED_AT`. It does not delete existing columns or rows.

## 3. Deploy the Apps Script

1. Click **Deploy → New deployment**.
2. Choose **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy and copy the URL ending in `/exec`.

Although the deployment is reachable by anyone, every private read and write request is checked using the signed-in Firebase ID token. Only emails found in `Sheet1` or the admin list can use the private endpoints.

## 4. Add the deployment URL

Open `src/utils/api.js` and replace:

```js
"PASTE_YOUR_NEW_APPS_SCRIPT_WEB_APP_URL_HERE"
```

with the new `/exec` URL.

## 5. Run the project

```bash
npm install
npm run dev
```

Log out and sign in again with Google before testing the new private pages.

## Google Drive image links

Set image files to **Anyone with the link → Viewer**. Standard Drive file links are converted to preview image links by the frontend.
