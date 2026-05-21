const FOLDER_ID = "PASTE_YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = body.files.map((file) => {
      const bytes = Utilities.base64Decode(file.data);
      const blob = Utilities.newBlob(bytes, file.type, file.name);
      const created = folder.createFile(blob);
      return {
        name: created.getName(),
        url: created.getUrl()
      };
    });

    return jsonResponse({
      success: true,
      files
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
