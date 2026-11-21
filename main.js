/* Quick Wash Motors car wash demo — cinematic interactions */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover:hover) and (pointer:fine)").matches;

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  const REC = /[?&]rec\b/.test(location.search); // video-recording mode: native scroll
  if (!reduce && !REC && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
      else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---------- custom cursor ---------- */
  const cursor = $(".cursor");
  if (fine) {
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
    addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); });
    document.addEventListener("pointerover", (e) => {
      cursor.classList.toggle("is-big", !!e.target.closest("a,button,.ba__range,.pin,select,input"));
    });
  }

  /* ============================================================
     HERO FOG — fogged, rain-dotted glass you can wipe clean
     ============================================================ */
  const fogCanvas = $(".hero__fog");
  const fog = (() => {
    const ctx = fogCanvas.getContext("2d");
    const layer = document.createElement("canvas"); // fog + droplets, rendered once per resize
    const lctx = layer.getContext("2d");
    const mask = document.createElement("canvas"); // where the glass has been wiped
    const mctx = mask.getContext("2d");
    let w = 0, h = 0, dpr = 1, running = false, frame = 0, last = null;
    const runners = []; // drops that slide down and leave clear trails

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      const r = fogCanvas.getBoundingClientRect();
      w = Math.round(r.width * dpr); h = Math.round(r.height * dpr);
      if (!w || !h) return;
      // keep existing wipe when resizing
      const old = document.createElement("canvas"); old.width = mask.width; old.height = mask.height;
      if (mask.width) old.getContext("2d").drawImage(mask, 0, 0);
      [fogCanvas, layer, mask].forEach((c) => { c.width = w; c.height = h; });
      if (old.width) mctx.drawImage(old, 0, 0, w, h);
      paintLayer();
      runners.length = 0;
      const n = Math.round(w / (90 * dpr));
      for (let i = 0; i < n; i++) runners.push(newRunner(true));
    }

    function paintLayer() {
      lctx.clearRect(0, 0, w, h);
      // base condensation
      const g = lctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(20,28,36,.80)");
      g.addColorStop(0.55, "rgba(30,40,50,.70)");
      g.addColorStop(1, "rgba(12,16,22,.86)");
      lctx.fillStyle = g; lctx.fillRect(0, 0, w, h);
      // soft cloudy patches
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = (60 + Math.random() * 220) * dpr;
        const rg = lctx.createRadialGradient(x, y, 0, x, y, r);
        const a = 0.04 + Math.random() * 0.07;
        rg.addColorStop(0, `rgba(190,215,230,${a})`); rg.addColorStop(1, "rgba(190,215,230,0)");
        lctx.fillStyle = rg; lctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // droplets: each one is a little clear lens with a highlight
      const count = Math.round((w * h) / (2600 * dpr * dpr));
      for (let i = 0; i < count; i++) {
        const big = Math.random() < 0.08;
        const r = (big ? 3 + Math.random() * 5 : 0.6 + Math.random() * 2.2) * dpr;
        const x = Math.random() * w, y = Math.random() * h;
        drawDrop(lctx, x, y, r, big ? 1 : 0.7);
      }
    }

    function drawDrop(c, x, y, r, strength) {
      c.save();
      c.globalCompositeOperation = "destination-out";
      c.beginPath(); c.ellipse(x, y, r, r * 1.08, 0, 0, Math.PI * 2);
      c.fillStyle = `rgba(0,0,0,${0.75 * strength})`; c.fill();
      c.restore();
      c.beginPath(); c.ellipse(x, y + r * 0.15, r, r * 1.05, 0, 0.1 * Math.PI, 0.9 * Math.PI);
      c.strokeStyle = `rgba(0,0,0,${0.35 * strength})`; c.lineWidth = Math.max(1, r * 0.35); c.stroke();
      c.beginPath(); c.arc(x - r * 0.3, y - r * 0.35, r * 0.32, 0, Math.PI * 2);
      c.fillStyle = `rgba(235,248,255,${0.55 * strength})`; c.fill();
    }

    function newRunner(randomY) {
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h * 0.6 : -20,
        r: (2.5 + Math.random() * 3) * dpr,
        v: (0.4 + Math.random() * 1.6) * dpr,
        wait: Math.random() * 240,
      };
    }

    function brush(x, y, radius) {
      const r = radius * dpr;
      const g = mctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.55, "rgba(0,0,0,.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
      mctx.globalCompositeOperation = "source-over";
      mctx.fillStyle = g; mctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    function stroke(x, y, radius = 95) {
      x *= dpr; y *= dpr;
      if (last) {
        const dx = x - last.x, dy = y - last.y, d = Math.hypot(dx, dy);
        const steps = Math.min(40, Math.ceil(d / (10 * dpr)));
        for (let i = 1; i <= steps; i++) brush(last.x + (dx * i) / steps, last.y + (dy * i) / steps, radius);
      } else brush(x, y, radius);
      last = { x, y };
      clearTimeout(stroke.t); stroke.t = setTimeout(() => (last = null), 80);
    }

    function tick() {
      if (!running) return;
      frame++;
      // the glass slowly fogs back up
      if (frame % 8 === 0) {
        mctx.globalCompositeOperation = "destination-out";
        mctx.fillStyle = "rgba(0,0,0,.03)"; mctx.fillRect(0, 0, w, h);
      }
      // sliding drops carve trails
      if (!reduce) {
        mctx.globalCompositeOperation = "source-over";
        for (const d of runners) {
          if (d.wait > 0) { d.wait--; continue; }
          d.y += d.v * (1 + Math.random() * 0.6); d.x += (Math.random() - 0.5) * 0.6 * dpr;
          mctx.fillStyle = "rgba(0,0,0,.55)";
          mctx.beginPath(); mctx.arc(d.x, d.y, d.r * 0.75, 0, Math.PI * 2); mctx.fill();
          if (d.y > h + 20) Object.assign(d, newRunner(false));
        }
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(layer, 0, 0);
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(mask, 0, 0);
      // running drop heads
      if (!reduce) {
        ctx.globalCompositeOperation = "source-over";
        for (const d of runners) if (d.wait <= 0) drawDrop(ctx, d.x, d.y, d.r, 1);
      }
      requestAnimationFrame(tick);
    }

    function start() { if (running) return; running = true; requestAnimationFrame(tick); }
    function stop() { running = false; }

    const local = (e) => { const r = fogCanvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    fogCanvas.addEventListener("pointermove", (e) => { const [x, y] = local(e); stroke(x, y, e.pointerType === "touch" ? 70 : 95); hideHint(); });
    fogCanvas.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (!t) return; const [x, y] = local(t); stroke(x, y, 70); hideHint(); }, { passive: true });

    new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop())).observe(fogCanvas);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    resize();

    // a cinematic squeegee pass across the headline
    function sweep() {
      const r = fogCanvas.getBoundingClientRect();
      const p = { t: 0 };
      gsap.to(p, {
        t: 1, duration: reduce ? 0.01 : 1.6, ease: "power2.inOut",
        onUpdate() {
          const x = -60 + p.t * (r.width + 120);
          for (let k = 0; k < 5; k++) {
            const y = r.height * (0.42 + k * 0.11) + Math.sin(p.t * 6 + k) * 18;
            brush(x * dpr, y * dpr, r.width < 700 ? 70 : 120);
          }
        },
      });
    }
    return { sweep, start };
  })();

  let hintHidden = false;
  function hideHint() {
    if (hintHidden) return; hintHidden = true;
    gsap.to(".hero__hint", { opacity: 0, duration: 0.6 });
  }

  /* ============================================================
     LOADER → HERO INTRO
     ============================================================ */
  const count = $(".loader__count");
  const prog = { v: 0 };
  const heroImg = $(".hero__media img");
  const ready = Promise.all([
    heroImg.complete ? Promise.resolve() : new Promise((r) => { heroImg.onload = heroImg.onerror = r; }),
    document.fonts ? document.fonts.ready : Promise.resolve(),
  ]);

  const tlLoad = gsap.timeline();
  tlLoad
    .to(".loader__word span", { y: 0, duration: 1, stagger: 0.05, ease: "expo.out" })
    .to(prog, {
      v: 100, duration: reduce ? 0.2 : 1.4, ease: "power2.inOut",
      onUpdate: () => {
        count.textContent = String(Math.round(prog.v)).padStart(2, "0");
        gsap.set(".loader__bar i", { scaleX: prog.v / 100 });
      },
    }, 0.2);

  Promise.all([ready, tlLoad.then ? new Promise((r) => tlLoad.eventCallback("onComplete", r)) : null]).then(intro);

  function intro() {
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.to(".loader__word span", { y: "-110%", duration: 0.7, stagger: 0.03, ease: "expo.in" })
      .to(".loader__bar, .loader__count, .loader__sub", { opacity: 0, duration: 0.3 }, "<")
      .to(".loader", { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut" }, "-=0.15")
      .add(() => { document.body.classList.remove("is-loading"); lenis && lenis.start(); $(".loader").style.display = "none"; })
      .fromTo(heroImg, { scale: 1.35 }, { scale: 1.08, duration: 2.6, ease: "expo.out" }, "-=0.7")
      .add(() => fog.sweep(), "-=2.2")
      .to(".hero__title .line > span", { y: 0, duration: 1.3, stagger: 0.12 }, "-=2.1")
      .to(".hero__eyebrow", { opacity: 1, duration: 1 }, "-=1.1")
      .fromTo(".hero__sub, .hero__cta", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, "-=0.9")
      .fromTo(".hero__stats > div", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, stagger: 0.1, onStart: counters }, "-=0.9")
      .to(".hero__hint", { opacity: 1, duration: 0.8 }, "-=0.4");
  }

  function counters() {
    $$("[data-count]").forEach((el) => {
      const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), pre = el.dataset.pre || "", o = { v: 0 };
      gsap.to(o, {
        v: end, duration: 2.2, ease: "power3.out",
        onUpdate: () => (el.textContent = pre + (dec ? o.v.toFixed(dec) : Math.round(o.v).toLocaleString("en-IN"))),
      });
    });
  }

  /* hero leaves: parallax + fade */
  gsap.to(heroImg, { yPercent: 18, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero__content, .hero__stats", { y: -120, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "30% top", end: "bottom top", scrub: true } });

  /* nav */
  const nav = $(".nav");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (s) => {
      const y = s.scroll();
      nav.classList.toggle("is-solid", y > 60);
      nav.classList.toggle("is-hidden", y > innerHeight * 0.8 && s.direction === 1);
    },
  });

  /* ============================================================
     STORY — pinned 4-step wash ritual
     ============================================================ */
  // foam bubbles
  const bubbles = $(".bubbles");
  for (let i = 0; i < 28; i++) {
    const b = document.createElement("i"), s = 8 + Math.random() * 46;
    Object.assign(b.style, {
      width: s + "px", height: s + "px", left: Math.random() * 100 + "%",
      animationDuration: 7 + Math.random() * 9 + "s", animationDelay: -Math.random() * 14 + "s",
    });
    b.style.setProperty("--dx", (Math.random() - 0.5) * 160 + "px");
    bubbles.appendChild(b);
  }

  const panels = $$(".panel");
  const labels = $$(".story__rail li");
  const setActive = (i) => labels.forEach((l, k) => l.classList.toggle("is-active", k === i));

  if (!reduce) {
    gsap.set(panels.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
    const story = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".story", start: "top top", end: () => "+=" + innerHeight * 3.4,
        pin: true, scrub: 0.8, anticipatePin: 1,
        onUpdate: (s) => {
          gsap.set(".story__progress i", { scaleY: s.progress });
          setActive(Math.min(3, Math.floor(s.progress * 3 + 0.5)));
        },
      },
    });
    story.fromTo(panels[0].querySelector("img"), { scale: 1.15 }, { scale: 1, duration: 0.6 });
    panels.forEach((p, i) => {
      if (!i) return;
      const at = i * 1 - 0.4;
      story
        .to(p, { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power2.inOut" }, at)
        .fromTo(p.querySelector(".panel__img img"), { scale: 1.4, yPercent: 8 }, { scale: 1, yPercent: 0, duration: 1.3, ease: "power2.out" }, at)
        .to(panels[i - 1].querySelector(".panel__img img"), { scale: 0.92, filter: "brightness(.4)", duration: 1, ease: "power2.inOut" }, at)
        .to(panels[i - 1].querySelector(".panel__text"), { y: -80, opacity: 0, duration: 0.6 }, at)
        .from(p.querySelectorAll(".panel__text > *"), { y: 90, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }, at + 0.45);
    });
    story.fromTo(".glint", { backgroundPosition: "120% 0" }, { backgroundPosition: "-20% 0", duration: 0.8 }, ">-0.2");

    // first panel text enters on approach
    gsap.from(".panel--1 .panel__text > *", {
      y: 90, opacity: 0, duration: 1.1, stagger: 0.1, ease: "expo.out",
      scrollTrigger: { trigger: ".story", start: "top 60%" },
    });
  } else {
    // reduced motion: stack panels as plain sections
    $(".story").style.height = "auto";
    panels.forEach((p) => { p.style.position = "relative"; p.style.height = "100svh"; });
    $(".story__rail").style.display = "none";
  }

  /* ============================================================
     SECTION REVEALS
     ============================================================ */
  $$(".reveal").forEach((el) => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });
  $$(".section .eyebrow").forEach((el) => {
    gsap.from(el, { opacity: 0, x: -20, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  gsap.from(".reveal-img", {
    clipPath: "inset(12% 10% 12% 10% round 40px)", duration: 1.6, ease: "expo.out",
    scrollTrigger: { trigger: ".ba__frame", start: "top 80%" },
  });
  gsap.from(".card", {
    y: 100, opacity: 0, duration: 1.2, stagger: 0.12, ease: "expo.out",
    scrollTrigger: { trigger: ".cards", start: "top 82%" },
  });
  gsap.from(".loc__item", {
    x: -40, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out",
    scrollTrigger: { trigger: ".loc", start: "top 80%" },
  });
  gsap.from(".loc__map", {
    clipPath: "inset(0 0 100% 0 round 22px)", duration: 1.5, ease: "expo.inOut",
    scrollTrigger: { trigger: ".loc", start: "top 80%" },
  });
  gsap.to(".book__bg", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".book", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.from(".form", { y: 80, opacity: 0, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: ".form", start: "top 85%" } });
  gsap.fromTo(".foot__big", { yPercent: 40 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".foot", start: "top bottom", end: "bottom bottom", scrub: true } });

  /* ============================================================
     BEFORE / AFTER
     ============================================================ */
  const ba = $(".ba__frame"), range = $(".ba__range");
  const setPos = (v) => { ba.style.setProperty("--pos", v + "%"); range.value = v; };
  range.addEventListener("input", () => setPos(range.value));
  if (!reduce) {
    const o = { v: 92 };
    ScrollTrigger.create({
      trigger: ba, start: "top 65%", once: true,
      onEnter: () => gsap.fromTo(o, { v: 92 }, { v: 50, duration: 2, ease: "expo.inOut", onUpdate: () => setPos(o.v.toFixed(1)) }),
    });
  }

  /* ============================================================
     LOCATIONS — real Prayagraj map (Leaflet + CARTO dark tiles)
     ============================================================ */
  // Area-level coordinates (exact shop pins can be swapped in later)
  const studios = [
    { name: "Phaphamau", addr: "Main branch · Phaphamau, Prayagraj", type: "Main branch", ll: [25.5300, 81.8580] },
    { name: "Naini", addr: "Ada, Naini, Prayagraj", type: "Branch", ll: [25.3890, 81.8590] },
    { name: "Jhusi", addr: "Jhusi, Prayagraj", type: "Branch", ll: [25.4330, 81.9050] },
    { name: "Jhalwa", addr: "Jhalwa, Prayagraj", type: "Branch", ll: [25.4250, 81.7710] },
  ];
  const items = $$(".loc__item"), card = $(".loc__card");
  const fields = { name: $(".loc__name"), addr: $(".loc__addr"), type: $(".loc__type"), dir: $(".loc__dir") };
  const fill = (s) => {
    fields.name.textContent = s.name; fields.addr.textContent = s.addr; fields.type.textContent = s.type;
    fields.dir.href = `https://www.google.com/maps/dir/?api=1&destination=${s.ll[0]},${s.ll[1]}`;
  };
  let map = null, markers = [];
  const mobile = () => innerWidth <= 900;
  if (window.L) {
    map = L.map("map", { zoomControl: true, scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, className: "qtiles",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    const bounds = L.latLngBounds(studios.map((s) => s.ll));
    map.fitBounds(bounds, mobile() ? { paddingTopLeft: [30, 40], paddingBottomRight: [30, 170] } : { paddingTopLeft: [420, 50], paddingBottomRight: [50, 50] });
    markers = studios.map((s, i) => {
      const m = L.marker(s.ll, {
        icon: L.divIcon({ className: "", html: `<div class="qpin${i ? "" : " is-active"}"><i></i><b>${s.name}</b></div>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        keyboard: false, title: s.name,
      }).addTo(map);
      m.on("click", () => pick(i));
      return m;
    });
    ScrollTrigger.create({ trigger: ".loc", start: "top 90%", once: true, onEnter: () => map.invalidateSize() });
    addEventListener("resize", () => map.invalidateSize());
  }
  let current = 0;
  function pick(i) {
    if (i === current) return;
    current = i;
    items.forEach((b, k) => { b.classList.toggle("is-active", k === i); b.setAttribute("aria-selected", k === i); });
    markers.forEach((m, k) => m.getElement() && m.getElement().firstChild.classList.toggle("is-active", k === i));
    if (map) {
      // keep the pin clear of the info card (bottom-left on desktop, bottom on phones)
      const z = 13, pt = map.project(studios[i].ll, z);
      const off = mobile() ? L.point(0, -110) : L.point(170, -70);
      map.flyTo(map.unproject(pt.subtract(off), z), z, { duration: reduce ? 0 : 1.2 });
    }
    gsap.timeline()
      .to(card, { y: 14, opacity: 0, duration: 0.22, ease: "power2.in" })
      .add(() => fill(studios[i]))
      .to(card, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" });
  }
  items.forEach((b, i) => b.addEventListener("click", () => pick(i)));
  fill(studios[0]);
  $(".loc__list").addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const n = (current + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : 3)) % 4;
    pick(n); items[n].focus();
  });

  /* ============================================================
     BOOKING → WhatsApp
     ============================================================ */
  const WHATSAPP = "917269858006";
  const form = $(".form"), note = $(".form__note");
  const date = form.elements.date;
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  date.min = today; date.value = today;
  $$("[data-pkg]").forEach((b) => b.addEventListener("click", () => (form.elements.pkg.value = b.dataset.pkg)));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = form.elements;
    const phoneOk = f.phone.value.replace(/\D/g, "").length >= 10;
    f.name.classList.toggle("is-bad", !f.name.value.trim());
    f.phone.classList.toggle("is-bad", !phoneOk);
    if (!f.name.value.trim() || !phoneOk) {
      note.textContent = "Add your name and a 10-digit phone number.";
      gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1,0.3)" });
      return;
    }
    const msg = `Hi Quick Wash Motors, I'd like to book:\nPackage: ${f.pkg.value}\nBranch: ${f.studio.value}\nService at: ${f.where.value}\nDate: ${f.date.value} at ${f.time.value}\nName: ${f.name.value.trim()}\nPhone: ${f.phone.value.trim()}`;
    note.textContent = "Opening WhatsApp to confirm your slot…";
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });

  /* floating CTA on phones */
  const fcta = $(".float-cta");
  ScrollTrigger.create({
    trigger: ".marquee", start: "top bottom",
    endTrigger: ".book", end: "top 80%",
    onToggle: (s) => fcta.classList.toggle("is-on", s.isActive),
  });

  addEventListener("load", () => ScrollTrigger.refresh());
  window.__pick = (i) => pick(i);
})();
