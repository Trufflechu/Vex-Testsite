const endpointInput = document.getElementById("endpointUrl");
const connectionStatus = document.getElementById("connectionStatus");
const photoInput = document.getElementById("photoInput");
const dropZone = document.getElementById("dropZone");
const queue = document.getElementById("queue");
const uploadButton = document.getElementById("uploadButton");
const clearQueue = document.getElementById("clearQueue");
const message = document.getElementById("message");
const tabs = document.querySelectorAll(".tab");
const uploadPanel = document.getElementById("uploadPanel");
const libraryPanel = document.getElementById("libraryPanel");
const settingsPanel = document.getElementById("settingsPanel");
const libraryGrid = document.getElementById("libraryGrid");
const libraryMessage = document.getElementById("libraryMessage");
const refreshLibrary = document.getElementById("refreshLibrary");
const photoDialog = document.getElementById("photoDialog");
const closeEditor = document.getElementById("closeEditor");
const editorImage = document.getElementById("editorImage");
const editorTitle = document.getElementById("editorTitle");
const editorMember = document.getElementById("editorMember");
const editorDateTime = document.getElementById("editorDateTime");
const editorNotes = document.getElementById("editorNotes");
const editorDriveLink = document.getElementById("editorDriveLink");
const saveEditor = document.getElementById("saveEditor");
const editorMessage = document.getElementById("editorMessage");

let selectedFiles = [];
let libraryFiles = [];
let editingFile = null;

endpointInput.value = localStorage.getItem("driveUploaderEndpoint") || "";
updateConnectionStatus();
renderQueue();

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchTab(tab.dataset.tab);
  });
});

endpointInput.addEventListener("input", () => {
  localStorage.setItem("driveUploaderEndpoint", endpointInput.value.trim());
  updateConnectionStatus();
});

photoInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = "";
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});

clearQueue.addEventListener("click", () => {
  selectedFiles = [];
  renderQueue();
  setMessage("", "");
});

refreshLibrary.addEventListener("click", () => {
  loadLibrary();
});

closeEditor.addEventListener("click", () => {
  photoDialog.close();
});

saveEditor.addEventListener("click", () => {
  savePhotoDetails();
});

uploadButton.addEventListener("click", async () => {
  const endpoint = endpointInput.value.trim();
  if (!endpoint) {
    setMessage("Open Settings and connect the Google Apps Script URL first.", "error");
    return;
  }

  if (!selectedFiles.length) {
    setMessage("Choose at least one photo to upload.", "error");
    return;
  }

  uploadButton.disabled = true;
  setMessage(`Uploading ${selectedFiles.length} photo${selectedFiles.length === 1 ? "" : "s"}...`, "");

  try {
    const files = await Promise.all(selectedFiles.map(fileToPayload));
    const response = await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ files })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Upload failed.");
    }

    selectedFiles = [];
    renderQueue();
    setMessage(`Uploaded ${result.files.length} photo${result.files.length === 1 ? "" : "s"} to Google Drive.`, "success");
    loadLibrary();
  } catch (error) {
    setMessage(error.message || "The upload failed. Check your Apps Script URL and permissions.", "error");
  } finally {
    uploadButton.disabled = false;
  }
});

function switchTab(tabName) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  uploadPanel.classList.toggle("active", tabName === "upload");
  libraryPanel.classList.toggle("active", tabName === "library");
  settingsPanel.classList.toggle("active", tabName === "settings");

  if (tabName === "library") {
    loadLibrary();
  }
}

async function loadLibrary() {
  const endpoint = endpointInput.value.trim();
  if (!endpoint) {
    setLibraryMessage("Open Settings and connect the Google Apps Script URL first.", "error");
    libraryGrid.innerHTML = "";
    return;
  }

  refreshLibrary.disabled = true;
  setLibraryMessage("Loading photos...", "");

  try {
    const url = new URL(endpoint);
    url.searchParams.set("action", "list");
    const response = await fetch(url.toString(), {
      method: "GET",
      mode: "cors"
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Could not load the photo library.");
    }

    libraryFiles = result.files;
    renderLibrary(libraryFiles);
    setLibraryMessage(result.files.length ? `${result.files.length} photo${result.files.length === 1 ? "" : "s"} in the library.` : "No photos have been uploaded yet.", result.files.length ? "success" : "");
  } catch (error) {
    libraryGrid.innerHTML = "";
    setLibraryMessage(error.message || "Could not load the library. Check your Apps Script deployment.", "error");
  } finally {
    refreshLibrary.disabled = false;
  }
}

function renderLibrary(files) {
  libraryGrid.innerHTML = files
    .map((file) => `<article class="library-card">
      <img src="${escapeAttr(file.thumbnailUrl)}" alt="${escapeAttr(file.name)}" loading="lazy">
      <div class="library-card-info">
        <strong>${escapeHtml(file.title || file.name)}</strong>
        <p>${escapeHtml(file.notes || "No notes yet.")}</p>
        <small>${escapeHtml([file.teamMember, formatDisplayDate(file.dateTime || file.created)].filter(Boolean).join(" - "))}</small>
      </div>
      <button class="card-button" type="button" data-edit="${escapeAttr(file.id)}">Open</button>
    </article>`)
    .join("");

  libraryGrid.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      openEditor(button.dataset.edit);
    });
  });
}

