const endpointInput = document.getElementById("endpointUrl");
const connectionStatus = document.getElementById("connectionStatus");
const photoInput = document.getElementById("photoInput");
const dropZone = document.getElementById("dropZone");
const queue = document.getElementById("queue");
const uploadButton = document.getElementById("uploadButton");
const clearQueue = document.getElementById("clearQueue");
const message = document.getElementById("message");
const tabs = document.querySelectorAll(".tab");
const homePanel = document.getElementById("homePanel");
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
const editorAlbum = document.getElementById("editorAlbum");
const editorCategory = document.getElementById("editorCategory");
const editorTags = document.getElementById("editorTags");
const editorDateTime = document.getElementById("editorDateTime");
const editorNotes = document.getElementById("editorNotes");
const editorDriveLink = document.getElementById("editorDriveLink");
const saveEditor = document.getElementById("saveEditor");
const deletePhoto = document.getElementById("deletePhoto");
const editorMessage = document.getElementById("editorMessage");
const menuButton = document.getElementById("menuButton");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const teamMembersInput = document.getElementById("teamMembersInput");
const searchFilter = document.getElementById("searchFilter");
const albumFilter = document.getElementById("albumFilter");
const categoryFilter = document.getElementById("categoryFilter");
const memberFilter = document.getElementById("memberFilter");
const tagFilter = document.getElementById("tagFilter");
const sortSelect = document.getElementById("sortSelect");
const clearFilters = document.getElementById("clearFilters");
const albumOptions = document.getElementById("albumOptions");
const categoryOptions = document.getElementById("categoryOptions");
const homeTitle = document.getElementById("home-title");
const homeIntro = document.getElementById("homeIntro");
const homeGallery = document.getElementById("homeGallery");
const achievementList = document.getElementById("achievementList");
const homeTitleInput = document.getElementById("homeTitleInput");
const homeIntroInput = document.getElementById("homeIntroInput");
const achievementsInput = document.getElementById("achievementsInput");
const homeAlbumInput = document.getElementById("homeAlbumInput");
const homeCategoryInput = document.getElementById("homeCategoryInput");

let selectedFiles = [];
let libraryFiles = [];
let editingFile = null;
let teamMembers = loadTeamMembers();
let homeSettings = loadHomeSettings();

endpointInput.value = localStorage.getItem("driveUploaderEndpoint") || "";
teamMembersInput.value = teamMembers.join("\n");
homeTitleInput.value = homeSettings.title;
homeIntroInput.value = homeSettings.intro;
achievementsInput.value = homeSettings.achievements.join("\n");
homeAlbumInput.value = homeSettings.album;
homeCategoryInput.value = homeSettings.category;
updateConnectionStatus();
renderTeamMemberControls();
renderQueue();
renderHome();

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchTab(tab.dataset.tab);
    closeSidebar();
  });
});

menuButton.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-open");
  updateMenuState();
});

sidebarBackdrop.addEventListener("click", () => {
  closeSidebar();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSidebar();
  }
});

endpointInput.addEventListener("input", () => {
  localStorage.setItem("driveUploaderEndpoint", endpointInput.value.trim());
  updateConnectionStatus();
});

teamMembersInput.addEventListener("input", () => {
  teamMembers = parseLineList(teamMembersInput.value);
  localStorage.setItem("driveUploaderTeamMembers", JSON.stringify(teamMembers));
  renderTeamMemberControls();
  renderQueue();
  applyLibraryView();
});

[
  searchFilter,
  albumFilter,
  categoryFilter,
  memberFilter,
  tagFilter,
  sortSelect
].forEach((control) => {
  control.addEventListener("input", () => {
    applyLibraryView();
  });
});

[
  homeTitleInput,
  homeIntroInput,
  achievementsInput,
  homeAlbumInput,
  homeCategoryInput
].forEach((control) => {
  control.addEventListener("input", () => {
    homeSettings = {
      title: homeTitleInput.value.trim() || defaultHomeSettings().title,
      intro: homeIntroInput.value.trim(),
      achievements: parseLineList(achievementsInput.value),
      album: homeAlbumInput.value.trim(),
      category: homeCategoryInput.value.trim()
    };
    localStorage.setItem("driveUploaderHomeSettings", JSON.stringify(homeSettings));
    renderHome();
  });
});

