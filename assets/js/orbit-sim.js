/* Orbit illustration for the MadScientist section.
   A tiny two-body gravity simulation: the "state" of each body (position, velocity, energy)
   evolves forward in time. It illustrates the idea of predicting physical state rather than
   the next token. It is NOT Raman-C1 and says so on the page. */
(function () {
  "use strict";

  var canvas = document.getElementById("simCanvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var stage = canvas.parentElement;
  var root = document.documentElement;

  // Dimensionless units: GM = 1, so a circular orbit at r = 1 has speed 1.
  var SOFT = 0.05;      // softening length
  var TS = 1.25;        // sim time units per real second
  var DT = 0.01;        // integrator step
  var MAX_BODIES = 7;
  var TRAIL = 220;

  var w = 0, h = 0, dpr = 1, L = 100, cx = 0, cy = 0;
  var bodies = [], bursts = [], colors = [];
  var selected = null;
  var drag = null;
  var running = false, visible = true, rafId = 0, last = 0, hudTick = 0, colorIdx = 0;

  var hud = {
    x: document.getElementById("hudX"), y: document.getElementById("hudY"),
    v: document.getElementById("hudV"), e: document.getElementById("hudE"), ecc: document.getElementById("hudEcc")
  };
  var hint = document.getElementById("simHint");

  function readColors() {
    var cs = getComputedStyle(root);
    colors = ["--cyan-rgb", "--amber-rgb", "--violet-rgb", "--green-rgb"].map(function (k) { return cs.getPropertyValue(k).trim(); });
    if (!colors[0]) colors = ["94,231,255", "255,180,84", "167,139,250", "93,242,166"];
  }

  function resize() {
    var r = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = h / 2;
    L = Math.min(w, h) / 4.4;          // pixels per length unit
    if (!running) draw();
  }

  function accel(x, y) {
    var r2 = x * x + y * y + SOFT * SOFT;
    var inv = 1 / (r2 * Math.sqrt(r2));
    return [-x * inv, -y * inv];
  }

  function make(x, y, vx, vy) {
    var b = { x: x, y: y, vx: vx, vy: vy, trail: [], c: colors[colorIdx++ % colors.length], born: performance.now() };
    bodies.push(b);
    if (bodies.length > MAX_BODIES) bodies.shift();
    selected = b;
    return b;
  }

  // body on an orbit of radius r at angle a; f scales the circular speed (1 = circular)
  function orbit(r, a, f, dir) {
    var vc = Math.sqrt(1 / r) * f * dir;
    return make(Math.cos(a) * r, Math.sin(a) * r, -Math.sin(a) * vc, Math.cos(a) * vc);
  }

  function seed() {
    bodies.length = 0; bursts.length = 0; colorIdx = 0;
    orbit(0.7, -0.6, 1, 1);
    orbit(1.15, 2.4, 0.82, 1);
    orbit(1.62, 4.4, 1, -1);
    selected = bodies[1];
  }

  function stepBodies(dtUnits) {
    var n = Math.max(1, Math.ceil(dtUnits / DT));
    var dt = dtUnits / n;
    for (var k = 0; k < n; k++) {
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var a = accel(b.x, b.y);
        b.vx += a[0] * dt * 0.5; b.vy += a[1] * dt * 0.5;
        b.x += b.vx * dt; b.y += b.vy * dt;
        a = accel(b.x, b.y);
        b.vx += a[0] * dt * 0.5; b.vy += a[1] * dt * 0.5;
      }
    }
    for (var j = bodies.length - 1; j >= 0; j--) {
      var q = bodies[j], r = Math.sqrt(q.x * q.x + q.y * q.y);
      if (r < 0.09) { burst(q); bodies.splice(j, 1); if (selected === q) selected = bodies[bodies.length - 1] || null; }
      else if (r > 6) { bodies.splice(j, 1); if (selected === q) selected = bodies[bodies.length - 1] || null; }
      else { q.trail.push(q.x, q.y); if (q.trail.length > TRAIL * 2) q.trail.splice(0, 2); }
    }
  }

  function burst(b) {
    for (var i = 0; i < 14; i++) {
      var a = Math.random() * 6.283, s = 0.4 + Math.random() * 1.2;
      bursts.push({ x: 0, y: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: b.c });
    }
  }

  function toWorld(px, py) { return [(px - cx) / L, (py - cy) / L]; }

  /* ---------- drawing ---------- */
  function draw() {
    ctx.clearRect(0, 0, w, h);

    // reference rings
    ctx.setLineDash([3, 6]); ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(" + colors[0] + ",0.14)";
    [0.7, 1.15, 1.62].forEach(function (r) { ctx.beginPath(); ctx.arc(cx, cy, r * L, 0, 6.2832); ctx.stroke(); });
    ctx.setLineDash([]);

    // central mass
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, L * 0.42);
    g.addColorStop(0, "rgba(" + colors[1] + ",0.95)");
    g.addColorStop(0.25, "rgba(" + colors[1] + ",0.35)");
    g.addColorStop(1, "rgba(" + colors[1] + ",0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, L * 0.42, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "rgb(" + colors[1] + ")"; ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, L * 0.09), 0, 6.2832); ctx.fill();

    // bodies
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i], tr = b.trail, n = tr.length / 2;
      if (n > 1) {
        var chunks = 4, per = Math.ceil(n / chunks);
        ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (var c = 0; c < chunks; c++) {
          var s = Math.max(0, c * per - 1), e = Math.min(n, (c + 1) * per);
          if (e - s < 2) continue;
          ctx.strokeStyle = "rgba(" + b.c + "," + (0.1 + 0.2 * c + (c === chunks - 1 ? 0.15 : 0)).toFixed(2) + ")";
          ctx.lineWidth = 1 + c * 0.35;
          ctx.beginPath();
          for (var k = s; k < e; k++) {
            var X = cx + tr[k * 2] * L, Y = cy + tr[k * 2 + 1] * L;
            k === s ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
          }
          ctx.stroke();
        }
      }
      var bx = cx + b.x * L, by = cy + b.y * L;
      // velocity vector: the "state" is more than position
      ctx.strokeStyle = "rgba(" + b.c + ",0.9)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + b.vx * L * 0.35, by + b.vy * L * 0.35); ctx.stroke();
      var halo = ctx.createRadialGradient(bx, by, 0, bx, by, 12);
      halo.addColorStop(0, "rgba(" + b.c + ",0.55)"); halo.addColorStop(1, "rgba(" + b.c + ",0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(bx, by, 12, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "rgb(" + b.c + ")"; ctx.beginPath(); ctx.arc(bx, by, 3.6, 0, 6.2832); ctx.fill();
      if (b === selected) {
        ctx.strokeStyle = "rgba(" + b.c + ",0.8)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, 9, 0, 6.2832); ctx.stroke();
      }
    }

    // impact bursts
    for (var m = bursts.length - 1; m >= 0; m--) {
      var p = bursts[m];
      ctx.fillStyle = "rgba(" + p.c + "," + Math.max(0, p.life).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(cx + p.x * L, cy + p.y * L, 2, 0, 6.2832); ctx.fill();
    }

    // aim preview while dragging
    if (drag) drawAim();
  }

  function drawAim() {
    var s = drag.start, c = drag.cur;
    var vx = (c[0] - s[0]) / L * 1.1, vy = (c[1] - s[1]) / L * 1.1;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > 2.2) { vx *= 2.2 / sp; vy *= 2.2 / sp; }
    var w0 = toWorld(s[0], s[1]);
    var x = w0[0], y = w0[1], u = vx, v = vy;

    ctx.strokeStyle = "rgba(" + colors[0] + ",0.9)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgb(" + colors[0] + ")"; ctx.beginPath(); ctx.arc(s[0], s[1], 4, 0, 6.2832); ctx.fill();

    // predicted path: the model "rolls the state forward"
    ctx.fillStyle = "rgba(" + colors[0] + ",0.7)";
    for (var i = 0; i < 260; i++) {
      var a = accel(x, y);
      u += a[0] * 0.015; v += a[1] * 0.015; x += u * 0.03; y += v * 0.03;
      a = accel(x, y); u += a[0] * 0.015; v += a[1] * 0.015;
      if (i % 5 === 0) { ctx.beginPath(); ctx.arc(cx + x * L, cy + y * L, 1.4, 0, 6.2832); ctx.fill(); }
      if (x * x + y * y < 0.01) break;
    }
  }

  function updateHud() {
    if (!hud.x) return;
    var b = selected;
    if (!b) { hud.x.textContent = hud.y.textContent = hud.v.textContent = hud.e.textContent = hud.ecc.textContent = "—"; return; }
    var r = Math.sqrt(b.x * b.x + b.y * b.y), v2 = b.vx * b.vx + b.vy * b.vy;
    var rv = b.x * b.vx + b.y * b.vy, k = v2 - 1 / r;
    var ex = k * b.x - rv * b.vx, ey = k * b.y - rv * b.vy;
    var sgn = function (n) { return (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2); };
    hud.x.textContent = sgn(b.x);
    hud.y.textContent = sgn(-b.y);
    hud.v.textContent = Math.sqrt(v2).toFixed(2);
    hud.e.textContent = sgn(v2 / 2 - 1 / r);
    hud.ecc.textContent = Math.sqrt(ex * ex + ey * ey).toFixed(2);
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    stepBodies(dt * TS);
    for (var i = bursts.length - 1; i >= 0; i--) {
      var p = bursts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.4;
      if (p.life <= 0) bursts.splice(i, 1);
    }
    draw();
    if ((hudTick = (hudTick + 1) % 6) === 0) updateHud();
    rafId = requestAnimationFrame(frame);
  }
  function start() { if (running || !visible || document.hidden) return; running = true; last = performance.now(); rafId = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  /* ---------- interaction ---------- */
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (e.button && e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    var p = pos(e); drag = { start: p, cur: p };
    if (hint) hint.classList.add("is-gone");
  });
  canvas.addEventListener("pointermove", function (e) { if (drag) drag.cur = pos(e); });
  function release(e) {
    if (!drag) return;
    var s = drag.start, c = pos(e), dx = c[0] - s[0], dy = c[1] - s[1];
    var w0 = toWorld(s[0], s[1]);
    var r = Math.max(0.28, Math.sqrt(w0[0] * w0[0] + w0[1] * w0[1]));
    if (Math.sqrt(dx * dx + dy * dy) < 8) {
      // a tap: drop a circular orbit at that radius
      orbit(r, Math.atan2(w0[1], w0[0]), 1, 1);
    } else {
      var vx = dx / L * 1.1, vy = dy / L * 1.1, sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > 2.2) { vx *= 2.2 / sp; vy *= 2.2 / sp; }
      make(w0[0], w0[1], vx, vy);
    }
    drag = null;
    updateHud();
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", function () { drag = null; });

  var add = document.getElementById("simAdd"), reset = document.getElementById("simReset");
  if (add) add.addEventListener("click", function () {
    var dir = Math.random() < 0.5 ? 1 : -1;
    orbit(0.6 + Math.random() * 1.1, Math.random() * 6.283, 0.7 + Math.random() * 0.4, dir);
    if (hint) hint.classList.add("is-gone");
  });
  if (reset) reset.addEventListener("click", function () { seed(); updateHud(); });

  /* ---------- boot ---------- */
  readColors(); resize(); seed(); updateHud(); draw();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.05 }).observe(stage);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  new MutationObserver(function () { readColors(); bodies.forEach(function (b, i) { b.c = colors[i % colors.length]; }); if (!running) draw(); })
    .observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
