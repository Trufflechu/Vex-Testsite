const starterData = {
  teamName: "Team 1234A",
  eventName: "Regional Qualifier",
  scouting: [
    { match: "Q1", partner: "81208B", auton: 18, driver: 72, result: "Win", notes: "Fast left-side cycle" },
    { match: "Q2", partner: "4478C", auton: 6, driver: 58, result: "Loss", notes: "Chain slipped late" },
    { match: "Q3", partner: "91A", auton: 22, driver: 80, result: "Win", notes: "Good defense response" }
  ],
  inventory: [
    { name: "36T gears", qty: 14, target: 10 },
    { name: "Omni wheels", qty: 6, target: 8 },
    { name: "Smart motors", qty: 10, target: 8 },
    { name: "Shaft collars", qty: 24, target: 18 },
    { name: "2x beams", qty: 7, target: 10 },
    { name: "Battery packs", qty: 5, target: 4 }
  ],
  notes: [
    { title: "Intake revision", date: "2026-05-21", text: "Raised roller spacing by 4 mm. Test again with worn game elements." },
    { title: "Drive tuning", date: "2026-05-21", text: "Lowered turn acceleration. Drivers reported smoother alignment." }
  ],
  tasks: [
    { text: "Replace left front wheel spacer", done: false },
    { text: "Print skills route checklist", done: true },
    { text: "Retest autonomous after intake change", done: false }
  ],
  path: [
    { row: 10, col: 2 },
    { row: 8, col: 4 },
    { row: 6, col: 5 },
    { row: 4, col: 8 }
  ]
};

let data = loadData();

const views = {
  dashboard: "Dashboard",
  scouting: "Scouting",
  inventory: "Parts Inventory",
  notebook: "Build Notebook",
  auton: "Autonomous Planner"
};

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.getElementById("teamName").addEventListener("input", (event) => {
  data.teamName = event.target.value;
  saveData();
});

document.getElementById("eventName").addEventListener("input", (event) => {
  data.eventName = event.target.value;
  saveData();
});

document.getElementById("newScoutRow").addEventListener("click", () => {
  data.scouting.push({ match: `Q${data.scouting.length + 1}`, partner: "", auton: 0, driver: 0, result: "Win", notes: "" });
  saveAndRender();
});

document.getElementById("addMatch").addEventListener("click", () => {
  data.scouting.push({ match: `Q${data.scouting.length + 1}`, partner: "TBD", auton: 0, driver: 0, result: "Win", notes: "Add strategy notes" });
  saveAndRender();
});

document.getElementById("addPart").addEventListener("click", () => {
  data.inventory.push({ name: "New part", qty: 1, target: 4 });
  saveAndRender();
});

document.getElementById("addNote").addEventListener("click", () => {
  data.notes.unshift({ title: "New build note", date: new Date().toISOString().slice(0, 10), text: "" });
  saveAndRender();
});

document.getElementById("addTask").addEventListener("click", () => {
  data.tasks.unshift({ text: "New task", done: false });
  saveAndRender();
});

document.getElementById("clearPath").addEventListener("click", () => {
  data.path = [];
  saveAndRender();
});

document.getElementById("resetDemo").addEventListener("click", () => {
  data = structuredClone(starterData);
  saveAndRender();
});

document.getElementById("exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.teamName.replace(/\s+/g, "-").toLowerCase()}-vex-command.json`;
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importData").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(reader.result);
      data = normalizeData(imported);
      saveAndRender();
    } catch {
      alert("That file does not look like VEX Command data.");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function loadData() {
  try {
    const saved = localStorage.getItem("vex-command-data");
    return saved ? normalizeData(JSON.parse(saved)) : structuredClone(starterData);
  } catch {
    return structuredClone(starterData);
  }
}

function saveData() {
  try {
    localStorage.setItem("vex-command-data", JSON.stringify(data));
  } catch {
    // Browsers can block localStorage for files opened from strict contexts.
  }
}

function saveAndRender() {
  saveData();
  render();
}

function normalizeData(source) {
  if (!source || typeof source !== "object") {
    return structuredClone(starterData);
  }

  return {
    teamName: typeof source.teamName === "string" ? source.teamName : starterData.teamName,
    eventName: typeof source.eventName === "string" ? source.eventName : starterData.eventName,
    scouting: Array.isArray(source.scouting) ? source.scouting : structuredClone(starterData.scouting),
    inventory: Array.isArray(source.inventory) ? source.inventory : structuredClone(starterData.inventory),
    notes: Array.isArray(source.notes) ? source.notes : structuredClone(starterData.notes),
    tasks: Array.isArray(source.tasks) ? source.tasks : structuredClone(starterData.tasks),
    path: Array.isArray(source.path) ? source.path : structuredClone(starterData.path)
  };
}

function switchView(view) {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("active", section.id === view);
  });
  document.getElementById("viewTitle").textContent = views[view];
}

