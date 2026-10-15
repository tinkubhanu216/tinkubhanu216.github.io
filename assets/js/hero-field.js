/* Hero background: a small gravity field.
   Particles are pulled toward an attractor (the pointer, or a slow drifting point)
   and swirl around it, a nod to the physics-first work behind MadScientist. */
(function () {
  "use strict";

  var canvas = document.getElementById("heroField");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var hero = canvas.parentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;

  var w = 0, h = 0, dpr = 1;
  var parts = [];
  var palette = [];
  var pointer = { x: 0, y: 0, active: false };
  var attractor = { x: 0, y: 0 };
  var running = false, visible = true, rafId = 0, t0 = performance.now();

  function readPalette() {
    var cs = getComputedStyle(root);
    palette = ["--cyan-rgb", "--violet-rgb", "--amber-rgb"].map(function (k) {
      return cs.getPropertyValue(k).trim() || "94,231,255";
    });
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var target = Math.min(150, Math.round((w * h) / 9500));
    if (w < 700) target = Math.min(target, 64);
    while (parts.length < target) parts.push(spawn());
    parts.length = target;
    if (reduceMotion) drawStatic();
  }

  function spawn() {
    var cx = w > 980 ? w * 0.72 : w * 0.5;
    var cy = h * 0.46;
    var ang = Math.random() * Math.PI * 2;
    var rad = 40 + Math.random() * Math.max(w, h) * 0.55;
    var speed = 0.3 + Math.random() * 0.9;
    return {
      x: cx + Math.cos(ang) * rad,
      y: cy + Math.sin(ang) * rad * 0.7,
      vx: -Math.sin(ang) * speed,
      vy: Math.cos(ang) * speed,
      s: 0.7 + Math.random() * 1.7,
      c: palette[(Math.random() * palette.length) | 0],
      px: 0, py: 0
    };
  }

  function step(now) {
    var t = (now - t0) / 1000;
    var cx = w > 980 ? w * 0.72 : w * 0.5;
    if (pointer.active) {
      attractor.x += (pointer.x - attractor.x) * 0.12;
      attractor.y += (pointer.y - attractor.y) * 0.12;
    } else {
      var tx = cx + Math.sin(t * 0.35) * w * 0.1;
      var ty = h * 0.46 + Math.cos(t * 0.27) * h * 0.1;
      attractor.x += (tx - attractor.x) * 0.02;
      attractor.y += (ty - attractor.y) * 0.02;
    }

    ctx.clearRect(0, 0, w, h);
    var linkDist = w < 700 ? 70 : 96;
    var i, j, p, q, dx, dy, d, f, ax, ay;

    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      p.px = p.x; p.py = p.y;
      dx = attractor.x - p.x;
      dy = attractor.y - p.y;
      d = Math.sqrt(dx * dx + dy * dy) + 0.001;

      // pull toward the attractor (softened), plus a tangential swirl
      f = Math.min(1, d / 220) * 0.052 + 0.004;
      ax = (dx / d) * f + (-dy / d) * 0.018;
      ay = (dy / d) * f + (dx / d) * 0.018;

      // gentle noise so the field never settles
      ax += Math.sin(p.y * 0.006 + t * 0.7) * 0.004;
      ay += Math.cos(p.x * 0.006 - t * 0.6) * 0.004;

      p.vx = (p.vx + ax) * 0.992;
      p.vy = (p.vy + ay) * 0.992;
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 2.6) { p.vx = (p.vx / sp) * 2.6; p.vy = (p.vy / sp) * 2.6; }
      p.x += p.vx;
      p.y += p.vy;

      if (d < 14 || p.x < -80 || p.x > w + 80 || p.y < -80 || p.y > h + 80) {
        var n = spawn(); p.x = n.x; p.y = n.y; p.vx = n.vx; p.vy = n.vy; p.px = p.x; p.py = p.y;
      }
    }

    // links
    ctx.lineWidth = 0.6;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      for (j = i + 1; j < parts.length; j++) {
        q = parts[j];
        dx = p.x - q.x; dy = p.y - q.y;
        d = dx * dx + dy * dy;
        if (d < linkDist * linkDist) {
          ctx.strokeStyle = "rgba(" + p.c + "," + (0.16 * (1 - Math.sqrt(d) / linkDist)).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }

    // trails and bodies
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      ctx.strokeStyle = "rgba(" + p.c + ",0.55)";
      ctx.lineWidth = p.s * 0.8;
      ctx.beginPath(); ctx.moveTo(p.px - p.vx * 5, p.py - p.vy * 5); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = "rgba(" + p.c + ",0.95)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.2832); ctx.fill();
    }
  }

  function drawStatic() {
    // single frame for reduced-motion users
    for (var k = 0; k < 40; k++) step(t0 + k * 80);
  }

  function loop(now) {
    if (!running) return;
    step(now);
    rafId = requestAnimationFrame(loop);
  }
  function start() { if (running || reduceMotion || !visible || document.hidden) return; running = true; rafId = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  readPalette();
  attractor.x = w * 0.7; attractor.y = h * 0.45;
  resize();
  attractor.x = (w > 980 ? w * 0.72 : w * 0.5); attractor.y = h * 0.46;
  if (!reduceMotion) start();

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener("resize", resize);

  hero.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = true;
  }, { passive: true });
  hero.addEventListener("pointerleave", function () { pointer.active = false; });
  hero.addEventListener("pointerup", function (e) { if (e.pointerType === "touch") pointer.active = false; });

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    visible ? start() : stop();
  }, { threshold: 0 }).observe(hero);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

  // re-read colours when the theme flips
  new MutationObserver(function () { readPalette(); parts.forEach(function (p) { p.c = palette[(Math.random() * palette.length) | 0]; }); if (reduceMotion) drawStatic(); })
    .observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
