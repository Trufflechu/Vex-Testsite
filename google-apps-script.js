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
        ...readMetadata(file),
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
        title: file.title,
        teamMember: file.teamMember,
        dateTime: file.dateTime,
        notes: file.notes,
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
    if (body.action === "update") {
      return updateFileMetadata(body);
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = body.files.map((file) => {
      const bytes = Utilities.base64Decode(file.data);
      const blob = Utilities.newBlob(bytes, file.type, file.name);
      const created = folder.createFile(blob);
      const metadata = normalizeMetadata(file.metadata, file.name);
      created.setDescription(JSON.stringify(metadata));
      created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return {
        id: created.getId(),
        name: created.getName(),
        ...metadata,
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

function updateFileMetadata(body) {
  const file = DriveApp.getFileById(body.id);
  const metadata = normalizeMetadata(body.metadata, file.getName());
  file.setDescription(JSON.stringify(metadata));
  return jsonResponse({
    success: true,
    file: {
      id: file.getId(),
      name: file.getName(),
      ...metadata,
      url: file.getUrl(),
      thumbnailUrl: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w600"
    }
  });
}

function readMetadata(file) {
  const description = file.getDescription();
  if (!description) {
    return normalizeMetadata({}, file.getName());
  }

  try {
    return normalizeMetadata(JSON.parse(description), file.getName());
  } catch (error) {
    return normalizeMetadata({
      notes: description
    }, file.getName());
  }
}

function normalizeMetadata(metadata, fallbackName) {
  const safe = metadata || {};
  return {
    title: safe.title || fallbackName,
    teamMember: safe.teamMember || "",
    dateTime: safe.dateTime || "",
    notes: safe.notes || safe.note || ""
  };
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