function render() {
  document.getElementById("teamName").value = data.teamName;
  document.getElementById("eventName").value = data.eventName;
  renderMetrics();
  renderReadiness();
  renderMatches();
  renderScouting();
  renderInventory();
  renderNotes();
  renderTasks();
  renderField();
}

function renderMetrics() {
  const wins = data.scouting.filter((row) => row.result === "Win").length;
  const rate = data.scouting.length ? Math.round((wins / data.scouting.length) * 100) : 0;
  const avg = data.scouting.length
    ? Math.round(data.scouting.reduce((sum, row) => sum + Number(row.auton) + Number(row.driver), 0) / data.scouting.length)
    : 0;
  const low = data.inventory.filter((part) => part.qty < part.target).length;
  const open = data.tasks.filter((task) => !task.done).length;

  document.getElementById("winRate").textContent = `${rate}%`;
  document.getElementById("avgScore").textContent = avg;
  document.getElementById("lowStock").textContent = low;
  document.getElementById("openTasks").textContent = open;
}

function renderReadiness() {
  const checks = [
    { label: "Drive base", state: data.tasks.some((task) => /wheel|drive/i.test(task.text) && !task.done) ? "warn" : "good" },
    { label: "Autonomous route", state: data.path.length >= 3 ? "good" : "warn" },
    { label: "Battery pool", state: data.inventory.find((part) => part.name === "Battery packs")?.qty >= 4 ? "good" : "bad" },
    { label: "Scouting coverage", state: data.scouting.length >= 3 ? "good" : "warn" }
  ];
  const worst = checks.some((check) => check.state === "bad") ? "Critical" : checks.some((check) => check.state === "warn") ? "Needs attention" : "Stable";
  document.getElementById("readinessLabel").textContent = worst;
  document.getElementById("readinessList").innerHTML = checks
    .map((check) => `<div class="check-item"><span>${check.label}</span><span class="status ${check.state}">${statusText(check.state)}</span></div>`)
    .join("");
}

function renderMatches() {
  document.getElementById("matchList").innerHTML = data.scouting
    .slice(-4)
    .map((row) => {
      const total = Number(row.auton) + Number(row.driver);
      return `<article class="match-card">
        <div class="match-row"><strong>${escapeHtml(row.match)}</strong><span class="status ${row.result === "Win" ? "good" : "warn"}">${escapeHtml(row.result)}</span></div>
        <div class="match-row"><span>Partner ${escapeHtml(row.partner || "TBD")}</span><strong>${total} pts</strong></div>
        <small>${escapeHtml(row.notes || "No notes yet")}</small>
      </article>`;
    })
    .join("");
}

function renderScouting() {
  document.getElementById("scoutingRows").innerHTML = data.scouting
    .map((row, index) => `<tr>
      <td><input value="${escapeAttr(row.match)}" data-scout="${index}" data-key="match"></td>
      <td><input value="${escapeAttr(row.partner)}" data-scout="${index}" data-key="partner"></td>
      <td><input type="number" value="${row.auton}" data-scout="${index}" data-key="auton"></td>
      <td><input type="number" value="${row.driver}" data-scout="${index}" data-key="driver"></td>
      <td>
        <select data-scout="${index}" data-key="result">
          <option ${row.result === "Win" ? "selected" : ""}>Win</option>
          <option ${row.result === "Loss" ? "selected" : ""}>Loss</option>
          <option ${row.result === "Tie" ? "selected" : ""}>Tie</option>
        </select>
      </td>
      <td><input value="${escapeAttr(row.notes)}" data-scout="${index}" data-key="notes"></td>
    </tr>`)
    .join("");

  document.querySelectorAll("[data-scout]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const { scout, key } = event.target.dataset;
      data.scouting[Number(scout)][key] = key === "auton" || key === "driver" ? Number(event.target.value) : event.target.value;
      saveData();
      renderMetrics();
      renderMatches();
    });
  });
}

