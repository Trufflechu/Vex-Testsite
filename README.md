# Drive Photo Upload

A mobile-friendly website that uploads photos with title, team member, date/time, album, category, tags, and notes to a Google Drive folder through Google Apps Script, then filters, sorts, edits, and deletes them from a Library grid.

## Setup

1. Create a Google Drive folder for uploads.
2. Copy the folder ID from the folder URL.
3. Go to https://script.google.com and create a new project.
4. Paste the code from `google-apps-script.js`.
5. Replace `PASTE_YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE` with your folder ID.
6. Deploy it as a Web App.
7. Set access to anyone with the link.
8. Copy the Web App URL and paste it into the website.

When you change `google-apps-script.js`, go to Apps Script, replace the code, then use Deploy > Manage deployments > Edit to create a new version. Keep the same Web App URL.

The Library tab uses the same Web App URL to show a grid of image files from the Drive folder. Newly uploaded files are shared as "anyone with the link" so thumbnails can load in the website. Photo details are saved as structured data in each Drive file's description. Delete moves the file to trash in Google Drive.

## Publish

The website itself can stay on GitHub Pages. After setup, any phone or computer can open the site, choose photos, and upload them to the connected Drive folder.
