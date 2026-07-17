/* ==========================================================================
   SENEL UFRJ — Interações da versão estática
   --------------------------------------------------------------------------
   JavaScript puro, sem framework. As funções foram separadas por assunto para
   facilitar manutenção: navegação, linha do tempo, edições e galeria.
   ========================================================================== */

"use strict";

document.body.classList.add("js-enabled");

const data = window.SENEL_DATA;

/* Estado mínimo da interface. Nada é salvo em servidor ou banco de dados. */
const state = {
  activeYear: "2021",
  activeDay: "all",
  activeType: "all",
};

/* Atalho seguro para buscar elementos que precisam existir na página. */
const $ = (selector, parent = document) => parent.querySelector(selector);

/* Cria elementos sem concatenar HTML, evitando erros de marcação e injeções. */
function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== "") element.textContent = text;
  return element;
}

/* Formata datas ISO sem deslocamento de fuso horário. */
function dateFromISO(date) {
  return new Date(`${date}T12:00:00`);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(dateFromISO(date))
    .replace(".", "");
}

function formatLongDate(date) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(dateFromISO(date));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/* --------------------------------------------------------------------------
   Cabeçalho, menu móvel e retorno ao topo
   -------------------------------------------------------------------------- */
const header = $("#site-header");
const menuButton = $("#menu-button");
const mobileMenu = $("#mobile-menu");
const backToTop = $("#back-to-top");

function closeMobileMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menu");
  mobileMenu.hidden = true;
  document.body.classList.remove("no-scroll");
}

menuButton.addEventListener("click", () => {
  const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(willOpen));
  menuButton.setAttribute("aria-label", willOpen ? "Fechar menu" : "Abrir menu");
  mobileMenu.hidden = !willOpen;
  document.body.classList.toggle("no-scroll", willOpen);
});

mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMobileMenu));

window.addEventListener(
  "scroll",
  () => {
    const hasScrolled = window.scrollY > 24;
    header.classList.toggle("is-scrolled", hasScrolled);
    backToTop.hidden = window.scrollY < 900;
  },
  { passive: true },
);

window.addEventListener("resize", () => {
  if (window.innerWidth >= 768) closeMobileMenu();
});

backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

/* --------------------------------------------------------------------------
   Entrada suave das seções durante a rolagem
   -------------------------------------------------------------------------- */
function initializeRevealAnimations() {
  const elements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px" },
  );

  elements.forEach((element) => observer.observe(element));
}

/* --------------------------------------------------------------------------
   Linha do tempo
   -------------------------------------------------------------------------- */
const timeline = $("#timeline");

function renderTimeline() {
  const fragment = document.createDocumentFragment();

  data.timeline.forEach((event) => {
    const item = createElement("article", "timeline-item");
    item.append(createElement("div", "timeline-dot"));
    item.append(createElement("h3", "", event.title));
    item.append(createElement("p", "", event.date));
    item.append(createElement("p", "", event.note));
    fragment.append(item);
  });

  timeline.replaceChildren(fragment);
}

$("#timeline-prev").addEventListener("click", () => timeline.scrollBy({ left: -330, behavior: "smooth" }));
$("#timeline-next").addEventListener("click", () => timeline.scrollBy({ left: 330, behavior: "smooth" }));

/* --------------------------------------------------------------------------
   Abas e capa das edições
   -------------------------------------------------------------------------- */
const editionTabs = $("#edition-tabs");
const editionBanner = $("#edition-banner");