function renderInventory() {
  document.getElementById("inventoryGrid").innerHTML = data.inventory
    .map((part, index) => `<article class="part-card">
      <div class="part-head">
        <input class="editable" value="${escapeAttr(part.name)}" data-part-name="${index}">
        <span class="status ${part.qty < part.target ? "warn" : "good"}">${part.qty < part.target ? "Low" : "Ready"}</span>
      </div>
      <small>Target: ${part.target}</small>
      <div class="qty">
        <button type="button" data-part-dec="${index}" aria-label="Decrease ${escapeAttr(part.name)}">−</button>
        <strong>${part.qty}</strong>
        <button type="button" data-part-inc="${index}" aria-label="Increase ${escapeAttr(part.name)}">+</button>
      </div>
    </article>`)
    .join("");

  document.querySelectorAll("[data-part-name]").forEach((input) => {
    input.addEventListener("input", (event) => {
      data.inventory[Number(event.target.dataset.partName)].name = event.target.value;
      saveData();
    });
  });

  document.querySelectorAll("[data-part-inc]").forEach((button) => {
    button.addEventListener("click", () => {
      data.inventory[Number(button.dataset.partInc)].qty += 1;
      saveAndRender();
    });
  });

  document.querySelectorAll("[data-part-dec]").forEach((button) => {
    button.addEventListener("click", () => {
      const part = data.inventory[Number(button.dataset.partDec)];
      part.qty = Math.max(0, part.qty - 1);
      saveAndRender();
    });
  });
}

function renderNotes() {
  document.getElementById("noteList").innerHTML = data.notes
    .map((note, index) => `<article class="note">
      <input class="editable" value="${escapeAttr(note.title)}" data-note-title="${index}">
      <time>${note.date}</time>
      <textarea data-note-text="${index}">${escapeHtml(note.text)}</textarea>
    </article>`)
    .join("");

  document.querySelectorAll("[data-note-title]").forEach((input) => {
    input.addEventListener("input", (event) => {
      data.notes[Number(event.target.dataset.noteTitle)].title = event.target.value;
      saveData();
    });
  });

  document.querySelectorAll("[data-note-text]").forEach((textarea) => {
    textarea.addEventListener("input", (event) => {
      data.notes[Number(event.target.dataset.noteText)].text = event.target.value;
      saveData();
    });
  });
}

function renderTasks() {
  document.getElementById("taskList").innerHTML = data.tasks
    .map((task, index) => `<article class="task">
      <div class="task-row">
        <input type="checkbox" ${task.done ? "checked" : ""} data-task-check="${index}" aria-label="Mark task complete">
        <input class="editable" value="${escapeAttr(task.text)}" data-task-text="${index}">
      </div>
    </article>`)
    .join("");

  document.querySelectorAll("[data-task-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      data.tasks[Number(event.target.dataset.taskCheck)].done = event.target.checked;
      saveAndRender();
    });
  });

  document.querySelectorAll("[data-task-text]").forEach((input) => {
    input.addEventListener("input", (event) => {
      data.tasks[Number(event.target.dataset.taskText)].text = event.target.value;
      saveData();
    });
  });
}

function renderField() {
  const board = document.getElementById("fieldBoard");
  board.innerHTML = "";
  for (let row = 1; row <= 12; row += 1) {
    for (let col = 1; col <= 12; col += 1) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.setAttribute("aria-label", `Field row ${row}, column ${col}`);
      const pathIndex = data.path.findIndex((point) => point.row === row && point.col === col);
      if (pathIndex >= 0) {
        tile.classList.add("path");
        tile.dataset.step = pathIndex + 1;
      }
      tile.addEventListener("click", () => {
        const existing = data.path.findIndex((point) => point.row === row && point.col === col);
        if (existing >= 0) {
          data.path.splice(existing, 1);
        } else {
          data.path.push({ row, col });
        }
        saveAndRender();
      });
      board.appendChild(tile);
    }
  }

  document.getElementById("pathList").innerHTML = data.path
    .map((point) => `<li>Row ${point.row}, column ${point.col}</li>`)
    .join("");
}

function statusText(state) {
  return state === "good" ? "Ready" : state === "bad" ? "Fix now" : "Check";
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

render();
