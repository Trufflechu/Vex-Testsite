const FOLDER_ID = "PASTE_YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

function doGet(event) {
  try {
    if (!event.parameter || event.parameter.action !== "list") {
      return jsonResponse({
        success: true,
        files: []
      });
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = [];
    const iterator = folder.getFiles();

    while (iterator.hasNext()) {
      const file = iterator.next();
      const mimeType = file.getMimeType();
      if (!mimeType.startsWith("image/")) {
        continue;
      }

      files.push({
        id: file.getId(),
        name: file.getName(),
        note: file.getDescription(),
        url: file.getUrl(),
        thumbnailUrl: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w600",
        created: Utilities.formatDate(file.getDateCreated(), Session.getScriptTimeZone(), "MMM d, yyyy"),
        createdMs: file.getDateCreated().getTime()
      });
    }

    files.sort((a, b) => b.createdMs - a.createdMs);
    return jsonResponse({
      success: true,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        note: file.note,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        created: file.created
      }))
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message
    });
  }
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = body.files.map((file) => {
      const bytes = Utilities.base64Decode(file.data);
      const blob = Utilities.newBlob(bytes, file.type, file.name);
      const created = folder.createFile(blob);
      if (file.note) {
        created.setDescription(file.note);
      }
      created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return {
        id: created.getId(),
        name: created.getName(),
        note: created.getDescription(),
        url: created.getUrl(),
        thumbnailUrl: "https://drive.google.com/thumbnail?id=" + created.getId() + "&sz=w600"
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
