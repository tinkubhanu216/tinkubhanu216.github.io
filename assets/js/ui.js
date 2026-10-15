/* Portfolio UI: theme, nav, reveals, counters, lens switch, tabs, carousel, form. */
(function () {
  "use strict";

  var doc = document, root = doc.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } return null; }

  /* ---------- Theme ---------- */
  var themeBtn = $("#themeToggle");
  var meta = $('meta[name="theme-color"]');
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    if (themeBtn) themeBtn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    if (meta) meta.setAttribute("content", t === "dark" ? "#060810" : "#f5f3ee");
  }
  setTheme(store("theme") === "light" ? "light" : "dark");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(next); store("theme", next);
  });

  /* ---------- Toast ---------- */
  var toastEl = $("#toast"), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }

  /* ---------- Nav ---------- */
  var nav = $("#nav"), burger = $("#burger");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    doc.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  $$("#navLinks a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  window.matchMedia("(min-width: 980px)").addEventListener("change", function () { setMenu(false); });

  var spyLinks = $$("[data-spy]");
  var spyTargets = spyLinks.map(function (a) { return $("#" + a.getAttribute("data-spy")); });
  var progress = $("#progressBar");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, max = root.scrollHeight - window.innerHeight;
    nav.classList.toggle("is-scrolled", y > 24);
    if (progress) progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    var mid = y + window.innerHeight * 0.35, active = -1;
    spyTargets.forEach(function (s, i) { if (s && s.offsetTop <= mid && s.offsetTop + s.offsetHeight > mid) active = i; });
    spyLinks.forEach(function (a, i) { a.classList.toggle("is-active", i === active); });
    updateRail();
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- Rail (timeline) progress ---------- */
  var rail = $("#rail");
  function updateRail() {
    if (!rail) return;
    var r = rail.getBoundingClientRect(), vh = window.innerHeight;
    var p = (vh * 0.6 - r.top) / r.height;
    rail.style.setProperty("--p", Math.max(0, Math.min(1, p)).toFixed(3));
  }

  /* ---------- Split text ---------- */
  $$("[data-split]").forEach(function (el, n) {
    var text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-hidden", "true");
    text.split("").forEach(function (ch, i) {
      var s = doc.createElement("span");
      s.className = "ch"; s.textContent = ch;
      s.style.setProperty("--cd", (n * 320 + i * 38 + 120) + "ms");
      s.style.setProperty("--i", i); s.style.setProperty("--n", text.length);
      el.appendChild(s);
    });
  });

  $$("[data-words]").forEach(function (el) {
    var text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(/\s+/).forEach(function (word, i) {
      var w = doc.createElement("span"), inner = doc.createElement("span");
      w.className = "w"; w.setAttribute("aria-hidden", "true");
      inner.textContent = word; inner.style.setProperty("--wd", i * 55 + "ms");
      w.appendChild(inner); el.appendChild(w); el.appendChild(doc.createTextNode(" "));
    });
  });

  /* ---------- Scramble ---------- */
  var GLYPHS = "01·+/<>_=ΣΔλψ";
  function scramble(el, finalText) {
    if (reduceMotion) { el.textContent = finalText; return; }
    var start = performance.now(), dur = 800;
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur), out = "";
      for (var i = 0; i < finalText.length; i++) {
        var c = finalText[i];
        out += (c === " " || c === "·" || i < p * finalText.length) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = finalText;
    })(start);
  }

  /* ---------- Counters ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count")), suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion || isNaN(target)) return;
    var start = performance.now(), dur = 1500;
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * e).toLocaleString("en-US") + (p < 1 ? "" : suffix);
      if (p < 1) requestAnimationFrame(tick); else el.textContent = target.toLocaleString("en-US") + suffix;
    })(start);
  }

  /* ---------- Reveal on scroll ---------- */
  var seen = new WeakSet();
  function stagger(el) {
    var sibs = $$(":scope > .reveal", el.parentElement), i = sibs.indexOf(el);
    el.style.setProperty("--d", (i > 0 ? Math.min(i, 6) * 70 : 0) + "ms");
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting || seen.has(en.target)) return;
      var el = en.target; seen.add(el); io.unobserve(el);
      if (el.classList.contains("reveal")) { stagger(el); el.classList.add("is-in"); }
      if (el.hasAttribute("data-words")) el.classList.add("is-in");
      if (el.hasAttribute("data-scramble")) scramble(el, el.textContent);
      $$("[data-count]", el).concat(el.hasAttribute("data-count") ? [el] : []).forEach(countUp);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal, [data-words], [data-scramble]").forEach(function (el) { io.observe(el); });

  /* ---------- Pointer effects: card spotlight + page spotlight ---------- */
  var spot = $(".spotlight"), lastMove = null, moveQueued = false;
  doc.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    lastMove = e;
    if (moveQueued) return;
    moveQueued = true;
    requestAnimationFrame(function () {
      moveQueued = false;
      var ev = lastMove;
      if (spot) { spot.style.setProperty("--sx", ev.clientX + "px"); spot.style.setProperty("--sy", ev.clientY + "px"); spot.classList.add("is-on"); }
      var card = ev.target.closest && ev.target.closest("[data-spot]");
      if (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ev.clientX - r.left + "px");
        card.style.setProperty("--my", ev.clientY - r.top + "px");
      }
    });
  }, { passive: true });
  root.addEventListener("mouseleave", function () { if (spot) spot.classList.remove("is-on"); });

  /* ---------- Tilt + magnetic (fine pointers only) ---------- */
  if (finePointer && !reduceMotion) {
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", (x * 9).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-y * 9).toFixed(2) + "deg");
      });
      el.addEventListener("pointerleave", function () { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
    $$("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- Lens: tailor the page to the visitor ---------- */
  var LENSES = {
    overall: {
      lead: "I build AI that predicts how the physical world evolves, and the enterprise systems that keep businesses running. From banking software to a 3B-parameter foundation model for space R&D.",
      cta1: ["Explore the journey", "#journey"], cta2: ["Get in touch", "#contact"],
      sections: ["journey", "madscientist", "zoho", "engineering", "timeline", "recognition", "contact"]
    },
    investor: {
      lead: "Co-founder and CTO of MadScientist, building Scientific Intelligent Models that predict physical state instead of the next token. Raman‑C1, a 3B-parameter foundational SIM for space R&D, is in development with a team of 5+. Our v1 platform onboarded 15,000+ users and was incubated at T-Hub.",
      cta1: ["See MadScientist & Raman-C1", "#madscientist"], cta2: ["Talk to me", "mailto:bhanuprasadthandra@gmail.com?subject=MadScientist%20%E2%80%94%20introduction"],
      sections: ["madscientist", "journey", "recognition", "timeline", "zoho", "engineering", "contact"]
    },
    zoho: {
      lead: "Technology Head at Zyenac Solutions. 100+ Zoho implementations and integrations across 20+ industries, from pre-sales to go-live: full-stack rollouts, custom Creator apps, links to Oracle Fusion, SAP, Focus ERP, Infor LN and Tally, migrations and ongoing support.",
      cta1: ["See the Zoho practice", "#zoho"], cta2: ["Start a Zoho project", "mailto:bhanuprasadthandra@gmail.com?subject=Zoho%20project%20enquiry"],
      sections: ["zoho", "engineering", "timeline", "recognition", "journey", "madscientist", "contact"]
    },
    engineering: {
      lead: "Full-stack engineer who has shipped regulated banking software at DBS, a 15,000-user platform on Angular, Node.js and WebSockets, and now the cloud infrastructure and deployments behind a foundation model. Java and Spring Boot, TypeScript and Angular, Python, CI/CD. Teams of 5+ and 15+.",
      cta1: ["See engineering depth", "#engineering"], cta2: ["Talk to me", "mailto:bhanuprasadthandra@gmail.com?subject=Engineering%20opportunity"],
      sections: ["engineering", "timeline", "zoho", "madscientist", "journey", "recognition", "contact"]
    }
  };

  var lensWrap = $("#lensOptions"), lensBtns = $$(".lens__btn"), thumb = $(".lens__thumb");
  var lead = $("#heroLead"), cta1 = $("#heroCtaPrimary"), cta1t = $("#heroCtaPrimaryText"), cta2 = $("#heroCtaSecondary");
  var mainEl = $("#main");

  function moveThumb() {
    var active = $(".lens__btn.is-active");
    if (!active || !thumb) return;
    thumb.style.setProperty("--x", active.offsetLeft + "px");
    thumb.style.setProperty("--w", active.offsetWidth + "px");
  }

  function renumber() {
    var ordered = $$("main > section[data-order]").filter(function (s) { return $("[data-label]", s); })
      .sort(function (a, b) { return (parseInt(a.style.order, 10) || 0) - (parseInt(b.style.order, 10) || 0); });
    ordered.forEach(function (s, i) {
      var eb = $("[data-label]", s);
      eb.textContent = ("0" + (i + 1)).slice(-2) + " · " + eb.getAttribute("data-label");
    });
  }

  function applyOrder(key) {
    var cfg = LENSES[key];
    $$("main > [data-order]").forEach(function (el) {
      var base = parseInt(el.getAttribute("data-order"), 10);
      var idx = cfg.sections.indexOf(el.id);
      el.style.order = idx > -1 ? 3 + idx : base;
    });
    $$("[data-lens-order]").forEach(function (el) {
      var m = new RegExp(key + ":(\\d+)").exec(el.getAttribute("data-lens-order"));
      if (m) el.style.order = m[1];
    });
    renumber();
  }

  function setLens(key, opts) {
    opts = opts || {};
    if (!LENSES[key]) key = "overall";
    var cfg = LENSES[key];
    root.setAttribute("data-lens", key);
    lensBtns.forEach(function (b) {
      var on = b.getAttribute("data-lens") === key;
      b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on);
    });
    moveThumb();

    var swap = function () {
      lead.textContent = cfg.lead;
      cta1t.textContent = cfg.cta1[0]; cta1.setAttribute("href", cfg.cta1[1]);
      cta2.textContent = cfg.cta2[0]; cta2.setAttribute("href", cfg.cta2[1]);
      lead.classList.remove("is-swap");
    };
    if (opts.instant || reduceMotion) { swap(); applyOrder(key); }
    else {
      lead.classList.add("is-swap"); mainEl.classList.add("is-shuffling");
      setTimeout(function () { swap(); applyOrder(key); mainEl.classList.remove("is-shuffling"); }, 260);
    }

    if (opts.persist) {
      try {
        var u = new URL(location.href);
        if (key === "overall") u.searchParams.delete("for"); else u.searchParams.set("for", key);
        history.replaceState(null, "", u);
      } catch (e) { /* file:// or restricted */ }
    }
  }

  lensBtns.forEach(function (b) { b.addEventListener("click", function () { setLens(b.getAttribute("data-lens"), { persist: true }); }); });
  window.addEventListener("resize", moveThumb);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(moveThumb);

  var initial = "overall";
  try { initial = new URLSearchParams(location.search).get("for") || "overall"; } catch (e) { /* ignore */ }
  setLens(initial, { instant: true });
  requestAnimationFrame(moveThumb);

  /* ---------- Skills tabs ---------- */
  var tabs = $$(".skills__tab"), ink = $(".skills__ink");
  function moveInk() {
    var a = $(".skills__tab.is-active");
    if (a && ink) { ink.style.setProperty("--x", a.offsetLeft + "px"); ink.style.setProperty("--w", a.offsetWidth + "px"); }
  }
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
      var panel = doc.getElementById(t.getAttribute("aria-controls"));
      panel.hidden = !on; panel.classList.toggle("is-active", on);
      if (on) $$("li", panel).forEach(function (li, i) { li.style.setProperty("--i", i); });
    });
    moveInk();
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length;
      if (e.key === "ArrowRight") { e.preventDefault(); selectTab(tabs[(i + 1) % n], true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); selectTab(tabs[(i - 1 + n) % n], true); }
    });
  });
  if (tabs.length) { selectTab(tabs[0]); window.addEventListener("resize", moveInk); if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(moveInk); }

  /* ---------- Case carousel ---------- */
  var track = $("#caseTrack"), prev = $("#casePrev"), next = $("#caseNext");
  if (track) {
    var stepBy = function () { var c = $(".case", track); return c ? c.offsetWidth + 14 : 360; };
    prev.addEventListener("click", function () { track.scrollBy({ left: -stepBy(), behavior: "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: stepBy(), behavior: "smooth" }); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); track.scrollBy({ left: stepBy(), behavior: "smooth" }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); track.scrollBy({ left: -stepBy(), behavior: "smooth" }); }
    });
    // drag to scroll with a mouse
    var down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add("is-drag"); }
      track.scrollLeft = sl - dx;
    });
    window.addEventListener("pointerup", function () { if (!down) return; down = false; track.classList.remove("is-drag"); });
    track.addEventListener("click", function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
  }

  /* ---------- Integration hub: flowing packets ---------- */
  var svg = $(".hub__lines");
  if (svg && !reduceMotion) {
    var NS = "http://www.w3.org/2000/svg";
    $$("line", svg).forEach(function (ln, i) {
      var x1 = ln.getAttribute("x1"), y1 = ln.getAttribute("y1"), x2 = ln.getAttribute("x2"), y2 = ln.getAttribute("y2");
      [[x1, y1, x2, y2, 0], [x2, y2, x1, y1, 1.2]].forEach(function (seg) {
        var c = doc.createElementNS(NS, "circle"), m = doc.createElementNS(NS, "animateMotion");
        c.setAttribute("r", "1.1");
        m.setAttribute("dur", (2.6 + (i % 3) * 0.4) + "s"); m.setAttribute("repeatCount", "indefinite");
        m.setAttribute("begin", (i * 0.35 + seg[4]) + "s");
        m.setAttribute("path", "M" + seg[0] + "," + seg[1] + " L" + seg[2] + "," + seg[3]);
        c.appendChild(m); svg.appendChild(c);
      });
    });
    var nodes = $$(".hub__node");
    var li = 0;
    setInterval(function () { nodes.forEach(function (n, i) { n.classList.toggle("is-lit", i === li); }); li = (li + 1) % nodes.length; }, 1600);
  }

  /* ---------- Copy buttons ---------- */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-copy");
      var done = function () { toast("Copied " + v); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { toast("Copy failed. Select the text instead."); });
      else {
        var ta = doc.createElement("textarea"); ta.value = v; doc.body.appendChild(ta); ta.select();
        try { doc.execCommand("copy"); done(); } catch (e) { toast("Copy failed. Select the text instead."); }
        ta.remove();
      }
    });
  });

  /* ---------- Contact form → mailto ---------- */
  var form = $("#contactForm"), note = $("#formNote");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements, bad = false;
    ["name", "email", "message"].forEach(function (k) {
      var ok = f[k].value.trim() && (k !== "email" || /^\S+@\S+\.\S+$/.test(f[k].value.trim()));
      f[k].classList.toggle("is-bad", !ok); if (!ok) bad = true;
    });
    if (bad) { note.textContent = "Please fill in all three fields with a valid email."; return; }
    var body = f.message.value.trim() + "\n\n— " + f.name.value.trim() + " (" + f.email.value.trim() + ")";
    location.href = "mailto:bhanuprasadthandra@gmail.com?subject=" + encodeURIComponent("Portfolio enquiry from " + f.name.value.trim()) + "&body=" + encodeURIComponent(body);
    note.textContent = "Opening your email app. If nothing happens, write to bhanuprasadthandra@gmail.com.";
    toast("Opening your email app");
  });

  /* ---------- Misc ---------- */
  var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
  onScroll();
})();
