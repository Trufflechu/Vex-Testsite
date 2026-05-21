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
const libraryGrid = document.getElementById("libraryGrid");
const libraryMessage = document.getElementById("libraryMessage");
const refreshLibrary = document.getElementById("refreshLibrary");

let selectedFiles = [];

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

uploadButton.addEventListener("click", async () => {
  const endpoint = endpointInput.value.trim();
  if (!endpoint) {
    setMessage("Paste your Google Apps Script web app URL first.", "error");
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

  if (tabName === "library") {
    loadLibrary();
  }
}

async function loadLibrary() {
  const endpoint = endpointInput.value.trim();
  if (!endpoint) {
    setLibraryMessage("Paste your Google Apps Script web app URL first.", "error");
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

    renderLibrary(result.files);
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
        <strong>${escapeHtml(file.name)}</strong>
        <small>${escapeHtml(file.created || "")}</small>
      </div>
      <a href="${escapeAttr(file.url)}" target="_blank" rel="noopener">Open</a>
    </article>`)
    .join("");
}

function addFiles(fileList) {
  const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
  selectedFiles = [...selectedFiles, ...imageFiles];
  renderQueue();
  setMessage(imageFiles.length ? "" : "Only image files can be added.", imageFiles.length ? "" : "error");
}

function renderQueue() {
  uploadButton.disabled = selectedFiles.length === 0;
  queue.innerHTML = selectedFiles
    .map((file, index) => {
      const url = URL.createObjectURL(file);
      return `<article class="photo-row">
        <img src="${url}" alt="">
        <div>
          <strong>${escapeHtml(file.name)}</strong>
          <small>${formatBytes(file.size)}</small>
        </div>
        <button class="remove-button" type="button" data-remove="${index}">Remove</button>
      </article>`;
    })
    .join("");

  queue.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedFiles.splice(Number(button.dataset.remove), 1);
      renderQueue();
    });
  });
}

function updateConnectionStatus() {
  const connected = endpointInput.value.trim().startsWith("https://script.google.com/");
  connectionStatus.textContent = connected ? "Connected" : "Not connected";
  connectionStatus.classList.toggle("connected", connected);
}

function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result);
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: result.slice(result.indexOf(",") + 1)
      });
    });
    reader.addEventListener("error", () => reject(new Error(`Could not read ${file.name}.`)));
    reader.readAsDataURL(file);
  });
}

function setMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
}

function setLibraryMessage(text, type) {
  libraryMessage.textContent = text;
  libraryMessage.className = `message ${type}`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
