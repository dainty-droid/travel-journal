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

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
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

  document.getElementById("ntSaveBtn").addEventListener("click", function () {
    var place = document.getElementById("ntPlace").value.trim();
    var start = document.getElementById("ntStart").value;
    var end = document.getElementById("ntEnd").value;
    var retro = document.getElementById("ntRetro").value.trim();

    if (!place) { alert("여행지를 입력해주세요."); return; }
    if (!start) { alert("시작일을 입력해주세요."); return; }

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
    document.getElementById("ntStart").value = "";
    document.getElementById("ntEnd").value = "";
    document.getElementById("ntRetro").value = "";
    newTripForm.classList.remove("show");

    renderAll();
    showToast("여행을 추가했습니다");
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

  document.getElementById("eSaveBtn").addEventListener("click", function () {
    if (!activeTripId) { alert("먼저 여행을 선택하거나 추가해주세요."); return; }
    var date = eDate.value || todayStr();
    var discovery = document.getElementById("eDiscovery").value.trim();
    var connection = document.getElementById("eConnection").value.trim();
    var selfDiscovery = document.getElementById("eSelf").value.trim();
    var summary = document.getElementById("eSummary").value.trim();

    var existing = entries.find(function (e) { return e.tripId === activeTripId && e.date === date; });
    if (existing) {
      existing.discovery = discovery;
      existing.connection = connection;
      existing.selfDiscovery = selfDiscovery;
      existing.summary = summary;
      existing.createdAt = new Date().toISOString();
    } else {
      entries.push({
        id: uid(),
        tripId: activeTripId,
        date: date,
        discovery: discovery,
        connection: connection,
        selfDiscovery: selfDiscovery,
        summary: summary,
        createdAt: new Date().toISOString()
      });
    }
    saveEntries();
    renderEntryList();
    renderTripSelect();
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
      item.className = "entry-item";

      var dateEl = document.createElement("div");
      dateEl.className = "entry-date";
      dateEl.textContent = entry.date;
      item.appendChild(dateEl);

      var preview = document.createElement("div");
      preview.className = "entry-preview";
      preview.textContent = entryPreview(entry);
      item.appendChild(preview);

      var actions = document.createElement("div");
      actions.className = "entry-actions";
      var del = document.createElement("button");
      del.className = "danger";
      del.textContent = "삭제";
      del.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (!confirm(entry.date + " 기록을 삭제할까요?")) return;
        entries = entries.filter(function (x) { return x.id !== entry.id; });
        saveEntries();
        renderEntryList();
        if (eDate.value === entry.date) loadEntryForDate(eDate.value);
        showToast("삭제했습니다");
      });
      actions.appendChild(del);
      item.appendChild(actions);

      item.addEventListener("click", function () {
        loadEntryForDate(entry.date);
        window.scrollTo({ top: entryFormCard.offsetTop - 10, behavior: "smooth" });
      });

      container.appendChild(item);
    });
  }

  // ---------- 여행 카드 (여행별 / 연도별 공용) ----------
  function buildTripCardEl(trip) {
    var card = document.createElement("div");
    card.className = "trip-card";

    var head = document.createElement("div");
    head.className = "trip-head";
    var place = document.createElement("div");
    place.className = "trip-place";
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
    toggleBtn.textContent = "자세히 보기";
    var delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.type = "button";
    delBtn.textContent = "여행 삭제";
    foot.appendChild(toggleBtn);
    foot.appendChild(delBtn);
    card.appendChild(foot);

    var detail = document.createElement("div");
    detail.className = "trip-detail";

    var retroLabel = document.createElement("label");
    retroLabel.style.cssText = "display:block;font-size:0.8em;color:var(--muted);margin-bottom:4px;";
    retroLabel.textContent = "전체 소회";
    detail.appendChild(retroLabel);

    var retroInput = document.createElement("textarea");
    retroInput.value = trip.retro || "";
    detail.appendChild(retroInput);

    var retroSaveBtn = document.createElement("button");
    retroSaveBtn.className = "secondary";
    retroSaveBtn.type = "button";
    retroSaveBtn.style.marginTop = "6px";
    retroSaveBtn.textContent = "소회 저장";
    retroSaveBtn.addEventListener("click", function () {
      trip.retro = retroInput.value.trim();
      saveTrips();
      retroEl.textContent = trip.retro ? trip.retro : "아직 소회를 남기지 않았어요. 눌러서 적어보기.";
      retroEl.className = "trip-retro" + (trip.retro ? "" : " placeholder");
      showToast("소회를 저장했습니다");
    });
    detail.appendChild(retroSaveBtn);

    if (tripEntries.length) {
      var daysWrap = document.createElement("div");
      daysWrap.style.marginTop = "12px";
      tripEntries.forEach(function (entry) {
        var day = document.createElement("div");
        day.className = "trip-day";
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

        daysWrap.appendChild(day);
      });
      detail.appendChild(daysWrap);
    }

    card.appendChild(detail);

    toggleBtn.addEventListener("click", function () {
      detail.classList.toggle("show");
      toggleBtn.textContent = detail.classList.contains("show") ? "접기" : "자세히 보기";
    });

    delBtn.addEventListener("click", function () {
      if (!confirm(trip.place + " 여행을 삭제할까요? (그 여행의 모든 기록도 함께 삭제됩니다)")) return;
      trips = trips.filter(function (t) { return t.id !== trip.id; });
      entries = entries.filter(function (e) { return e.tripId !== trip.id; });
      saveTrips();
      saveEntries();
      if (activeTripId === trip.id) setActiveTripId(null);
      renderAll();
      showToast("여행을 삭제했습니다");
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
  document.getElementById("exportBtn").addEventListener("click", function () {
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
    showToast("내보냈습니다");
  });

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
