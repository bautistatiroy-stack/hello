/* ==========================================
   GOOGLE APPS SCRIPT CONNECTION
========================================== */

const API_URL =
"https://script.google.com/macros/s/AKfycbz7gyrIPi-vjPnzzxqlOcQZuihAguEvw3gQm69QeuEJvRKO2E84f-D4-jWni4rR17-bUg/exec";

let allLogs = [];
let isLoading = false;


/* ==========================================
   INITIALIZE DASHBOARD
========================================== */

document.addEventListener("DOMContentLoaded", function() {

    updateCurrentDate();

    loadDashboard();

    // Automatic refresh every 10 seconds.
    setInterval(function() {
        loadDashboard();
    }, 10000);

    document.getElementById("refreshButton")
        .addEventListener("click", loadDashboard);

    document.getElementById("dateFilter")
        .addEventListener("change", filterRecords);

    document.getElementById("searchInput")
        .addEventListener("input", filterRecords);

    document.getElementById("clearFilters")
        .addEventListener("click", clearFilters);

    document.getElementById("menuToggle")
        .addEventListener("click", function() {
            document.getElementById("sidebar")
                .classList.toggle("show");
        });

});


/* ==========================================
   CURRENT DATE
========================================== */

function updateCurrentDate() {

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("en-PH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

}


/* ==========================================
   REQUEST GOOGLE APPS SCRIPT
   JSONP CONNECTION
========================================== */

function requestAPI(callback) {

    if (isLoading) return;

    isLoading = true;

    const callbackName =
        "waterAdminCallback_" +
        Date.now() + "_" +
        Math.floor(Math.random() * 100000);

    const script = document.createElement("script");

    let finished = false;
    let timeout;

    function finish() {

        if (finished) return;

        finished = true;

        clearTimeout(timeout);

        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }

        try {
            delete window[callbackName];
        } catch (error) {
            window[callbackName] = undefined;
        }

        isLoading = false;

    }

    window[callbackName] = function(data) {

        finish();

        callback(data);

    };

    script.onerror = function() {

        finish();

        showConnection(false);

        console.error("Unable to connect to Google Apps Script.");

    };

    timeout = setTimeout(function() {

        finish();

        showConnection(false);

        console.error("API request timed out.");

    }, 15000);

    script.src =
        API_URL +
        "?callback=" + encodeURIComponent(callbackName) +
        "&_=" + Date.now();

    document.body.appendChild(script);

}


/* ==========================================
   LOAD DASHBOARD DATA
========================================== */

function loadDashboard() {

    if (isLoading) return;

    requestAPI(function(response) {

        if (!response || response.success !== true) {

            showConnection(false);

            return;
        }

        allLogs = Array.isArray(response.logs)
            ? response.logs
            : [];

        showConnection(true);

        updateSummary(allLogs);

        updateSensors(allLogs);

        filterRecords();

        document.getElementById("lastUpdated").textContent =
            new Date().toLocaleTimeString("en-PH");

    });

}


/* ==========================================
   CONNECTION STATUS
========================================== */

function showConnection(connected) {

    const text =
        document.getElementById("connectionText");

    const dot =
        document.querySelector(".online-dot");

    if (connected) {

        text.textContent = "Connected";

        dot.style.background = "#16a34a";

    } else {

        text.textContent = "Disconnected";

        dot.style.background = "#dc2626";

    }

}


/* ==========================================
   UPDATE SUMMARY CARDS
========================================== */

function updateSummary(logs) {

    document.getElementById("totalRecords").textContent =
        logs.length.toLocaleString();

    if (logs.length === 0) {

        document.getElementById("currentStatus").textContent = "--";

        document.getElementById("activeSensors").textContent = "0 / 6";

        document.getElementById("lastMonitoring").textContent = "--";

        return;
    }

    const latest = logs[0];

    const status =
        String(latest.Status || "UNKNOWN").toUpperCase();

    const statusElement =
        document.getElementById("currentStatus");

    statusElement.textContent = status;

    statusElement.style.color = getStatusColor(status);

    const date = new Date(latest.Timestamp);

    document.getElementById("lastMonitoring").textContent =
        isNaN(date.getTime())
            ? "--"
            : date.toLocaleString("en-PH");

}


/* ==========================================
   SENSOR MONITORING
========================================== */

