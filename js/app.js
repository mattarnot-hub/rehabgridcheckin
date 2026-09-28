(function () {
  "use strict";

  var STORAGE_KEY = "rehabgrid.v1";       // offline cache of the shared record
  var THEME_KEY = "rehabgrid.theme";

  var PHASES = [
    { name: "Reset", focus: "Pain relief: calm things down, set the foundation", weeks: 2, visitsPerWeek: 2, length: "30 min" },
    { name: "Rebuild", focus: "Tissue adaptation: restore mobility, reprogram movement", weeks: 2, visitsPerWeek: 1, length: "45 min" },
    { name: "Reload", focus: "Tissue loading: progress strength, power, control", weeks: 2, visitsPerWeek: 1, length: "45 min" },
    { name: "Retrain", focus: "Maintenance: keep your gains, prevent setbacks", weeks: Infinity, visitsPerWeek: null, length: "as needed" }
  ];

  // Home Exercise Program (from the clinic's Home_Exercise_Program handout)
  var HEP = [
    { id: "calf", n: 1, name: "Calf Pin-and-Stretch", area: "Foot / Calf", when: "Any time of day",
      img: "assets/hep-1-calf-pin-and-stretch.png", alt: "Seated with a ball under the calf, pumping the ankle up and down",
      steps: [
        "Sit on a hard floor with a lacrosse ball (or similar firm ball) under your calf.",
        "Rest the weight of your leg on the ball to pin the calf muscle.",
        "While pinned, slowly pull your foot up toward your shin (dorsiflexion), then point it away (plantarflexion).",
        "Move the ball to a new spot along the calf and repeat. Avoid placing the ball directly behind the knee."
      ],
      purpose: "Release calf tension and improve ankle mobility.", dose: "Time: 2 minutes" },
    { id: "plantar", n: 2, name: "Plantar Fascia Rolling", area: "", when: "End of day",
      img: "assets/hep-2-plantar-fascia-rolling.png", alt: "Seated in a chair rolling a ball under the arch of the foot from heel to ball",
      steps: [
        "Sit in a chair with a ball under the sole of your foot.",
        "Roll gently from the heel to the ball of the foot, covering the entire sole.",
        "Keep the pressure light to moderate."
      ],
      purpose: "Reduce tension along the underside of the foot.", dose: "Time: 2 minutes" },
    { id: "hamstring", n: 3, name: "Hamstring Loading with Band", area: "Hip / Hamstring", when: "Lying on your back",
      img: "assets/hep-3-hamstring-loading-band.png", alt: "Lying on the back, driving the heel down against a band while turning the ankle in and out",
      steps: [
        "Lie on your back with the resistance band positioned as shown in clinic.",
        "Drive your heel down into the floor against the band.",
        "While holding the drive, slowly turn the ankle in (inversion) and out (eversion) under control.",
        "Release slowly. Take your time on the way back; the slow release is the most important part."
      ],
      purpose: "Improve hamstring activation and ankle range of motion together.", dose: "Sets: 4 &middot; Reps: 8" },
    { id: "toes", n: 4, name: "Toe Mobility", area: "", when: "End of day",
      img: "assets/hep-4-toe-mobility.png", alt: "Spreading the toes apart, then curling them down and straightening",
      steps: [
        "Sit with your foot resting on the opposite knee.",
        "Using your hand, gently spread the toes apart (splay).",
        "Then gently bend the toes downward (flexion) and hold briefly."
      ],
      purpose: "Reduce tightness in the muscles on top of the foot and toes.", dose: "Time: 2 minutes" }
  ];

  // ---------- offline cache (localStorage mirrors the last known shared record) ----------
  function loadCache() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { logs: {}, startDate: null, freq: {} };
      var parsed = JSON.parse(raw);
      return { logs: parsed.logs || {}, startDate: parsed.startDate || null, freq: parsed.freq || {} };
    } catch (e) {
      return { logs: {}, startDate: null, freq: {} };
    }
  }
  function saveCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ logs: state.logs, startDate: state.startDate, freq: state.freq }));
    } catch (e) { /* private mode / full storage: app still works this session */ }
  }

  // ---------- date helpers ----------
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmtDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(str, n) { var d = new Date(str + "T00:00:00"); d.setDate(d.getDate() + n); return d; }
  function isComplete(rec) { return !!(rec && rec.calfBall && rec.footRoll); }

  var state = loadCache();
  state.todayKey = fmtDate(new Date());

  // ---------- cloud sync state ----------
  var cloud = {
    configured: !!(window.FIREBASE_CONFIG),
    connected: false,     // a live snapshot has arrived at least once
    isOwner: false,       // signed in as the one owner account
    authReady: false,
    docRef: null,
    auth: null,
    signingIn: false,
    authError: ""
  };

  // ---------- derived ----------
  function computeStreak() {
    var cursor = new Date(state.todayKey + "T00:00:00");
    if (!isComplete(state.logs[state.todayKey])) cursor.setDate(cursor.getDate() - 1);
    var streak = 0;
    while (true) {
      var ds = fmtDate(cursor);
      if (isComplete(state.logs[ds])) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    return streak;
  }

  function currentPhaseIndex() {
    if (!state.startDate) return -1;
    var start = new Date(state.startDate + "T00:00:00");
    var now = new Date(state.todayKey + "T00:00:00");
    var daysElapsed = Math.floor((now - start) / 86400000);
    if (daysElapsed < 0) return -1;
    var weeksElapsed = Math.floor(daysElapsed / 7);
    var cum = 0;
    for (var i = 0; i < PHASES.length; i++) {
      cum += PHASES[i].weeks;
      if (weeksElapsed < cum) return i;
    }
    return PHASES.length - 1;
  }

  // can the viewer in front of the page actually edit anything right now?
  function canEdit() { return !cloud.configured || cloud.isOwner; }

  // ---------- markup ----------
  function checkSvg() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="var(--accent-ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function flameSvg() {
    return '<svg class="flame" viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M12 2c1 3-2 4-2 7a3 3 0 1 0 6 0c1.5 1 2.5 3 2.5 5a6.5 6.5 0 1 1-13 0C5.5 10 8 8 8 5c1 1 1.5 1 1.5 0C9.5 4 10.5 2.5 12 2Z" fill="var(--flame)"/></svg>';
  }
  function clockSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';
  }
  function lockSvg() {
    return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>';
  }

  function renderHistory() {
    var out = "";
    for (var i = 6; i >= 0; i--) {
      var d = addDays(state.todayKey, -i);
      var ds = fmtDate(d);
      var rec = state.logs[ds];
      var cls = "history-dot";
      if (isComplete(rec)) cls += " full";
      else if (rec && (rec.calfBall || rec.footRoll)) cls += " half";
      if (ds === state.todayKey) cls += " today";
      out += '<div class="history-day"><div class="' + cls + '"></div><span>' +
        d.toLocaleDateString(undefined, { weekday: "narrow" }) + "</span></div>";
    }
    return out;
  }

  function renderRoadmap() {
    var curIdx = currentPhaseIndex();
    var out = "";
    PHASES.forEach(function (p, i) {
      var meta = p.visitsPerWeek
        ? (p.weeks === Infinity ? "" : p.weeks + " wks &middot; " + p.visitsPerWeek + "x/wk<br>") + p.length
        : "as needed<br>" + p.length;
      out += '<div class="phase' + (i === curIdx ? " current" : "") + '">' +
        '<span class="p-num">' + (i + 1) + "</span>" +
        '<span class="p-name">' + p.name + "</span>" +
        '<span class="p-meta">' + meta + "</span>" +
        '<span class="p-focus">' + p.focus + "</span>" +
        "</div>";
    });
    return out;
  }

  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  function renderHep() {
    var out = "";
    HEP.forEach(function (x) {
      out += '<article class="hep card">' +
        '<div class="hep-top"><span class="hep-num">' + x.n + '</span>' +
          '<div class="hep-title"><h3>' + x.name + '</h3>' +
          '<div class="hep-tags">' + (x.area ? '<span class="tag">' + x.area + '</span>' : '') + '<span class="tag when">' + x.when + '</span></div></div></div>' +
        '<img class="hep-img" src="' + x.img + '" alt="' + esc(x.alt) + '" width="1400" height="800" loading="lazy">' +
        '<ol class="hep-steps">' + x.steps.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ol>' +
        '<p class="hep-purpose"><b>Purpose:</b> ' + x.purpose + '</p>' +
        '<div class="hep-dose"><span>' + x.dose + '</span>' +
          '<label>Frequency: <input type="text" class="freq" data-id="' + x.id + '" maxlength="40" placeholder="e.g. 2x daily" value="' + esc(state.freq[x.id] || "") + '"' + (canEdit() ? "" : " disabled") + '></label></div>' +
      '</article>';
    });
    return out;
  }

  function planStartLabel() {
    if (state.startDate) {
      return "Started " + new Date(state.startDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
    return "Set your start date to track your phase";
  }

  function renderSyncBadge() {
    if (!cloud.configured) return "";
    if (cloud.isOwner) return '<span class="sync-badge owner">' + lockSvg() + ' live &mdash; you can edit</span>';
    if (cloud.connected) return '<span class="sync-badge">' + flameSvg() + ' live from Matt’s device</span>';
    return '<span class="sync-badge pending">connecting&hellip;</span>';
  }

  function renderOwnerBox() {
    if (!cloud.configured) {
      return '<div class="privacy">This is a local preview build &mdash; cloud sync isn’t configured yet, so check-ins stay on this device only.</div>';
    }
    if (cloud.isOwner) {
      return '<div class="ownerbox">' +
        '<span class="owner-pill">' + lockSvg() + ' Signed in as owner &mdash; your changes publish live to everyone</span>' +
        '<button class="link" id="signout-btn" type="button">sign out</button>' +
      '</div>';
    }
    return '<div class="ownerbox">' +
      '<button class="link" id="signin-toggle" type="button">Owner sign-in</button>' +
      '<form id="signin-form" hidden>' +
        '<input type="email" id="signin-email" placeholder="email" autocomplete="username" required>' +
        '<input type="password" id="signin-password" placeholder="password" autocomplete="current-password" required>' +
        '<button type="submit">' + (cloud.signingIn ? "signing in…" : "sign in") + '</button>' +
      '</form>' +
      (cloud.authError ? '<div class="auth-error">' + esc(cloud.authError) + '</div>' : '') +
    '</div>';
  }

  function render() {
    var today = state.logs[state.todayKey] || {};
    var bothDone = isComplete(today);
    var streak = computeStreak();
    var editable = canEdit();

    document.getElementById("app").innerHTML =
      '<div>' +
        '<div class="brand eyebrow"><span>The Rehab Grid</span><span class="mono">' +
          new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
        '</span></div>' +
        '<h1>Matt&rsquo;s Recovery Plan</h1>' +
        '<p class="lede">Main concern: <b>Plantar fasciitis</b>, with hamstring &amp; calf strength work. Daily home care keeps the gains from each in-clinic session.</p>' +
        renderSyncBadge() +
      '</div>' +

      '<div class="card streak-card">' +
        '<span class="streak-num mono">' + streak + '</span>' +
        '<div class="streak-body">' +
          '<div class="streak-label">' + flameSvg() + '<span>day streak</span></div>' +
          '<div class="history">' + renderHistory() + '</div>' +
        '</div>' +
      '</div>' +

      '<section>' +
        '<div class="section-head"><h2>Today&rsquo;s Home Care</h2><span class="hint">' + (editable ? (bothDone ? "done for today ✓" : "tap to check off") : "Matt’s progress — read-only") + '</span></div>' +
        '<div class="exercise-list">' +
          '<button class="exercise" data-key="calfBall" data-done="' + !!today.calfBall + '" type="button"' + (editable ? "" : " disabled") + '>' +
            '<span class="box">' + checkSvg() + '</span>' +
            '<span class="txt"><div class="name">Calf ball release</div><div class="why">Eases calf tightness feeding the plantar fascia</div></span>' +
          '</button>' +
          '<button class="exercise" data-key="footRoll" data-done="' + !!today.footRoll + '" type="button"' + (editable ? "" : " disabled") + '>' +
            '<span class="box">' + checkSvg() + '</span>' +
            '<span class="txt"><div class="name">Foot rolling</div><div class="why">Mobilizes the plantar fascia under the arch</div></span>' +
          '</button>' +
        '</div>' +
        '<div class="note">From your Treatment Plan &mdash; At-Home Priorities. No other lifestyle changes were noted.</div>' +
      '</section>' +

      '<section>' +
        '<div class="section-head"><h2>Home Exercise Program</h2><span class="hint">Karim Hanna, BKin, PT</span></div>' +
        '<p class="hep-intro">Complete these exercises as prescribed. Mild pressure or stretch is expected; stop and contact us if you feel sharp pain, numbness or tingling.</p>' +
        '<div class="hep-list">' + renderHep() + '</div>' +
      '</section>' +

      '<section>' +
        '<div class="section-head"><h2>Your Goals</h2></div>' +
        '<ol class="goals">' +
          '<li><span class="num">1</span><span class="txt">Pain-free in daily activities<small>&radic; Pain in ADLs, resolved</small></span></li>' +
          '<li><span class="num">2</span><span class="txt">Not dependent on orthotics<small>Build enough strength &amp; mobility to go without</small></span></li>' +
          '<li><span class="num">3</span><span class="txt">Play volleyball or basketball this winter<small>The finish line for this plan</small></span></li>' +
        '</ol>' +
      '</section>' +

      '<section>' +
        '<div class="section-head"><h2>Contributing Factors</h2></div>' +
        '<div class="chips">' +
          '<span class="chip on">Hamstring tightness</span>' +
          '<span class="chip on">Calf tightness</span>' +
          '<span class="chip on">Right ankle dorsiflexion</span>' +
        '</div>' +
      '</section>' +

      '<section>' +
        '<div class="section-head"><h2>Your Road Map</h2></div>' +
        '<div class="plan-start">' +
          '<span id="plan-start-text">' + planStartLabel() + '</span>' +
          (editable ? '<button class="link" id="set-start-btn" type="button">set</button><input type="date" id="start-date-input" hidden />' : '') +
        '</div>' +
        '<div class="roadmap">' + renderRoadmap() + '</div>' +
      '</section>' +

      '<div class="card next-session">' + clockSvg() +
        '<div><div class="lbl">Next session &mdash; what to expect</div><div class="val">Dry needling</div></div>' +
      '</div>' +

      '<div class="card in-clinic">' +
        '<div class="section-head"><h2>Treated In-Clinic</h2><span class="hint">reference only</span></div>' +
        '<div class="chips">' +
          '<span class="chip">Manual therapy</span>' +
          '<span class="chip">Dry needling (Gunn IMS)</span>' +
          '<span class="chip">Neurofunctional electroacupuncture</span>' +
          '<span class="chip">Cupping</span>' +
          '<span class="chip">Strength training</span>' +
          '<span class="chip">Corrective exercises</span>' +
        '</div>' +
      '</div>' +

      '<footer>' +
        '<div class="clinic-name">The Rehab Grid &mdash; Physiotherapy &amp; Sports Performance</div>' +
        '<div>Know Better. Move Better. Feel Better. &middot; therehabgrid.com &middot; karim@therehabgrid.com</div>' +
        "<div>24 hrs&rsquo; notice to cancel or reschedule, or the visit is billed in full.</div>" +
        '<div class="locations">' +
          '<div><b>North York</b><br>101&ndash;1865 Leslie St, M3B 2M5<br>647-955-6223</div>' +
          '<div><b>Stouffville</b><br>100&ndash;37 Sandiford Dr, L4A 3Z2<br>289-401-5033</div>' +
        '</div>' +
        (cloud.configured
          ? '<div class="privacy">Anyone with this link sees Matt’s real check-in history, live. Only the signed-in owner can change it.</div>'
          : '') +
        renderOwnerBox() +
      '</footer>';

    wireEvents();
  }

  // ---------- writes ----------
  // Applies a mutation locally (optimistic), then persists it either to the
  // cloud doc (if signed in as owner) or to the offline cache (local-only mode).
  function commit(mutator) {
    if (!canEdit()) return; // read-only visitors can't get here via the UI, but guard anyway
    mutator();
    saveCache();
    render();
    if (cloud.configured && cloud.docRef && cloud.isOwner) {
      cloud.docRef.set({
        logs: state.logs,
        startDate: state.startDate,
        freq: state.freq,
        updatedAt: new Date().toISOString()
      }, { merge: false }).catch(function (err) {
        console.error("sync failed, kept locally:", err);
      });
    }
  }

  function toggle(key) {
    commit(function () {
      var today = Object.assign({}, state.logs[state.todayKey] || {});
      today[key] = !today[key];
      today.date = state.todayKey;
      state.logs[state.todayKey] = today;
    });
  }

  function wireEvents() {
    var list = document.querySelector(".exercise-list");
    if (list) {
      list.addEventListener("click", function (e) {
        var btn = e.target.closest(".exercise");
        if (!btn || btn.disabled) return;
        toggle(btn.getAttribute("data-key"));
      });
    }
    document.querySelectorAll(".freq").forEach(function (inp) {
      inp.addEventListener("change", function () {
        if (inp.disabled) return;
        commit(function () { state.freq[inp.getAttribute("data-id")] = inp.value.trim(); });
      });
    });
    var setBtn = document.getElementById("set-start-btn");
    var input = document.getElementById("start-date-input");
    if (setBtn && input) {
      setBtn.addEventListener("click", function () {
        input.hidden = false;
        input.value = state.startDate || state.todayKey;
        input.focus();
        if (input.showPicker) { try { input.showPicker(); } catch (e) { } }
      });
      input.addEventListener("change", function (e) {
        var val = e.target.value;
        if (!val) return;
        commit(function () { state.startDate = val; });
      });
    }

    // owner sign-in / sign-out
    var toggleBtn = document.getElementById("signin-toggle");
    var form = document.getElementById("signin-form");
    if (toggleBtn && form) {
      toggleBtn.addEventListener("click", function () {
        form.hidden = !form.hidden;
        if (!form.hidden) document.getElementById("signin-email").focus();
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!cloud.auth) return;
        var email = document.getElementById("signin-email").value.trim();
        var pass = document.getElementById("signin-password").value;
        cloud.signingIn = true;
        cloud.authError = "";
        render();
        cloud.auth.signInWithEmailAndPassword(email, pass).catch(function (err) {
          cloud.authError = "Sign-in failed — check email and password.";
          console.error(err);
        }).then(function () {
          cloud.signingIn = false;
          render();
        });
      });
    }
    var signoutBtn = document.getElementById("signout-btn");
    if (signoutBtn) {
      signoutBtn.addEventListener("click", function () {
        if (cloud.auth) cloud.auth.signOut();
      });
    }
  }

  // ---------- theme toggle ----------
  function initTheme() {
    var btn = document.getElementById("theme");
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { }
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
    if (btn) {
      btn.addEventListener("click", function () {
        var current = document.documentElement.getAttribute("data-theme");
        var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        var effectiveDark = current ? current === "dark" : prefersDark;
        var next = effectiveDark ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { }
      });
    }
  }

  // ---------- cloud boot ----------
  function initCloud() {
    if (!cloud.configured || typeof firebase === "undefined") { render(); return; }
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      cloud.auth = firebase.auth();
      var firestore = firebase.firestore();
      cloud.docRef = firestore.collection("public").doc("rehabgrid");

      cloud.docRef.onSnapshot(function (snap) {
        cloud.connected = true;
        if (snap.exists) {
          var data = snap.data();
          // Never let a stale/empty cloud read blank out what the owner is mid-typing.
          state.logs = data.logs || {};
          state.startDate = data.startDate || null;
          state.freq = data.freq || {};
          saveCache();
        }
        render();
      }, function (err) {
        console.error("Firestore subscription error:", err);
        render(); // fall back to whatever is in the offline cache
      });

      cloud.auth.onAuthStateChanged(function (user) {
        cloud.isOwner = !!user;
        cloud.authReady = true;
        render();
      });
    } catch (e) {
      console.error("Firebase init failed, running local-only:", e);
      cloud.configured = false;
      render();
    }
  }

  initTheme();
  render();       // first paint from cache, instantly
  initCloud();    // then upgrade to the live shared record
})();