function addFiles(fileList) {
  const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  selectedFiles = [
    ...selectedFiles,
    ...imageFiles.map((file) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      teamMember: "",
      dateTime: toDateTimeLocal(new Date()),
      notes: ""
    }))
  ];
  renderQueue();
  setMessage(imageFiles.length ? "" : "Only image files can be added.", imageFiles.length ? "" : "error");
}

function renderQueue() {
  uploadButton.disabled = selectedFiles.length === 0;
  queue.innerHTML = selectedFiles
    .map((item, index) => {
      const url = URL.createObjectURL(item.file);
      return `<article class="photo-row">
        <img src="${url}" alt="">
        <div>
          <strong>${escapeHtml(item.file.name)}</strong>
          <small>${formatBytes(item.file.size)}</small>
        </div>
        <button class="remove-button" type="button" data-remove="${index}">Remove</button>
        <div class="metadata-grid">
          <label class="note-field">
            Photo title
            <input data-field="title" data-index="${index}" value="${escapeAttr(item.title)}" placeholder="Photo title">
          </label>
          <label class="note-field">
            Team member
            <input data-field="teamMember" data-index="${index}" value="${escapeAttr(item.teamMember)}" placeholder="Name">
          </label>
          <label class="note-field">
            Date and time
            <input type="datetime-local" data-field="dateTime" data-index="${index}" value="${escapeAttr(item.dateTime)}">
          </label>
        </div>
        <label class="note-field">
          Notes
          <textarea data-field="notes" data-index="${index}" placeholder="Write notes for this photo">${escapeHtml(item.notes)}</textarea>
        </label>
      </article>`;
    })
    .join("");

  queue.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedFiles.splice(Number(button.dataset.remove), 1);
      renderQueue();
    });
  });

  queue.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      selectedFiles[Number(input.dataset.index)][input.dataset.field] = input.value;
    });
  });
}

function updateConnectionStatus() {
  const connected = endpointInput.value.trim().startsWith("https://script.google.com/");
  connectionStatus.textContent = connected ? "Connected" : "Not connected";
  connectionStatus.classList.toggle("connected", connected);
}

function fileToPayload(item) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result);
      resolve({
        name: item.file.name,
        type: item.file.type || "application/octet-stream",
        data: result.slice(result.indexOf(",") + 1),
        metadata: {
          title: item.title.trim(),
          teamMember: item.teamMember.trim(),
          dateTime: item.dateTime,
          notes: item.notes.trim()
        }
      });
    });
    reader.addEventListener("error", () => reject(new Error(`Could not read ${item.file.name}.`)));
    reader.readAsDataURL(item.file);
  });
}

function openEditor(fileId) {
  editingFile = libraryFiles.find((file) => file.id === fileId);
  if (!editingFile) {
    return;
  }

  editorImage.src = editingFile.thumbnailUrl;
  editorImage.alt = editingFile.title || editingFile.name;
  editorTitle.value = editingFile.title || editingFile.name;
  editorMember.value = editingFile.teamMember || "";
  editorDateTime.value = editingFile.dateTime || "";
  editorNotes.value = editingFile.notes || "";
  editorDriveLink.href = editingFile.url;
  setEditorMessage("", "");
  photoDialog.showModal();
}

async function savePhotoDetails() {
  const endpoint = endpointInput.value.trim();
  if (!endpoint || !editingFile) {
    setEditorMessage("Open Settings and connect the Google Apps Script URL first.", "error");
    return;
  }

  saveEditor.disabled = true;
  setEditorMessage("Saving changes...", "");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "update",
        id: editingFile.id,
        metadata: {
          title: editorTitle.value.trim(),
          teamMember: editorMember.value.trim(),
          dateTime: editorDateTime.value,
          notes: editorNotes.value.trim()
        }
      })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Could not save changes.");
    }

    editingFile = {
      ...editingFile,
      ...result.file
    };
    libraryFiles = libraryFiles.map((file) => file.id === editingFile.id ? editingFile : file);
    renderLibrary(libraryFiles);
    setEditorMessage("Saved.", "success");
  } catch (error) {
    setEditorMessage(error.message || "Could not save changes.", "error");
  } finally {
    saveEditor.disabled = false;
  }
}

function setMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

function setLibraryMessage(text, type) {
  libraryMessage.textContent = text;
  libraryMessage.className = `message ${type}`;
}

function setEditorMessage(text, type) {
  editorMessage.textContent = text;
  editorMessage.className = `message ${type}`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDateTimeLocal(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  if (!value.includes("T")) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