function updateSensors(logs) {

    if (logs.length === 0) {

        for (let i = 1; i <= 3; i++) {

            document.getElementById("level" + i).textContent = "--";

            document.getElementById("sensorStatus" + i).textContent =
                "No data";

            document.getElementById("sensorBox" + i)
                .className = "sensor-card";

        }

        return;
    }

    const latest = logs[0];

    let activeCount = 0;

    for (let i = 1; i <= 3; i++) {

        const value = Number(latest["Level" + i]) || 0;

        const box =
            document.getElementById("sensorBox" + i);

        const level =
            document.getElementById("level" + i);

        const sensorStatus =
            document.getElementById("sensorStatus" + i);

        if (value === 1) {

            activeCount++;

            level.textContent = "WET";

            sensorStatus.textContent = "Water detected";

            box.className = "sensor-card active";

        } else {

            level.textContent = "DRY";

            sensorStatus.textContent = "No water detected";

            box.className = "sensor-card inactive";

        }

    }

    document.getElementById("activeSensors").textContent =
        activeCount + " / 3";

}


/* ==========================================
   STATUS COLORS
========================================== */

function getStatusColor(status) {

    if (
        status.includes("GOOD") ||
        status.includes("NORMAL")
    ) {
        return "#16a34a";
    }

    if (status.includes("WARNING")) {
        return "#d97706";
    }

    if (
        status.includes("EVACUATE") ||
        status.includes("DANGER") ||
        status.includes("CRITICAL")
    ) {
        return "#dc2626";
    }

    return "#829ab1";

}


/* ==========================================
   STATUS BADGE
========================================== */

function getStatusClass(status) {

    const value = String(status || "").toUpperCase();

    if (
        value.includes("GOOD") ||
        value.includes("NORMAL")
    ) {
        return "status-normal";
    }

    if (value.includes("WARNING")) {
        return "status-warning";
    }

    if (
        value.includes("EVACUATE") ||
        value.includes("DANGER") ||
        value.includes("CRITICAL")
    ) {
        return "status-danger";
    }

    return "status-unknown";

}


/* ==========================================
   DATE FORMAT
========================================== */

function formatDate(value) {

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return String(value || "--");
    }

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

}


/* ==========================================
   DATE FILTER + SEARCH
========================================== */

function filterRecords() {

    const selectedDate =
        document.getElementById("dateFilter").value;

    const search =
        document.getElementById("searchInput")
            .value.toLowerCase().trim();

    const filtered = allLogs.filter(function(log) {

        const date = new Date(log.Timestamp);

        if (isNaN(date.getTime())) return false;

        // Local date comparison.
        const localDate =
            date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0");

        const matchDate =
            !selectedDate || localDate === selectedDate;

        const searchable = [
            log.Timestamp,
            log.Status,
            log.Test,
            log.Level1,
            log.Level2,
            log.Level3,
            log.Level4,
            log.Level5,
            log.Level6
        ].join(" ").toLowerCase();

        const matchSearch =
            !search || searchable.includes(search);

        return matchDate && matchSearch;

    });

    renderHistory(filtered);

}


/* ==========================================
   RENDER MONITORING HISTORY
========================================== */

function renderHistory(logs) {

    const table =
        document.getElementById("historyTable");

    table.replaceChildren();

    document.getElementById("recordCount").textContent =
        logs.length + " Records";

    document.getElementById("showingRecords").textContent =
        "Showing " + logs.length + " of " + allLogs.length + " records";

    if (logs.length === 0) {

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 9;

        cell.className = "empty";

        cell.textContent = "No monitoring records found.";

        row.appendChild(cell);

        table.appendChild(row);

        return;
    }

    logs.forEach(function(log) {

        const row = document.createElement("tr");

        addCell(row, formatDate(log.Timestamp));

        for (let i = 1; i <= 3; i++) {

            const value = Number(log["Level" + i]) || 0;

            addCell(row, value ? "WET" : "DRY");

        }

        const statusCell = document.createElement("td");

        const badge = document.createElement("span");

        badge.className =
            "status-badge " + getStatusClass(log.Status);

        badge.textContent = log.Status || "UNKNOWN";

        statusCell.appendChild(badge);

        row.appendChild(statusCell);

        addCell(row, log.Test || "NO");

        table.appendChild(row);

    });

}


/* ==========================================
   CREATE TABLE CELL
========================================== */

function addCell(row, value) {

    const cell = document.createElement("td");

    cell.textContent = value;

    row.appendChild(cell);

}


/* ==========================================
   CLEAR FILTERS
========================================== */

function clearFilters() {

    document.getElementById("dateFilter").value = "";

    document.getElementById("searchInput").value = "";

    filterRecords();

}