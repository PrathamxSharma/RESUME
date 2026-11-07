'use strict';



// sidebar toggle (mobile / tablet)
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

if (sidebar && sidebarBtn) {
  sidebarBtn.addEventListener("click", function () {
    const open = sidebar.classList.toggle("active");
    sidebarBtn.setAttribute("aria-expanded", String(open));
    const label = sidebarBtn.querySelector("span");
    if (label) label.textContent = open ? "Hide Contacts" : "Show Contacts";
  });
}



// project filter: buttons on large screens, custom select on small screens
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-select-value]");
const filterBtns = document.querySelectorAll("[data-filter-btn]");
const filterItems = document.querySelectorAll("[data-filter-item]");

// stagger index for the card entrance animation (see .project-item.active in style.css)
const indexVisibleProjects = function () {
  let n = 0;
  filterItems.forEach(function (item) {
    if (item.classList.contains("active")) item.style.setProperty("--i", Math.min(n++, 8));
  });
};

const applyFilter = function (category) {
  filterItems.forEach(function (item) {
    item.classList.toggle("active", category === "all" || item.dataset.category === category);
  });
  indexVisibleProjects();
  filterBtns.forEach(function (btn) {
    const on = btn.dataset.filterBtn === category;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
  });
};

const setSelectOpen = function (open) {
  if (!select) return;
  select.classList.toggle("active", open);
  select.setAttribute("aria-expanded", String(open));
};

if (select) {
  select.addEventListener("click", function () {
    setSelectOpen(!select.classList.contains("active"));
  });

  document.addEventListener("click", function (e) {
    if (!select.parentElement.contains(e.target)) setSelectOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setSelectOpen(false);
  });
}

selectItems.forEach(function (item) {
  item.addEventListener("click", function () {
    if (selectValue) selectValue.textContent = this.textContent.trim();
    setSelectOpen(false);
    applyFilter(this.dataset.selectItem);
  });
});

filterBtns.forEach(function (btn) {
  btn.addEventListener("click", function () {
    if (selectValue) selectValue.textContent = this.textContent.trim();
    applyFilter(this.dataset.filterBtn);
  });
});



// contact form: submit via fetch so the visitor stays on the page
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");
const formStatus = document.querySelector("[data-form-status]");
const FALLBACK_EMAIL = "prathamsharma@live.com";

const setStatus = function (text, kind) {
  if (!formStatus) return;
  formStatus.textContent = text;
  formStatus.className = "form-status" + (kind ? " form-status-" + kind : "");
};

if (form && formBtn && formInputs.length) {
  const syncButton = function () { formBtn.disabled = !form.checkValidity(); };

  formInputs.forEach(function (input) { input.addEventListener("input", syncButton); });
  syncButton();

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    formBtn.disabled = true;
    setStatus("Sending...");

    fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: { "Accept": "application/json" }
    })
      .then(function (response) {
        if (response.ok) {
          form.reset();
          setStatus("Thanks! Your message has been sent. I’ll get back to you soon.", "success");
          return;
        }
        return response.json().catch(function () { return {}; }).then(function (data) {
          const err = new Error((data && data.errors && data.errors.map(function (x) { return x.message; }).join(", ")) || "");
          err.fromServer = true;
          throw err;
        });
      })
      .catch(function (err) {
        const detail = err && err.fromServer && err.message ? err.message + ". " : "Sorry, something went wrong. ";
        setStatus(detail + "You can also email me at " + FALLBACK_EMAIL + ".", "error");
      })
      .finally(syncButton);
  });
}



// scroll reveal: cards and sections fade up as they enter the viewport.
// Skipped entirely for visitors who prefer reduced motion or lack IntersectionObserver.
const REVEAL_SELECTOR = [
  ".stat-item", ".service-item", ".timeline-item", ".skill-group",
  ".publication-chip", ".publication-item", ".Certifications-post-item",
  ".contact-action", ".mapbox", ".contact-form"
].join(", ");

const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealTimers = new WeakMap();

const clearReveal = function (el) {
  clearTimeout(revealTimers.get(el));
  el.classList.remove("reveal", "is-visible");
  el.style.removeProperty("--i");
};

const revealObserver = (!reduceMotion && "IntersectionObserver" in window)
  ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      revealObserver.unobserve(el);
      el.classList.add("is-visible");
      // drop the helper classes once the transition ends so hover effects work normally
      const delay = (parseFloat(el.style.getPropertyValue("--i")) || 0) * 60;
      revealTimers.set(el, setTimeout(function () { clearReveal(el); }, 650 + delay));
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 })
  : null;

const revealPage = function (page) {
  if (!revealObserver || !page) return;
  revealObserver.disconnect(); // stop watching items on the page we just left
  const perParent = new Map();
  page.querySelectorAll(REVEAL_SELECTOR).forEach(function (el) {
    clearReveal(el);
    const i = perParent.get(el.parentElement) || 0;
    perParent.set(el.parentElement, i + 1);
    el.style.setProperty("--i", Math.min(i, 6));
    el.classList.add("reveal");
    revealObserver.observe(el);
  });
};



// page navigation, mirrored in the URL hash so tabs can be linked to
// (e.g. /#resume) and the browser back button works
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");
const pageNames = Array.prototype.map.call(pages, function (page) { return page.dataset.page; });

const showPage = function (name, scrollToTop) {
  if (pageNames.indexOf(name) === -1) name = "about";

  let activePage = null;
  pages.forEach(function (page) {
    const on = page.dataset.page === name;
    page.classList.toggle("active", on);
    if (on) activePage = page;
  });

  navigationLinks.forEach(function (link) {
    const on = link.dataset.navLink === name;
    link.classList.toggle("active", on);
    if (on) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  if (scrollToTop) window.scrollTo(0, 0);
  revealPage(activePage);
};

navigationLinks.forEach(function (link) {
  link.addEventListener("click", function () {
    const name = link.dataset.navLink;
    if (location.hash === "#" + name) showPage(name, true);
    else location.hash = name; // fires hashchange
  });
});

window.addEventListener("hashchange", function () {
  showPage(location.hash.slice(1).toLowerCase(), true);
});

indexVisibleProjects();
showPage(location.hash.slice(1).toLowerCase(), false);
