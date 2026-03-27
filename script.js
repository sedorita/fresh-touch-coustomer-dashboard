



const tabs = document.querySelectorAll(".portal-tab");
const panels = document.querySelectorAll("[data-panel]");
const panelButtons = document.querySelectorAll("[data-panel-target]");
const menuBtn = document.getElementById("portalMenuBtn");
const tabsWrap = document.getElementById("portalTabs");

const modal = document.getElementById("portalModal");
const modalForm = document.getElementById("portalModalForm");
const requestChangeBtn = document.getElementById("requestChangeBtn");
const updateHomeNotesBtn = document.getElementById("updateHomeNotesBtn");
const editProfileBtn = document.getElementById("editProfileBtn");
const addExtraBtn = document.getElementById("addExtraBtn");
const rushRequestBtn = document.getElementById("rushRequestBtn");

const toast = document.getElementById("portalToast");

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageThread = document.getElementById("messageThread");

const confirmVisitBtn = document.getElementById("confirmVisitBtn");
const quickPrompts = document.querySelectorAll(".quick-prompt");

let toastTimer = null;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function switchPanel(panelName) {
  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.panel === panelName);
  });

  panels.forEach((panel) => {
    const isMatch = panel.id === `panel-${panelName}`;
    panel.classList.toggle("is-active", isMatch);
    panel.setAttribute("aria-hidden", String(!isMatch));
  });

  if (tabsWrap.classList.contains("is-open")) {
    tabsWrap.classList.remove("is-open");
    menuBtn?.setAttribute("aria-expanded", "false");
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    switchPanel(tab.dataset.panel);
  });
});

panelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-panel-target");
    if (target) {
      switchPanel(target);
      showToast(`Opened ${target.replace("-", " ")}.`);
    }
  });
});

menuBtn?.addEventListener("click", () => {
  const isOpen = tabsWrap.classList.toggle("is-open");
  menuBtn.setAttribute("aria-expanded", String(isOpen));
});

function openModal(defaultType = "Reschedule visit", defaultMessage = "") {
  if (!modal) return;

  const typeSelect = document.getElementById("requestType");
  const messageBox = document.getElementById("requestMessage");

  if (typeSelect) typeSelect.value = defaultType;
  if (messageBox) messageBox.value = defaultMessage;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-close-modal]").forEach((element) => {
  element.addEventListener("click", closeModal);
});

requestChangeBtn?.addEventListener("click", () => {
  openModal(
    "Reschedule visit",
    "Please help me adjust the timing for my next cleaning."
  );
});

updateHomeNotesBtn?.addEventListener("click", () => {
  openModal(
    "Update access note",
    "I need to update a note the cleaning team should see before arrival."
  );
});

editProfileBtn?.addEventListener("click", () => {
  openModal(
    "Update access note",
    "I want to update my home profile and service notes."
  );
});

addExtraBtn?.addEventListener("click", () => {
  openModal(
    "Add an extra",
    "I’d like to add an extra task to my next visit."
  );
});

rushRequestBtn?.addEventListener("click", () => {
  openModal(
    "Ask a question",
    "Do you have availability for a rush cleaning this week?"
  );
});

modalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  closeModal();
  showToast("Request sent to the team.");
});

confirmVisitBtn?.addEventListener("click", () => {
  showToast("Visit details confirmed.");
});

quickPrompts.forEach((promptButton) => {
  promptButton.addEventListener("click", () => {
    const text = promptButton.textContent?.trim();
    if (!text || !messageInput) return;

    switchPanel("messages");
    messageInput.value = text;
    messageInput.focus();
  });
});

messageForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!messageInput || !messageThread) return;

  const value = messageInput.value.trim();
  if (!value) return;

  const bubble = document.createElement("div");
  bubble.className = "message message--me";
  bubble.textContent = value;

  messageThread.appendChild(bubble);
  messageInput.value = "";
  messageThread.scrollTop = messageThread.scrollHeight;

  window.setTimeout(() => {
    const reply = document.createElement("div");
    reply.className = "message message--them";
    reply.textContent =
      "Thanks — we received your message and will follow up shortly.";
    messageThread.appendChild(reply);
    messageThread.scrollTop = messageThread.scrollHeight;
  }, 700);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});