clearFilters.addEventListener("click", () => {
  searchFilter.value = "";
  albumFilter.value = "";
  categoryFilter.value = "";
  memberFilter.value = "";
  tagFilter.value = "";
  sortSelect.value = "newest";
  applyLibraryView();
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

deletePhoto.addEventListener("click", () => {
  deleteCurrentPhoto();
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
  homePanel.classList.toggle("active", tabName === "home");
  uploadPanel.classList.toggle("active", tabName === "upload");
  libraryPanel.classList.toggle("active", tabName === "library");
  settingsPanel.classList.toggle("active", tabName === "settings");

  if (tabName === "library" || tabName === "home") {
    loadLibrary();
  }
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  updateMenuState();
}

function updateMenuState() {
  const open = document.body.classList.contains("sidebar-open");
  menuButton.setAttribute("aria-expanded", String(open));
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

    libraryFiles = result.files.map(normalizeFileRecord);
    updateLibraryControls();
    applyLibraryView();
  } catch (error) {
    libraryGrid.innerHTML = "";
    setLibraryMessage(error.message || "Could not load the library. Check your Apps Script deployment.", "error");
  } finally {
    refreshLibrary.disabled = false;
  }
}

function applyLibraryView() {
  const files = sortFiles(filterFiles(libraryFiles));
  renderLibrary(files);
  renderHome();
  const total = libraryFiles.length;
  const shown = files.length;
  setLibraryMessage(total ? `${shown} of ${total} photo${total === 1 ? "" : "s"} shown.` : "No photos have been uploaded yet.", total ? "success" : "");
}

function renderHome() {
  homeTitle.textContent = homeSettings.title;
  homeIntro.textContent = homeSettings.intro || "Add an intro in Settings to describe your team, season, or project.";

  const featured = sortFiles(libraryFiles.filter((file) => {
    return (!homeSettings.album || file.album === homeSettings.album)
      && (!homeSettings.category || file.category === homeSettings.category);
  })).slice(0, 6);

  homeGallery.innerHTML = featured.length
    ? featured.map((file) => `<article class="home-photo">
        <img src="${escapeAttr(file.thumbnailUrl)}" alt="${escapeAttr(file.title || file.name)}" loading="lazy">
        <strong>${escapeHtml(file.title || file.name)}</strong>
      </article>`).join("")
    : `<div class="empty-state">Upload photos or adjust the featured album/category in Settings.</div>`;

  achievementList.innerHTML = homeSettings.achievements.length
    ? homeSettings.achievements.map((achievement) => `<article class="achievement-item">${escapeHtml(achievement)}</article>`).join("")
    : `<article class="achievement-item">Add achievements in Settings.</article>`;
}

function filterFiles(files) {
  const query = searchFilter.value.trim().toLowerCase();
  const album = albumFilter.value;
  const category = categoryFilter.value;
  const member = memberFilter.value;
  const tag = tagFilter.value;

  return files.filter((file) => {
    const haystack = [
      file.title,
      file.name,
      file.teamMember,
      file.album,
      file.category,
      file.notes,
      file.tags.join(" ")
    ].join(" ").toLowerCase();

    return (!query || haystack.includes(query))
      && (!album || file.album === album)
      && (!category || file.category === category)
      && (!member || file.teamMember === member)
      && (!tag || file.tags.includes(tag));
  });
}

function sortFiles(files) {
  return [...files].sort((a, b) => {
    if (sortSelect.value === "oldest") {
      return getSortTime(a) - getSortTime(b);
    }
    if (sortSelect.value === "title") {
      return (a.title || a.name).localeCompare(b.title || b.name);
    }
    if (sortSelect.value === "member") {
      return (a.teamMember || "").localeCompare(b.teamMember || "");
    }
    if (sortSelect.value === "album") {
      return (a.album || "").localeCompare(b.album || "");
    }
    return getSortTime(b) - getSortTime(a);
  });
}

function renderLibrary(files) {
  libraryGrid.innerHTML = files
    .map((file) => `<article class="library-card">
      <img src="${escapeAttr(file.thumbnailUrl)}" alt="${escapeAttr(file.name)}" loading="lazy">
      <div class="library-card-info">
        <strong>${escapeHtml(file.title || file.name)}</strong>
        <p>${escapeHtml(file.notes || "No notes yet.")}</p>
        <small>${escapeHtml([file.teamMember, file.album, file.category, formatDisplayDate(file.dateTime || file.created)].filter(Boolean).join(" - "))}</small>
        <div class="tag-row">${file.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
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
      teamMember: teamMembers[0] || "",
      dateTime: toDateTimeLocal(new Date()),
      album: "",
      category: "",
      tags: "",
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
            <select data-field="teamMember" data-index="${index}">
              ${teamMemberOptions(item.teamMember)}
            </select>
          </label>
          <label class="note-field">
            Date and time
            <input type="datetime-local" data-field="dateTime" data-index="${index}" value="${escapeAttr(item.dateTime)}">
          </label>
          <label class="note-field">
            Album
            <input data-field="album" data-index="${index}" value="${escapeAttr(item.album)}" list="albumOptions" placeholder="Build log">
          </label>
          <label class="note-field">
            Category
            <input data-field="category" data-index="${index}" value="${escapeAttr(item.category)}" list="categoryOptions" placeholder="Drivetrain">
          </label>
          <label class="note-field">
            Tags
            <input data-field="tags" data-index="${index}" value="${escapeAttr(item.tags)}" placeholder="prototype, wiring">
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

function updateLibraryControls() {
  const albums = uniqueValues(libraryFiles.map((file) => file.album));
  const categories = uniqueValues(libraryFiles.map((file) => file.category));
  const members = uniqueValues([...teamMembers, ...libraryFiles.map((file) => file.teamMember)]);
  const tags = uniqueValues(libraryFiles.flatMap((file) => file.tags));

  fillSelect(albumFilter, albums, "All albums");
  fillSelect(categoryFilter, categories, "All categories");
  fillSelect(memberFilter, members, "All members");
  fillSelect(tagFilter, tags, "All tags");
  fillDatalist(albumOptions, albums);
  fillDatalist(categoryOptions, categories);
}

function renderTeamMemberControls(selected = editorMember.value) {
  editorMember.innerHTML = teamMemberOptions(selected);
  updateLibraryControls();
}

function teamMemberOptions(selected = "") {
  const names = uniqueValues(teamMembers);
  const options = [`<option value="">Unassigned</option>`];
  if (selected && !names.includes(selected)) {
    names.unshift(selected);
  }
  options.push(...names.map((name) => `<option value="${escapeAttr(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`));
  return options.join("");
}

function fillSelect(select, values, allLabel) {
  const current = select.value;
  select.innerHTML = `<option value="">${allLabel}</option>${values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("")}`;
  select.value = values.includes(current) ? current : "";
}

function fillDatalist(datalist, values) {
  datalist.innerHTML = values.map((value) => `<option value="${escapeAttr(value)}"></option>`).join("");
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function parseLineList(value) {
  return uniqueValues(value.split(/\n+/));
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return uniqueValues(value);
  }
  return uniqueValues(String(value || "").split(","));
}

function normalizeFileRecord(file) {
  return {
    ...file,
    title: file.title || file.name || "Untitled photo",
    teamMember: file.teamMember || "",
    dateTime: file.dateTime || "",
    album: file.album || "",
    category: file.category || "",
    tags: parseTags(file.tags || ""),
    notes: file.notes || ""
  };
}

function loadTeamMembers() {
  try {
    const saved = JSON.parse(localStorage.getItem("driveUploaderTeamMembers") || "[]");
    return Array.isArray(saved) ? uniqueValues(saved) : [];
  } catch {
    return [];
  }
}

function defaultHomeSettings() {
  return {
    title: "2622T Tritium",
    intro: "A living gallery of our build season, events, and team milestones.",
    achievements: [
      "Add achievements in Settings",
      "Feature your best build and event photos"
    ],
    album: "",
    category: ""
  };
}

function loadHomeSettings() {
  try {
    return {
      ...defaultHomeSettings(),
      ...JSON.parse(localStorage.getItem("driveUploaderHomeSettings") || "{}")
    };
  } catch {
    return defaultHomeSettings();
  }
}

function getSortTime(file) {
  const value = file.dateTime || file.created || "";
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
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
          album: item.album.trim(),
          category: item.category.trim(),
          tags: parseTags(item.tags),
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
  renderTeamMemberControls(editingFile.teamMember || "");
  editorDateTime.value = editingFile.dateTime || "";
  editorAlbum.value = editingFile.album || "";
  editorCategory.value = editingFile.category || "";
  editorTags.value = editingFile.tags.join(", ");
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
          album: editorAlbum.value.trim(),
          category: editorCategory.value.trim(),
          tags: parseTags(editorTags.value),
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
      ...normalizeFileRecord(result.file)
    };
    libraryFiles = libraryFiles.map((file) => file.id === editingFile.id ? editingFile : file);
    updateLibraryControls();
    applyLibraryView();
    setEditorMessage("Saved.", "success");
  } catch (error) {
    setEditorMessage(error.message || "Could not save changes.", "error");
  } finally {
    saveEditor.disabled = false;
  }
}

async function deleteCurrentPhoto() {
  const endpoint = endpointInput.value.trim();
  if (!endpoint || !editingFile) {
    setEditorMessage("Open Settings and connect the Google Apps Script URL first.", "error");
    return;
  }

  if (!confirm("Delete this photo from the library? It will be moved to trash in Google Drive.")) {
    return;
  }

  deletePhoto.disabled = true;
  setEditorMessage("Deleting photo...", "");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "delete",
        id: editingFile.id
      })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Could not delete photo.");
    }

    libraryFiles = libraryFiles.filter((file) => file.id !== editingFile.id);
    editingFile = null;
    updateLibraryControls();
    applyLibraryView();
    photoDialog.close();
  } catch (error) {
    setEditorMessage(error.message || "Could not delete photo.", "error");
  } finally {
    deletePhoto.disabled = false;
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
