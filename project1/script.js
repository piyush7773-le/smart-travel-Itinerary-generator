// ========= CONFIG: PUT YOUR API KEYS HERE =========
const OPENWEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY_HERE";
const UNSPLASH_ACCESS_KEY = "YOUR_UNSPLASH_ACCESS_KEY_HERE";

// ========= UTILITIES =========
const $ = (id) => document.getElementById(id);

function formatDate(date) {
  const opts = { weekday: "short", day: "numeric", month: "short" };
  return date.toLocaleDateString(undefined, opts);
}

function diffDays(start, end) {
  const ms = end - start;
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

// Simple activities based on theme
function getActivitiesForTheme(theme) {
  switch (theme) {
    case "relax":
      return [
        "Morning: Slow breakfast at a local café",
        "Afternoon: Relax at a scenic viewpoint or park",
        "Evening: Sunset walk & dessert spot",
      ];
    case "adventure":
      return [
        "Morning: Trek / hike to a nearby viewpoint",
        "Afternoon: Adventure activity (rafting, biking, paragliding if available)",
        "Evening: Explore local street food spots",
      ];
    case "food":
      return [
        "Morning: Try famous breakfast dish in old town",
        "Afternoon: Café hopping & local snacks",
        "Evening: Dinner at a highly-rated local restaurant",
      ];
    case "culture":
      return [
        "Morning: Visit historical monument / temple / museum",
        "Afternoon: Explore local markets & handicrafts",
        "Evening: Attend a cultural show or traditional food tasting",
      ];
    default:
      return [
        "Morning: City orientation walk / short tour",
        "Afternoon: Explore a popular attraction",
        "Evening: Find the best view spot & local dinner",
      ];
  }
}

// ========= MAIN LOGIC =========
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const generateBtn = $("generateBtn");
  const printBtn = $("printBtn");
  const themeToggle = $("themeToggle");
  const itineraryEl = $("itinerary");
  const errorMsgEl = $("errorMsg");
  const tripSummaryEl = $("tripSummary");
  const mapFrame = $("mapFrame");

  // Default theme
  body.classList.add("dark");

  // Theme toggle
  themeToggle.addEventListener("click", () => {
    body.classList.toggle("light");
    const isLight = body.classList.contains("light");
    themeToggle.textContent = isLight ? "🌞" : "🌙";
  });

  // Print as PDF
  printBtn.addEventListener("click", () => {
    window.print();
  });

  // Generate itinerary
  generateBtn.addEventListener("click", async () => {
    const dest = $("destination").value.trim();
    const startVal = $("startDate").value;
    const endVal = $("endDate").value;
    const theme = $("tripTheme").value;
    const travelers = $("travelers").value || 1;

    errorMsgEl.textContent = "";
    itineraryEl.innerHTML = "";

    if (!dest || !startVal || !endVal) {
      errorMsgEl.textContent = "Please fill in destination and both dates.";
      return;
    }

    const start = new Date(startVal);
    const end = new Date(endVal);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errorMsgEl.textContent = "Please select valid dates.";
      return;
    }

    if (end < start) {
      errorMsgEl.textContent = "End date must be after start date.";
      return;
    }

    const days = diffDays(start, end);

    // Update summary
    updateTripSummary({
      dest,
      start,
      end,
      days,
      theme,
      travelers,
    });

    // Update map embed (no API key needed)
    updateMap(dest);

    // Fetch weather once and reuse for all days
    let weatherData = null;
    try {
      weatherData = await fetchWeather(dest);
    } catch (err) {
      console.warn("Weather fetch failed:", err);
    }

    // Fetch photo once
    let photoUrl = null;
    try {
      photoUrl = await fetchPhoto(dest);
    } catch (err) {
      console.warn("Photo fetch failed:", err);
    }

    // Build itinerary
    const activities = getActivitiesForTheme(theme);
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const card = buildDayCard({
        dayNumber: i + 1,
        dateObj: d,
        dest,
        activities,
        weather: weatherData,
        photoUrl,
      });

      fragment.appendChild(card);
    }

    itineraryEl.appendChild(fragment);

    // Animate cards with GSAP
    animateItineraryCards();
  });

  // ========= SUMMARY =========
  function updateTripSummary({ dest, start, end, days, theme, travelers }) {
    const themeNames = {
      relax: "Relax & Chill",
      adventure: "Adventure & Trek",
      food: "Food & Cafes",
      culture: "Culture & Heritage",
      mixed: "Mixed Adventure",
    };

    tripSummaryEl.innerHTML = `
      <h2>Trip Overview</h2>
      <p>
        You're planning a <strong>${days}-day</strong> trip to
        <strong>${dest}</strong> for <strong>${travelers}</strong> traveler${travelers > 1 ? "s" : ""}.
      </p>
      <div class="summary-details">
        <p>
          <span class="day-section-label">Dates</span><br/>
          ${formatDate(start)} → ${formatDate(end)}
        </p>
        <div class="summary-pill-row">
          <span class="pill">Theme: ${themeNames[theme] || "Mixed"}</span>
          <span class="pill">Auto itinerary</span>
          <span class="pill">Weather & photos</span>
        </div>
      </div>
    `;
  }

  // ========= MAP =========
  function updateMap(dest) {
    const base = "https://www.google.com/maps";
    const q = encodeURIComponent(dest);
    // Free embed using query
    mapFrame.src = `${base}?q=${q}&output=embed`;
  }

  // ========= WEATHER API =========
  async function fetchWeather(city) {
    if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === "96116efe9e3ef794b31c5ef096127d65") {
      console.warn("OpenWeather API key not set.");
      return null;
    }
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&units=metric&appid=${OPENWEATHER_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API error");
    const data = await res.json();

    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      desc: data.weather?.[0]?.description || "",
      icon: data.weather?.[0]?.icon || null,
    };
  }

  // ========= UNSPLASH PHOTO =========
  async function fetchPhoto(query) {
    if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === "8601UpPbhafn_PrasGlAmXrCHyBD_20ysmMySLW6ln8") {
      console.warn("Unsplash API key not set.");
      return null;
    }
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query + " travel city"
    )}&orientation=landscape&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Unsplash API error");
    const data = await res.json();
    const first = data.results?.[0];
    return first?.urls?.regular || null;
  }

  // ========= BUILD DAY CARD =========
  function buildDayCard({ dayNumber, dateObj, dest, activities, weather, photoUrl }) {
    const card = document.createElement("article");
    card.className = "day-card";

    const header = document.createElement("div");
    header.className = "day-header";

    const title = document.createElement("div");
    title.className = "day-title";
    title.textContent = `Day ${dayNumber} • ${dest}`;

    const dateSpan = document.createElement("div");
    dateSpan.className = "day-date";
    dateSpan.textContent = formatDate(dateObj);

    header.appendChild(title);
    header.appendChild(dateSpan);

    const body = document.createElement("div");
    body.className = "day-body";

    const left = document.createElement("div");
    left.className = "day-text";

    // Activities
    const actLabel = document.createElement("div");
    actLabel.className = "day-section-label";
    actLabel.textContent = "Plan for the day";

    const ul = document.createElement("ul");
    ul.className = "activity-list";

    activities.forEach((a) => {
      const li = document.createElement("li");
      li.textContent = a;
      ul.appendChild(li);
    });

    // Weather
    const weatherWrapper = document.createElement("div");
    weatherWrapper.style.marginTop = "8px";

    const wLabel = document.createElement("div");
    wLabel.className = "day-section-label";
    wLabel.textContent = "Weather snapshot";

    const chip = document.createElement("div");
    chip.className = "weather-chip";

    if (weather) {
      if (weather.icon) {
        const img = document.createElement("img");
        img.className = "weather-icon-img";
        img.alt = "Weather icon";
        img.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
        chip.appendChild(img);
      }
      const tempSpan = document.createElement("span");
      tempSpan.className = "weather-temp";
      tempSpan.textContent = `${weather.temp}°C`;
      const descSpan = document.createElement("span");
      descSpan.textContent = `• ${weather.desc}`;
      chip.appendChild(tempSpan);
      chip.appendChild(descSpan);
    } else {
      chip.textContent = "Weather unavailable (API key missing)";
    }

    weatherWrapper.appendChild(wLabel);
    weatherWrapper.appendChild(chip);

    left.appendChild(actLabel);
    left.appendChild(ul);
    left.appendChild(weatherWrapper);

    // Photo area
    const right = document.createElement("div");
    right.className = "day-photo";

    if (photoUrl) {
      right.style.backgroundImage = `url('${photoUrl}')`;
      right.textContent = "";
      right.style.color = "#fff";
      right.style.fontSize = "0.7rem";

      const overlay = document.createElement("div");
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.background =
        "linear-gradient(to top, rgba(0,0,0,0.9), transparent 65%)";

      const text = document.createElement("div");
      text.style.position = "absolute";
      text.style.bottom = "6px";
      text.style.left = "8px";
      text.textContent = dest;

      overlay.appendChild(text);
      right.appendChild(overlay);
    }

    body.appendChild(left);
    body.appendChild(right);

    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  // ========= GSAP ANIMATIONS =========
  function animateItineraryCards() {
    if (!window.gsap) return;
    gsap.from(".day-card", {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: 0.08,
      ease: "power2.out",
    });
  }

  // Animate hero on load
  if (window.gsap) {
    gsap.from(".hero-title", { y: 20, opacity: 0, duration: 0.6, ease: "power2.out" });
    gsap.from(".hero-subtitle", { y: 12, opacity: 0, duration: 0.6, delay: 0.1 });
    gsap.from(".form-card", { y: 20, opacity: 0, duration: 0.6, delay: 0.15 });
    gsap.from(".trip-summary", { y: 20, opacity: 0, duration: 0.6, delay: 0.25 });
  }
});