function buildEditionTabs() {
  const fragment = document.createDocumentFragment();

  Object.values(data.editions)
    .sort((a, b) => Number(b.year) - Number(a.year))
    .forEach((edition) => {
    const button = createElement("button", "edition-tab");
    button.type = "button";
    button.id = `edition-tab-${edition.year}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "edition-panel");
    button.dataset.year = edition.year;
    button.append(createElement("small", "", "Edição"));
    button.append(createElement("strong", "", edition.year));
    button.addEventListener("click", () => renderEdition(edition.year));
      fragment.append(button);
    });

  editionTabs.replaceChildren(fragment);

  /* Setas esquerda/direita também navegam entre anos para usuários de teclado. */
  editionTabs.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    const buttons = [...editionTabs.querySelectorAll(".edition-tab")];
    const currentIndex = buttons.indexOf(document.activeElement);
    if (currentIndex < 0) return;

    event.preventDefault();
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;

    buttons[nextIndex].focus();
    renderEdition(buttons[nextIndex].dataset.year);
  });
}

function updateEditionTabState(year) {
  editionTabs.querySelectorAll(".edition-tab").forEach((button) => {
    const isActive = button.dataset.year === year;
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });
}

function renderEditionHeader(edition) {
  editionBanner.style.opacity = "0";
  editionBanner.onload = () => (editionBanner.style.opacity = "1");
  editionBanner.src = edition.banner;
  editionBanner.alt = `Imagem de destaque da ${edition.title}: ${edition.theme}`;
  editionBanner.style.objectPosition = edition.bannerPosition || "center";
  if (editionBanner.complete) editionBanner.style.opacity = "1";

  $("#edition-format").textContent = edition.format;
  $("#edition-period").textContent = edition.period;
  $("#edition-kicker").textContent = edition.kicker;
  $("#edition-title").textContent = edition.title;
  $("#edition-theme").textContent = edition.theme;

  const description = $("#edition-description");
  description.replaceChildren(...edition.description.map((paragraph) => createElement("p", "", paragraph)));

  const themeNote = $("#edition-about-theme");
  themeNote.hidden = !edition.aboutTheme;
  themeNote.textContent = edition.aboutTheme || "";
}

function renderMetrics(metrics) {
  const container = $("#edition-metrics");
  const cards = metrics.map((metric) => {
    const card = createElement("article", "metric-card");
    card.append(createElement("strong", "", metric.value));
    card.append(createElement("span", "", metric.label));
    return card;
  });
  container.replaceChildren(...cards);
}

function renderTracks(tracks) {
  const section = $("#tracks-section");
  const container = $("#edition-tracks");
  section.hidden = tracks.length === 0;

  const cards = tracks.map((track, index) => {
    const card = createElement("article", "track-card");
    card.append(createElement("span", "track-number", String(index + 1).padStart(2, "0")));
    card.append(createElement("h5", "", track.title));
    card.append(createElement("p", "", track.description));
    return card;
  });

  container.replaceChildren(...cards);
}

/* --------------------------------------------------------------------------
   Programação: filtros por tipo e dia
   -------------------------------------------------------------------------- */
const scheduleFilter = $("#schedule-filter");
const scheduleDays = $("#schedule-days");
const scheduleList = $("#edition-schedule");

function buildScheduleControls(schedule) {
  const types = [...new Set(schedule.map((item) => item.type))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const dates = [...new Set(schedule.map((item) => item.date))].sort();

  const allTypes = createElement("option", "", "Todas as atividades");
  allTypes.value = "all";
  const typeOptions = types.map((type) => {
    const option = createElement("option", "", type);
    option.value = type;
    return option;
  });
  scheduleFilter.replaceChildren(allTypes, ...typeOptions);
  scheduleFilter.value = state.activeType;

  const allDays = createElement("button", "day-tab", "Todos os dias");
  allDays.type = "button";
  allDays.dataset.day = "all";
  allDays.setAttribute("role", "tab");

  const dayButtons = dates.map((date) => {
    const button = createElement("button", "day-tab", formatShortDate(date));
    button.type = "button";
    button.dataset.day = date;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-label", `Mostrar ${formatLongDate(date)}`);
    return button;
  });

  scheduleDays.replaceChildren(allDays, ...dayButtons);
  scheduleDays.querySelectorAll(".day-tab").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.day === state.activeDay));
    button.addEventListener("click", () => {
      state.activeDay = button.dataset.day;
      scheduleDays.querySelectorAll(".day-tab").forEach((dayButton) => {
        dayButton.setAttribute("aria-selected", String(dayButton === button));
      });
      renderSchedule();
    });
  });
}

function renderSchedule() {
  const edition = data.editions[state.activeYear];
  const filtered = edition.schedule
    .filter((item) => state.activeDay === "all" || item.date === state.activeDay)
    .filter((item) => state.activeType === "all" || item.type === state.activeType)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  $("#schedule-heading").textContent = `${edition.schedule.length} ${edition.schedule.length === 1 ? "atividade preservada" : "atividades preservadas"}`;

  if (filtered.length === 0) {
    scheduleList.replaceChildren(createElement("p", "empty-state", "Nenhuma atividade corresponde aos filtros selecionados."));
    return;
  }

  const rows = filtered.map((activity) => {
    const item = createElement("article", "schedule-item");
    item.append(createElement("time", "schedule-time", activity.time));

    const content = createElement("div");
    content.append(createElement("p", "schedule-type", `${formatLongDate(activity.date)} · ${activity.type}`));
    content.append(createElement("h5", "", activity.title));
    content.append(createElement("p", "", activity.speakers));
    item.append(content);

    if (activity.link) {
      const link = createElement("a", "schedule-link", "↗");
      link.href = activity.link;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.setAttribute("aria-label", `Assistir ${activity.title} em uma nova aba`);
      item.append(link);
    }

    return item;
  });

  scheduleList.replaceChildren(...rows);
}

scheduleFilter.addEventListener("change", () => {
  state.activeType = scheduleFilter.value;
  renderSchedule();
});

/* --------------------------------------------------------------------------
   Galeria e modal de fotografias
   -------------------------------------------------------------------------- */
const photoDialog = $("#photo-dialog");
const photoFull = $("#photo-full");
const photoCaption = $("#photo-caption");

function openPhoto(photo) {
  photoFull.src = photo.src;
  photoFull.alt = photo.alt;
  photoCaption.textContent = photo.alt;
  photoDialog.showModal();
  document.body.classList.add("no-scroll");
}

function closePhoto() {
  photoDialog.close();
  document.body.classList.remove("no-scroll");
  photoFull.src = "";
}

$("#photo-close").addEventListener("click", closePhoto);
photoDialog.addEventListener("click", (event) => {
  if (event.target === photoDialog) closePhoto();
});
photoDialog.addEventListener("close", () => document.body.classList.remove("no-scroll"));

function renderGallery(photos) {
  const container = $("#edition-gallery");
  $("#gallery-count").textContent = `${photos.length} ${photos.length === 1 ? "imagem" : "imagens"}`;

  if (photos.length === 0) {
    container.replaceChildren(createElement("p", "empty-state", "Não há fotografias registradas para esta edição."));
    return;
  }

  const cards = photos.map((photo, index) => {
    const button = createElement("button", "gallery-card");
    button.type = "button";
    button.setAttribute("aria-label", `Ampliar: ${photo.alt}`);
    button.addEventListener("click", () => openPhoto(photo));

    const image = createElement("img");
    image.src = photo.src;
    image.alt = photo.alt;
    image.loading = index < 2 ? "eager" : "lazy";
    image.decoding = "async";
    button.append(image);
    return button;
  });

  container.replaceChildren(...cards);
}

/* --------------------------------------------------------------------------
   Patrocinadores
   -------------------------------------------------------------------------- */
function renderSponsors(sponsors) {
  const container = $("#edition-sponsors");

  if (sponsors.length === 0) {
    container.replaceChildren(createElement("p", "empty-state", "Não há patrocinadores registrados no acervo desta edição."));
    return;
  }

  const categoryOrder = ["Platina", "Ouro", "Prata", "Bronze"];
  const groups = categoryOrder
    .filter((category) => sponsors.some((sponsor) => sponsor.category === category))
    .map((category) => {
      const group = createElement("section", "sponsor-group");
      group.append(createElement("h5", "sponsor-group__label", category));

      const grid = createElement("div", "sponsor-grid__inner");
      sponsors
        .filter((sponsor) => sponsor.category === category)
        .forEach((sponsor) => {
          const card = createElement("article", "sponsor-card");
          const image = createElement("img");
          image.src = sponsor.logo;
          image.alt = sponsor.name;
          image.loading = "lazy";
          card.append(image);
          grid.append(card);
        });

      group.append(grid);
      return group;
    });

  container.replaceChildren(...groups);
}

/* Junta todas as renderizações de uma edição em uma única atualização. */
function renderEdition(year) {
  const edition = data.editions[year];
  if (!edition) return;

  state.activeYear = year;
  state.activeDay = "all";
  state.activeType = "all";

  updateEditionTabState(year);
  renderEditionHeader(edition);
  renderMetrics(edition.metrics);
  renderTracks(edition.tracks);
  buildScheduleControls(edition.schedule);
  renderSchedule();
  renderGallery(edition.photos);
  renderSponsors(edition.sponsors);
}

/* --------------------------------------------------------------------------
   Inicialização
   -------------------------------------------------------------------------- */
renderTimeline();
buildEditionTabs();
renderEdition(state.activeYear);
initializeRevealAnimations();

$("#current-year").textContent = new Date().getFullYear();
