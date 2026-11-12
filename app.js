(function () {
  "use strict";

  var TRIPS_KEY = "travelTrips_v1";
  var ENTRIES_KEY = "travelEntries_v1";
  var ACTIVE_TRIP_KEY = "travelActiveTrip_v1";

  // ---------- 저장소 ----------
  function loadJson(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn("불러오기 실패: " + key, e);
      return [];
    }
  }
  function saveJson(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      alert("저장에 실패했습니다: " + e);
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function dateToStr(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function strToDate(s) {
    var p = s.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function todayStr() {
    return dateToStr(new Date());
  }

  var trips = loadJson(TRIPS_KEY);
  var entries = loadJson(ENTRIES_KEY);

  function saveTrips() { saveJson(TRIPS_KEY, trips); }
  function saveEntries() { saveJson(ENTRIES_KEY, entries); }

  var activeTripId = null;
  try { activeTripId = localStorage.getItem(ACTIVE_TRIP_KEY) || null; } catch (e) {}

  function setActiveTripId(id) {
    activeTripId = id;
    try { localStorage.setItem(ACTIVE_TRIP_KEY, id || ""); } catch (e) {}
  }

  function tripsSorted() {
    return trips.slice().sort(function (a, b) {
      return (b.startDate || "") < (a.startDate || "") ? -1 : 1;
    });
  }

  function getEntriesForTrip(tripId) {
    return entries.filter(function (e) { return e.tripId === tripId; })
      .slice()
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  function formatDateRange(trip) {
    if (trip.endDate && trip.endDate !== trip.startDate) {
      return trip.startDate + " ~ " + trip.endDate;
    }
    return trip.startDate || "";
  }

  function entryPreview(entry) {
    var parts = [entry.discovery, entry.connection, entry.selfDiscovery, entry.summary]
      .filter(function (v) { return v && v.trim(); });
    if (!parts.length) return "(빈 기록)";
    return parts.join(" · ").slice(0, 60);
  }

  // ---------- 토스트 ----------
  var toastTimer = null;
  function showToast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  // ---------- 탭 전환 ----------
  var tabButtons = document.querySelectorAll(".tab-btn");
  var tabPanels = document.querySelectorAll(".tab-panel");
  function switchTab(tab) {
    tabButtons.forEach(function (b) { b.classList.toggle("active", b.dataset.tab === tab); });
    tabPanels.forEach(function (p) { p.classList.toggle("active", p.id === "tab-" + tab); });
    try { localStorage.setItem("travelActiveTab_v1", tab); } catch (e) {}
  }
  tabButtons.forEach(function (b) {
    b.addEventListener("click", function () { switchTab(b.dataset.tab); });
  });

  // ---------- 여행 선택 (기록 탭) ----------
  var tripSelect = document.getElementById("tripSelect");
  var entryFormCard = document.getElementById("entryFormCard");
  var entryListCard = document.getElementById("entryListCard");
  var noTripNote = document.getElementById("noTripNote");

  function renderTripSelect() {
    var sorted = tripsSorted();
    tripSelect.innerHTML = "";

    if (!sorted.length) {
      noTripNote.style.display = "";
      entryFormCard.style.display = "none";
      entryListCard.style.display = "none";
      return;
    }
    noTripNote.style.display = "none";
    entryFormCard.style.display = "";
    entryListCard.style.display = "";

    if (!activeTripId || !sorted.some(function (t) { return t.id === activeTripId; })) {
      setActiveTripId(sorted[0].id);
    }

    sorted.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.place + " (" + formatDateRange(t) + ")";
      if (t.id === activeTripId) opt.selected = true;
      tripSelect.appendChild(opt);
    });
  }

  tripSelect.addEventListener("change", function () {
    setActiveTripId(tripSelect.value);
    loadEntryForDate(document.getElementById("eDate").value || todayStr());
    renderEntryList();
  });

  // ---------- 새 여행 추가 ----------
  var newTripForm = document.getElementById("newTripForm");
  document.getElementById("newTripToggleBtn").addEventListener("click", function () {
    newTripForm.classList.toggle("show");
  });

  // 여행은 한 달씩 가는 일이 없으니, 시작일/종료일을 따로따로 입력받는 대신 달력
  // 한 화면에서 시작일 찍고 종료일 찍는 방식으로(관리자님 요청, 2026-11-12).
  var ntCalCursor = new Date();
  var ntRangeStart = null; // Date
  var ntRangeEnd = null; // Date

  function renderNtCalHeader() {
    var dowEl = document.getElementById("ntCalDow");
    if (dowEl.children.length === 0) {
      ["월", "화", "수", "목", "금", "토", "일"].forEach(function (d) {
        var el = document.createElement("div");
        el.className = "cal-dow";
        el.textContent = d;
        dowEl.appendChild(el);
      });
    }
  }

  function renderNtRangeReadout() {
    var el = document.getElementById("ntRangeReadout");
    if (!ntRangeStart) {
      el.textContent = "날짜를 선택해주세요";
    } else if (!ntRangeEnd) {
      el.textContent = dateToStr(ntRangeStart) + " (종료일도 선택하거나, 하루짜리면 그대로 두세요)";
    } else {
      el.textContent = dateToStr(ntRangeStart) + " → " + dateToStr(ntRangeEnd);
    }
    document.getElementById("ntStart").value = ntRangeStart ? dateToStr(ntRangeStart) : "";
    document.getElementById("ntEnd").value = ntRangeEnd ? dateToStr(ntRangeEnd) : "";
  }

  function renderNtCalendar() {
    var y = ntCalCursor.getFullYear(), m = ntCalCursor.getMonth();
    document.getElementById("ntCalTitle").textContent = y + "년 " + (m + 1) + "월";

    var first = new Date(y, m, 1);
    var startOffset = (first.getDay() === 0) ? 6 : first.getDay() - 1;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var todayS = todayStr();

    var grid = document.getElementById("ntCalGrid");
    grid.innerHTML = "";

    for (var i = 0; i < startOffset; i++) {
      var pad = document.createElement("div");
      pad.className = "cal-day empty";
      grid.appendChild(pad);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var dateObj = new Date(y, m, d);
      var dateStr = dateToStr(dateObj);
      var cell = document.createElement("div");
      cell.className = "cal-day";
      if (dateStr === todayS) cell.classList.add("today");

      if (ntRangeStart && dateStr === dateToStr(ntRangeStart)) cell.classList.add("range-start");
      if (ntRangeEnd && dateStr === dateToStr(ntRangeEnd)) cell.classList.add("range-end");
      if (ntRangeStart && ntRangeEnd && dateObj > ntRangeStart && dateObj < ntRangeEnd) cell.classList.add("in-range");

      cell.textContent = d;
      cell.addEventListener("click", function () {
        var clicked = strToDate(this.dataset.date);
        if (!ntRangeStart || (ntRangeStart && ntRangeEnd)) {
          ntRangeStart = clicked;
          ntRangeEnd = null;
        } else if (clicked < ntRangeStart) {
          ntRangeEnd = ntRangeStart;
          ntRangeStart = clicked;
        } else {
          ntRangeEnd = clicked;
        }
        renderNtCalendar();
        renderNtRangeReadout();
      });
      cell.dataset.date = dateStr;

      grid.appendChild(cell);
    }
  }

  document.getElementById("ntPrevMonth").addEventListener("click", function () {
    ntCalCursor = new Date(ntCalCursor.getFullYear(), ntCalCursor.getMonth() - 1, 1);
    renderNtCalendar();
  });
  document.getElementById("ntNextMonth").addEventListener("click", function () {
    ntCalCursor = new Date(ntCalCursor.getFullYear(), ntCalCursor.getMonth() + 1, 1);
    renderNtCalendar();
  });

  // 한 달씩 ◀▶로 넘기는 건 몇 년 전 여행까지 가려면 너무 느려서(관리자님 리포트,
  // 2026-11-12 - "년도 선택이 안돼 월도 그렇고 하나씩 넘기고 있어야되는데"), 달력
  // 제목을 누르면 연도/월을 바로 고를 수 있는 선택칸이 나오게 한다.
  var ntYearSelect = document.getElementById("ntYearSelect");
  var ntMonthSelect = document.getElementById("ntMonthSelect");
  var ntCalJump = document.getElementById("ntCalJump");

  function populateNtJumpSelects() {
    var curY = ntCalCursor.getFullYear();
    var thisY = new Date().getFullYear();
    ntYearSelect.innerHTML = "";
    for (var y = thisY + 1; y >= thisY - 20; y--) {
      var opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y + "년";
      if (y === curY) opt.selected = true;
      ntYearSelect.appendChild(opt);
    }
    var curM = ntCalCursor.getMonth();
    ntMonthSelect.innerHTML = "";
    for (var m = 0; m < 12; m++) {
      var mopt = document.createElement("option");
      mopt.value = m;
      mopt.textContent = (m + 1) + "월";
      if (m === curM) mopt.selected = true;
      ntMonthSelect.appendChild(mopt);
    }
  }

  document.getElementById("ntCalTitle").addEventListener("click", function () {
    populateNtJumpSelects();
    ntCalJump.classList.toggle("show");
  });

  function jumpNtCalFromSelects() {
    ntCalCursor = new Date(parseInt(ntYearSelect.value, 10), parseInt(ntMonthSelect.value, 10), 1);
    renderNtCalendar();
  }
  ntYearSelect.addEventListener("change", jumpNtCalFromSelects);
  ntMonthSelect.addEventListener("change", jumpNtCalFromSelects);

  function resetNtDateRange() {
    ntRangeStart = null;
    ntRangeEnd = null;
    ntCalCursor = new Date();
    ntCalJump.classList.remove("show");
    renderNtCalendar();
    renderNtRangeReadout();
  }

  renderNtCalHeader();
  resetNtDateRange();

  document.getElementById("ntSaveBtn").addEventListener("click", function () {
    var place = document.getElementById("ntPlace").value.trim();
    var start = document.getElementById("ntStart").value;
    var end = document.getElementById("ntEnd").value;
    var retro = document.getElementById("ntRetro").value.trim();

    if (!place) { alert("여행지를 입력해주세요."); return; }
    if (!start) { alert("여행 기간(시작일)을 달력에서 선택해주세요."); return; }

    var trip = {
      id: uid(),
      place: place,
      startDate: start,
      endDate: end || start,
      retro: retro,
      createdAt: new Date().toISOString()
    };
    trips.push(trip);
    saveTrips();
    setActiveTripId(trip.id);

    document.getElementById("ntPlace").value = "";
    document.getElementById("ntRetro").value = "";
    resetNtDateRange();
    newTripForm.classList.remove("show");

    renderAll();
    showToast("여행을 추가했습니다 - 아래에서 그날의 기록을 적어보세요");
    window.scrollTo({ top: entryFormCard.offsetTop - 10, behavior: "smooth" });
  });

  // ---------- 그날의 기록 ----------
  var eDate = document.getElementById("eDate");
  eDate.value = todayStr();

  function loadEntryForDate(dateStr) {
    eDate.value = dateStr;
    var existing = entries.find(function (e) { return e.tripId === activeTripId && e.date === dateStr; });
    document.getElementById("eDiscovery").value = existing ? (existing.discovery || "") : "";
    document.getElementById("eConnection").value = existing ? (existing.connection || "") : "";
    document.getElementById("eSelf").value = existing ? (existing.selfDiscovery || "") : "";
    document.getElementById("eSummary").value = existing ? (existing.summary || "") : "";
  }

  eDate.addEventListener("change", function () {
    loadEntryForDate(eDate.value || todayStr());
  });

  // 같은 여행 + 같은 날짜 기록이 있으면 덮어쓰고, 없으면 새로 만든다 (기록 탭 / 여행 카드 공용)
  function upsertEntry(tripId, date, f) {
    var existing = entries.find(function (e) { return e.tripId === tripId && e.date === date; });
    if (existing) {
      existing.discovery = f.discovery;
      existing.connection = f.connection;
      existing.selfDiscovery = f.selfDiscovery;
      existing.summary = f.summary;
      existing.createdAt = new Date().toISOString();
    } else {
      entries.push({
        id: uid(),
        tripId: tripId,
        date: date,
        discovery: f.discovery,
        connection: f.connection,
        selfDiscovery: f.selfDiscovery,
        summary: f.summary,
        createdAt: new Date().toISOString()
      });
    }
    saveEntries();
  }

  document.getElementById("eSaveBtn").addEventListener("click", function () {
    if (!activeTripId) { alert("먼저 여행을 선택하거나 추가해주세요."); return; }
    upsertEntry(activeTripId, eDate.value || todayStr(), {
      discovery: document.getElementById("eDiscovery").value.trim(),
      connection: document.getElementById("eConnection").value.trim(),
      selfDiscovery: document.getElementById("eSelf").value.trim(),
      summary: document.getElementById("eSummary").value.trim()
    });
    renderAll();
    showToast("기록을 저장했습니다");
  });

  function renderEntryList() {
    var container = document.getElementById("entryList");
    container.innerHTML = "";
    if (!activeTripId) return;
    var list = getEntriesForTrip(activeTripId);
    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "empty-note";
      empty.textContent = "아직 기록이 없습니다.";
      container.appendChild(empty);
      return;
    }
    list.forEach(function (entry) {
      var item = document.createElement("div");
      item.className = "entry-item pick-row" + (selectMode === "entries" && selected[entry.id] ? " picked" : "");

      var box = document.createElement("span");
      box.className = "pick-box";
      box.textContent = "✓";
      item.appendChild(box);

      var main = document.createElement("div");
      main.className = "pick-main";
      var dateEl = document.createElement("div");
      dateEl.className = "entry-date";
      dateEl.textContent = entry.date;
      main.appendChild(dateEl);
      var preview = document.createElement("div");
      preview.className = "entry-preview";
      preview.textContent = entryPreview(entry);
      main.appendChild(preview);
      item.appendChild(main);

      item.addEventListener("click", function () {
        if (selectMode === "entries") { togglePick(entry.id, item); return; }
        loadEntryForDate(entry.date);
        window.scrollTo({ top: entryFormCard.offsetTop - 10, behavior: "smooth" });
      });

      container.appendChild(item);
    });
  }

  // ---------- 휴지통: 선택해서 삭제 ----------
  var selectMode = null; // "trips" | "entries" | null
  var selected = {};
  var deleteBar = document.getElementById("deleteBar");
  var deleteGoBtn = document.getElementById("deleteGoBtn");

  function selectedIds() {
    return Object.keys(selected).filter(function (k) { return selected[k]; });
  }

  function updateDeleteBar() {
    var n = selectedIds().length;
    deleteGoBtn.textContent = "선택한 " + n + "개 삭제";
    deleteGoBtn.disabled = n === 0;
  }

  function togglePick(id, el) {
    selected[id] = !selected[id];
    el.classList.toggle("picked", selected[id]);
    updateDeleteBar();
  }

  function applySelectModeUI() {
    document.querySelectorAll(".trash-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.select === selectMode);
    });
    document.getElementById("tripListByTrip").classList.toggle("select-mode", selectMode === "trips");
    document.getElementById("tripListByYear").classList.toggle("select-mode", selectMode === "trips");
    document.getElementById("entryList").classList.toggle("select-mode", selectMode === "entries");
    deleteBar.classList.toggle("show", !!selectMode);
    document.body.classList.toggle("has-delete-bar", !!selectMode);
    updateDeleteBar();
  }

  function setSelectMode(mode) {
    selectMode = mode;
    selected = {};
    renderAll();
    applySelectModeUI();
    if (mode) showToast(mode === "trips" ? "지울 여행을 눌러서 선택하세요" : "지울 기록을 눌러서 선택하세요");
  }

  document.querySelectorAll(".trash-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      setSelectMode(selectMode === b.dataset.select ? null : b.dataset.select);
    });
  });

  document.getElementById("deleteCancelBtn").addEventListener("click", function () {
    setSelectMode(null);
  });

  deleteGoBtn.addEventListener("click", function () {
    var ids = selectedIds();
    if (!ids.length) return;
    var msg;
    if (selectMode === "trips") {
      var names = trips.filter(function (t) { return selected[t.id]; })
        .map(function (t) { return "· " + t.place + " (" + (t.startDate || "") + ")"; });
      msg = "정말 이 여행 " + ids.length + "개를 지울까요?\n\n" + names.join("\n") +
        "\n\n그 여행의 날짜별 기록도 모두 함께 지워지고, 되돌릴 수 없어요.";
    } else {
      var dates = entries.filter(function (e) { return selected[e.id]; })
        .map(function (e) { return "· " + e.date; });
      msg = "정말 이 기록 " + ids.length + "개를 지울까요?\n\n" + dates.join("\n") + "\n\n되돌릴 수 없어요.";
    }
    if (!confirm(msg)) return;

    if (selectMode === "trips") {
      trips = trips.filter(function (t) { return !selected[t.id]; });
      entries = entries.filter(function (e) { return !selected[e.tripId]; });
      saveTrips();
      if (activeTripId && selected[activeTripId]) setActiveTripId(null);
    } else {
      entries = entries.filter(function (e) { return !selected[e.id]; });
    }
    saveEntries();
    showToast(ids.length + "개를 삭제했습니다");
    setSelectMode(null);
  });

  // ---------- 여행 카드 (여행별 / 연도별 공용) ----------
  var openTripIds = {};      // 다시 그려도 펼친 카드는 펼친 채로
  var editDateByTrip = {};   // 카드마다 마지막으로 고른 날짜

  function datesBetween(start, end) {
    var out = [];
    if (!start) return out;
    var d = strToDate(start);
    var last = strToDate(end || start);
    while (d <= last && out.length < 92) {
      out.push(dateToStr(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  function makeField(labelText, inputEl) {
    var f = document.createElement("div");
    f.className = "field";
    var l = document.createElement("label");
    l.textContent = labelText;
    f.appendChild(l);
    f.appendChild(inputEl);
    return f;
  }

  function makeInput(type, value) {
    var el = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") el.type = type;
    el.value = value || "";
    if (type === "textarea") el.rows = 3;
    return el;
  }

  function buildTripCardEl(trip) {
    var card = document.createElement("div");
    card.className = "trip-card" + (selectMode === "trips" && selected[trip.id] ? " picked" : "");

    var head = document.createElement("div");
    head.className = "trip-head pick-row";
    var box = document.createElement("span");
    box.className = "pick-box";
    box.textContent = "✓";
    head.appendChild(box);
    var place = document.createElement("div");
    place.className = "trip-place pick-main";
    place.textContent = trip.place;
    var dates = document.createElement("div");
    dates.className = "trip-dates";
    dates.textContent = formatDateRange(trip);
    head.appendChild(place);
    head.appendChild(dates);
    card.appendChild(head);

    var retroEl = document.createElement("div");
    var hasRetro = trip.retro && trip.retro.trim();
    retroEl.className = "trip-retro" + (hasRetro ? "" : " placeholder");
    retroEl.textContent = hasRetro ? trip.retro : "아직 소회를 남기지 않았어요. 눌러서 적어보기.";
    card.appendChild(retroEl);

    var tripEntries = getEntriesForTrip(trip.id);
    var meta = document.createElement("div");
    meta.className = "trip-meta";
    meta.textContent = "기록 " + tripEntries.length + "일";
    card.appendChild(meta);

    var foot = document.createElement("div");
    foot.className = "trip-foot";
    var toggleBtn = document.createElement("button");
    toggleBtn.className = "link";
    toggleBtn.type = "button";
    foot.appendChild(toggleBtn);
    card.appendChild(foot);

    var detail = document.createElement("div");
    detail.className = "trip-detail";

    // --- 여행 정보 수정 ---
    var infoSec = document.createElement("div");
    infoSec.className = "trip-section";
    var infoTitle = document.createElement("div");
    infoTitle.className = "trip-section-title";
    infoTitle.textContent = "여행 정보";
    infoSec.appendChild(infoTitle);

    var placeIn = makeInput("text", trip.place);
    var startIn = makeInput("date", trip.startDate);
    var endIn = makeInput("date", trip.endDate || trip.startDate);
    var retroIn = makeInput("textarea", trip.retro);
    infoSec.appendChild(makeField("여행지", placeIn));
    var twoCol = document.createElement("div");
    twoCol.className = "two-col";
    twoCol.appendChild(makeField("시작일", startIn));
    twoCol.appendChild(makeField("종료일", endIn));
    infoSec.appendChild(twoCol);
    infoSec.appendChild(makeField("전체 소회", retroIn));

    var infoSaveBtn = document.createElement("button");
    infoSaveBtn.className = "secondary";
    infoSaveBtn.type = "button";
    infoSaveBtn.textContent = "여행 정보 저장";
    infoSaveBtn.addEventListener("click", function () {
      var p = placeIn.value.trim();
      var s = startIn.value;
      var e = endIn.value || s;
      if (!p) { alert("여행지를 입력해주세요."); return; }
      if (!s) { alert("시작일을 입력해주세요."); return; }
      if (e < s) { var tmp = s; s = e; e = tmp; }
      trip.place = p;
      trip.startDate = s;
      trip.endDate = e;
      trip.retro = retroIn.value.trim();
      saveTrips();
      renderAll();
      showToast("여행 정보를 저장했습니다");
    });
    infoSec.appendChild(infoSaveBtn);
    detail.appendChild(infoSec);

    // --- 그날의 기록 쓰기/수정 ---
    var daySec = document.createElement("div");
    daySec.className = "trip-section";
    var dayTitle = document.createElement("div");
    dayTitle.className = "trip-section-title";
    dayTitle.textContent = "그날의 기록";
    daySec.appendChild(dayTitle);

    var entryByDate = {};
    tripEntries.forEach(function (en) { entryByDate[en.date] = en; });
    var dayList = datesBetween(trip.startDate, trip.endDate);
    tripEntries.forEach(function (en) { if (dayList.indexOf(en.date) === -1) dayList.push(en.date); });
    dayList.sort();

    var dateSel = document.createElement("select");
    dayList.forEach(function (d, i) {
      var opt = document.createElement("option");
      opt.value = d;
      opt.textContent = (i + 1) + "일차 · " + d + (entryByDate[d] ? "  ✓" : "");
      dateSel.appendChild(opt);
    });
    daySec.appendChild(makeField("날짜 (✓ = 이미 쓴 날)", dateSel));

    var discIn = makeInput("textarea");
    var connIn = makeInput("textarea");
    var selfIn = makeInput("textarea");
    var sumIn = makeInput("textarea");
    daySec.appendChild(makeField("여행의 발견 — 새롭게 발견한 장소와 경험", discIn));
    daySec.appendChild(makeField("연결된 것 — 사람이나 세상과 온기를 나눈 순간", connIn));
    daySec.appendChild(makeField("나의 재발견 — 나에 대해 더 알게 된 모습", selfIn));
    daySec.appendChild(makeField("종합소감", sumIn));

    var daysWrap = document.createElement("div");

    function loadDay(d) {
      dateSel.value = d;
      editDateByTrip[trip.id] = d;
      var en = entryByDate[d];
      discIn.value = en ? (en.discovery || "") : "";
      connIn.value = en ? (en.connection || "") : "";
      selfIn.value = en ? (en.selfDiscovery || "") : "";
      sumIn.value = en ? (en.summary || "") : "";
      daysWrap.querySelectorAll(".trip-day").forEach(function (el) {
        el.classList.toggle("editing", el.dataset.date === d);
      });
    }
    dateSel.addEventListener("change", function () { loadDay(dateSel.value); });

    var daySaveBtn = document.createElement("button");
    daySaveBtn.className = "secondary";
    daySaveBtn.type = "button";
    daySaveBtn.textContent = "이 날 기록 저장";
    daySaveBtn.addEventListener("click", function () {
      if (!dateSel.value) { alert("날짜를 선택해주세요."); return; }
      upsertEntry(trip.id, dateSel.value, {
        discovery: discIn.value.trim(),
        connection: connIn.value.trim(),
        selfDiscovery: selfIn.value.trim(),
        summary: sumIn.value.trim()
      });
      renderAll();
      showToast(dateSel.value + " 기록을 저장했습니다");
    });
    daySec.appendChild(daySaveBtn);
    detail.appendChild(daySec);

    // --- 쓴 기록 모아보기 (누르면 위 폼으로 불러옴) ---
    if (tripEntries.length) {
      var listSec = document.createElement("div");
      listSec.className = "trip-section";
      var listTitle = document.createElement("div");
      listTitle.className = "trip-section-title";
      listTitle.textContent = "쓴 기록 (눌러서 수정)";
      listSec.appendChild(listTitle);
      tripEntries.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (entry) {
        var day = document.createElement("div");
        day.className = "trip-day clickable";
        day.dataset.date = entry.date;
        var dateEl = document.createElement("div");
        dateEl.className = "trip-day-date";
        dateEl.textContent = entry.date;
        day.appendChild(dateEl);

        [["발견", entry.discovery], ["연결된 것", entry.connection], ["나의 재발견", entry.selfDiscovery], ["종합소감", entry.summary]]
          .forEach(function (pair) {
            if (!pair[1]) return;
            var f = document.createElement("div");
            f.className = "trip-day-field";
            f.innerHTML = "<b>" + pair[0] + "</b> " + pair[1].replace(/</g, "&lt;");
            day.appendChild(f);
          });

        day.addEventListener("click", function () {
          loadDay(entry.date);
          daySec.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        daysWrap.appendChild(day);
      });
      listSec.appendChild(daysWrap);
      detail.appendChild(listSec);
    }

    card.appendChild(detail);

    // 처음 열 때는 아직 안 쓴 첫날 (다 썼으면 첫날)
    var firstDay = editDateByTrip[trip.id];
    if (!firstDay || dayList.indexOf(firstDay) === -1) {
      firstDay = dayList.find(function (d) { return !entryByDate[d]; }) || dayList[0];
    }
    if (firstDay) loadDay(firstDay);

    function setOpen(open) {
      openTripIds[trip.id] = open;
      detail.classList.toggle("show", open);
      toggleBtn.textContent = open ? "접기" : "✏️ 열어서 쓰기 / 수정";
    }
    setOpen(!!openTripIds[trip.id]);

    toggleBtn.addEventListener("click", function () { setOpen(!detail.classList.contains("show")); });
    retroEl.addEventListener("click", function () {
      if (selectMode) return;
      setOpen(true);
      retroIn.focus();
    });
    card.addEventListener("click", function (ev) {
      if (selectMode !== "trips") return;
      ev.stopPropagation();
      togglePick(trip.id, card);
    });

    return card;
  }

  function renderByTrip() {
    var container = document.getElementById("tripListByTrip");
    container.innerHTML = "";
    var sorted = tripsSorted();
    if (!sorted.length) {
      var empty = document.createElement("div");
      empty.className = "empty-note";
      empty.textContent = "아직 여행이 없습니다. '기록' 탭에서 먼저 추가해줘.";
      container.appendChild(empty);
      return;
    }
    sorted.forEach(function (trip) {
      container.appendChild(buildTripCardEl(trip));
    });
  }

  function renderByYear() {
    var container = document.getElementById("tripListByYear");
    container.innerHTML = "";
    var sorted = tripsSorted();
    if (!sorted.length) {
      var empty = document.createElement("div");
      empty.className = "empty-note";
      empty.textContent = "아직 여행이 없습니다. '기록' 탭에서 먼저 추가해줘.";
      container.appendChild(empty);
      return;
    }
    var byYear = {};
    var years = [];
    sorted.forEach(function (trip) {
      var y = (trip.startDate || "").slice(0, 4) || "미상";
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(trip);
    });
    years.sort(function (a, b) { return a < b ? 1 : -1; });
    years.forEach(function (y) {
      var group = document.createElement("div");
      group.className = "year-group";
      var title = document.createElement("div");
      title.className = "year-title";
      title.textContent = y + "년";
      group.appendChild(title);
      byYear[y].forEach(function (trip) {
        group.appendChild(buildTripCardEl(trip));
      });
      container.appendChild(group);
    });
  }

  // ---------- 백업 ----------
  var LAST_BACKUP_KEY = "travelLastBackupAt_v1";
  var BACKUP_REMIND_DAYS = 7;

  // 마지막 백업 후 7일이 지났으면 상단 배너를 띄운다 (기록이 하나도 없으면 안 띄움)
  function renderBackupStatus() {
    var last = null;
    try { last = localStorage.getItem(LAST_BACKUP_KEY) || null; } catch (e) {}
    var banner = document.getElementById("backupBanner");
    var bannerText = document.getElementById("backupBannerText");
    var lastEl = document.getElementById("backupLast");
    var hasData = trips.length > 0 || entries.length > 0;
    if (!last) {
      bannerText.textContent = "아직 백업을 한 적이 없어요";
      lastEl.textContent = "마지막 백업: 없음";
      banner.classList.toggle("show", hasData);
      return;
    }
    var days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    lastEl.textContent = "마지막 백업: " + last.slice(0, 10) + (days > 0 ? " (" + days + "일 전)" : " (오늘)");
    bannerText.textContent = "마지막 백업 " + days + "일 전";
    banner.classList.toggle("show", hasData && days >= BACKUP_REMIND_DAYS);
  }

  function exportAll() {
    var data = { trips: trips, entries: entries };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "travel_" + todayStr() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch (e) {}
    renderBackupStatus();
    showToast("내보냈습니다");
  }

  document.getElementById("exportBtn").addEventListener("click", exportAll);
  document.getElementById("backupBannerBtn").addEventListener("click", exportAll);

  document.getElementById("importBtn").addEventListener("click", function () {
    document.getElementById("importFile").click();
  });

  document.getElementById("importFile").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var imported = JSON.parse(reader.result);
        var importedTrips = imported.trips || [];
        var importedEntries = imported.entries || [];

        var tripById = {};
        trips.forEach(function (t) { tripById[t.id] = t; });
        importedTrips.forEach(function (t) {
          if (!t.id) t.id = uid();
          tripById[t.id] = t;
        });
        trips = Object.values(tripById);

        var entryById = {};
        entries.forEach(function (en) { entryById[en.id] = en; });
        importedEntries.forEach(function (en) {
          if (!en.id) en.id = uid();
          entryById[en.id] = en;
        });
        entries = Object.values(entryById);

        saveTrips();
        saveEntries();
        renderAll();
        showToast("가져왔습니다 (여행 " + importedTrips.length + ", 기록 " + importedEntries.length + ")");
      } catch (err) {
        alert("가져오기 실패: " + err.message);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  // ---------- 전체 렌더 ----------
  function renderAll() {
    renderTripSelect();
    loadEntryForDate(eDate.value || todayStr());
    renderEntryList();
    renderByTrip();
    renderByYear();
    renderBackupStatus();
  }

  renderAll();

  var savedTab = "write";
  try {
    var st = localStorage.getItem("travelActiveTab_v1");
    if (st === "write" || st === "bytrip" || st === "byyear") savedTab = st;
  } catch (e) {}
  switchTab(savedTab);

  // ---------- 서비스워커 등록 ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function (e) {
        console.warn("서비스워커 등록 실패", e);
      });
    });
  }
})();
