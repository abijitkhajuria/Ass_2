import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus, X, Bell, BellOff, Sun, Moon, LayoutGrid, Rows, Clock3, AlarmClockPlus, Trash2, Volume2 } from "lucide-react";

/* ---------------------------------------------------------
   DATA
--------------------------------------------------------- */
const ZONE_CATALOG = [
  { tz: "America/New_York", city: "New York", country: "USA" },
  { tz: "America/Los_Angeles", city: "Los Angeles", country: "USA" },
  { tz: "America/Chicago", city: "Chicago", country: "USA" },
  { tz: "America/Sao_Paulo", city: "São Paulo", country: "Brazil" },
  { tz: "Europe/London", city: "London", country: "UK" },
  { tz: "Europe/Paris", city: "Paris", country: "France" },
  { tz: "Europe/Berlin", city: "Berlin", country: "Germany" },
  { tz: "Europe/Moscow", city: "Moscow", country: "Russia" },
  { tz: "Africa/Cairo", city: "Cairo", country: "Egypt" },
  { tz: "Africa/Johannesburg", city: "Johannesburg", country: "South Africa" },
  { tz: "Asia/Dubai", city: "Dubai", country: "UAE" },
  { tz: "Asia/Kolkata", city: "Mumbai", country: "India" },
  { tz: "Asia/Karachi", city: "Karachi", country: "Pakistan" },
  { tz: "Asia/Dhaka", city: "Dhaka", country: "Bangladesh" },
  { tz: "Asia/Bangkok", city: "Bangkok", country: "Thailand" },
  { tz: "Asia/Shanghai", city: "Shanghai", country: "China" },
  { tz: "Asia/Tokyo", city: "Tokyo", country: "Japan" },
  { tz: "Asia/Seoul", city: "Seoul", country: "South Korea" },
  { tz: "Australia/Sydney", city: "Sydney", country: "Australia" },
  { tz: "Pacific/Auckland", city: "Auckland", country: "New Zealand" },
];

const DEFAULT_TZ_IDS = ["America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Tokyo"];

/* ---------------------------------------------------------
   TIME HELPERS
--------------------------------------------------------- */
function getZonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    weekday: "short",
  });
  const parts = {};
  fmt.formatToParts(date).forEach((p) => { parts[p.type] = p.value; });
  const hour = parseInt(parts.hour, 10) % 24;
  return {
    hour,
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
    weekday: parts.weekday,
    dateLabel: `${parts.month}/${parts.day}/${parts.year}`,
  };
}

function getOffsetLabel(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" });
  const part = fmt.formatToParts(date).find((p) => p.type === "timeZoneName");
  return part ? part.value.replace("GMT", "UTC") : "";
}

function formatDigital(hour, minute, second, is24h) {
  if (is24h) {
    return { main: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`, suffix: "" };
  }
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return {
    main: `${String(h12).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
    suffix: hour >= 12 ? "PM" : "AM",
  };
}

/* ---------------------------------------------------------
   ANALOG CLOCK — CSS-driven continuous rotation, no per-second
   re-render. Position is synced once via negative animation-delay,
   then runs purely on the compositor for smooth, cheap motion.
--------------------------------------------------------- */
function AnalogClock({ hour, minute, second, accent, size = 168 }) {
  const hourDeg = ((hour % 12) + minute / 60) * 30;
  const minuteDeg = (minute + second / 60) * 6;
  const secondDeg = second * 6;

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 60; i++) {
      const isHour = i % 5 === 0;
      const angle = i * 6;
      const r1 = isHour ? 74 : 78;
      const r2 = 82;
      const rad = (angle * Math.PI) / 180;
      arr.push({
        x1: 90 + r1 * Math.sin(rad),
        y1: 90 - r1 * Math.cos(rad),
        x2: 90 + r2 * Math.sin(rad),
        y2: 90 - r2 * Math.cos(rad),
        isHour,
      });
    }
    return arr;
  }, []);

  return (
    <svg viewBox="0 0 180 180" width={size} height={size} className="select-none">
      <circle cx="90" cy="90" r="88" fill="var(--dial)" stroke="var(--dial-ring)" strokeWidth="2" />
      <circle cx="90" cy="90" r="82" fill="none" stroke="var(--dial-ring)" strokeWidth="0.5" opacity="0.5" />
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.isHour ? accent : "var(--tick-minor)"}
          strokeWidth={t.isHour ? 2 : 1}
          strokeLinecap="round"
        />
      ))}
      {/* Hour hand */}
      <line
        x1="90" y1="90" x2="90" y2="52"
        stroke="var(--hand-hour)" strokeWidth="4.5" strokeLinecap="round"
        style={{ transform: `rotate(${hourDeg}deg)`, transformOrigin: "90px 90px" }}
      />
      {/* Minute hand */}
      <line
        x1="90" y1="90" x2="90" y2="32"
        stroke="var(--hand-minute)" strokeWidth="3" strokeLinecap="round"
        style={{ transform: `rotate(${minuteDeg}deg)`, transformOrigin: "90px 90px" }}
      />
      {/* Second hand — animated continuously, synced via negative delay */}
      <line
        x1="90" y1="102" x2="90" y2="26"
        stroke={accent} strokeWidth="1.4" strokeLinecap="round"
        style={{
          transformOrigin: "90px 90px",
          animation: "sweep 60s steps(60) infinite",
          animationDelay: `-${second}s`,
        }}
      />
      <circle cx="90" cy="90" r="4.5" fill={accent} stroke="var(--dial)" strokeWidth="1.5" />
      <text x="90" y="20" textAnchor="middle" fill="var(--tick-minor)" fontSize="7" fontFamily="var(--font-mono)">12</text>
      <text x="90" y="167" textAnchor="middle" fill="var(--tick-minor)" fontSize="7" fontFamily="var(--font-mono)">6</text>
      <text x="12" y="93" textAnchor="middle" fill="var(--tick-minor)" fontSize="7" fontFamily="var(--font-mono)">9</text>
      <text x="168" y="93" textAnchor="middle" fill="var(--tick-minor)" fontSize="7" fontFamily="var(--font-mono)">3</text>
      <style>{`@keyframes sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

/* ---------------------------------------------------------
   ALARM BEEP (Web Audio API — no external assets)
--------------------------------------------------------- */
function useBeep() {
  const ctxRef = useRef(null);
  return useCallback(() => {
    try {
      if (!ctxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        ctxRef.current = new AudioCtx();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      [0, 0.32, 0.64].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.22, now + offset + 0.02);
        gain.gain.linearRampToValueAtTime(0, now + offset + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.26);
      });
    } catch (e) { /* audio unavailable — fail silently */ }
  }, []);
}

/* ---------------------------------------------------------
   CLOCK CARD
--------------------------------------------------------- */
const ACCENTS = ["#C9A15C", "#5FB4C7", "#C97B5C", "#8FA8C9"];

function ClockCard({ zone, now, is24h, accent, alarms, onRemove, onAddAlarm, onToggleAlarm, onDeleteAlarm, layout }) {
  const { hour, minute, second, weekday, dateLabel } = getZonedParts(now, zone.tz);
  const offset = getOffsetLabel(now, zone.tz);
  const digital = formatDigital(hour, minute, second, is24h);
  const isDay = hour >= 6 && hour < 18;
  const [showAlarmForm, setShowAlarmForm] = useState(false);
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [alarmLabel, setAlarmLabel] = useState("");

  const zoneAlarms = alarms.filter((a) => a.zoneId === zone.id);

  return (
    <div className={`clock-card ${layout === "list" ? "clock-card--list" : ""}`}>
      <div className="clock-card__head">
        <div>
          <h3 className="clock-card__city">{zone.city}</h3>
          <p className="clock-card__meta">{zone.country} · {offset}</p>
        </div>
        <button className="icon-btn" onClick={() => onRemove(zone.id)} aria-label={`Remove ${zone.city}`}>
          <X size={14} />
        </button>
      </div>

      <div className="clock-card__body">
        <AnalogClock hour={hour} minute={minute} second={second} accent={accent} size={layout === "list" ? 108 : 168} />
        <div className="clock-card__digital-wrap">
          <div className="clock-card__digital">
            {digital.main}
            {digital.suffix && <span className="clock-card__suffix">{digital.suffix}</span>}
          </div>
          <div className="clock-card__date">
            <span className={`daynight-dot ${isDay ? "is-day" : "is-night"}`} />
            {weekday}, {dateLabel}
          </div>
        </div>
      </div>

      <div className="clock-card__alarms">
        {zoneAlarms.map((a) => (
          <div key={a.id} className={`alarm-pill ${a.triggered ? "alarm-pill--ringing" : ""}`}>
            <button className="alarm-pill__toggle" onClick={() => onToggleAlarm(a.id)} aria-label="Toggle alarm">
              {a.enabled ? <Bell size={12} /> : <BellOff size={12} />}
            </button>
            <span>{a.time}</span>
            {a.label && <span className="alarm-pill__label">{a.label}</span>}
            <button className="alarm-pill__del" onClick={() => onDeleteAlarm(a.id)} aria-label="Delete alarm">
              <Trash2 size={11} />
            </button>
          </div>
        ))}

        {showAlarmForm ? (
          <form
            className="alarm-form"
            onSubmit={(e) => {
              e.preventDefault();
              onAddAlarm(zone.id, alarmTime, alarmLabel);
              setAlarmLabel("");
              setShowAlarmForm(false);
            }}
          >
            <input type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} required />
            <input
              type="text" placeholder="Label" value={alarmLabel}
              onChange={(e) => setAlarmLabel(e.target.value)} maxLength={18}
            />
            <button type="submit" className="alarm-form__ok">Set</button>
            <button type="button" className="alarm-form__cancel" onClick={() => setShowAlarmForm(false)}>Cancel</button>
          </form>
        ) : (
          <button className="add-alarm-btn" onClick={() => setShowAlarmForm(true)}>
            <AlarmClockPlus size={13} /> Add alarm
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   ADD TIMEZONE PANEL
--------------------------------------------------------- */
function AddZonePanel({ existingIds, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = ZONE_CATALOG.filter(
    (z) => !existingIds.includes(z.tz) &&
      (z.city.toLowerCase().includes(query.toLowerCase()) || z.country.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="add-zone-panel">
      <div className="add-zone-panel__head">
        <input
          autoFocus type="text" placeholder="Search city or country…"
          value={query} onChange={(e) => setQuery(e.target.value)}
        />
        <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
      </div>
      <div className="add-zone-panel__list">
        {filtered.length === 0 && <p className="add-zone-panel__empty">No matching timezones.</p>}
        {filtered.map((z) => (
          <button key={z.tz} className="add-zone-panel__item" onClick={() => onAdd(z)}>
            <span>{z.city}</span>
            <span className="add-zone-panel__country">{z.country}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   MAIN DASHBOARD
--------------------------------------------------------- */
export default function WorldClockDashboard() {
  const [now, setNow] = useState(new Date());
  const [zones, setZones] = useState(() =>
    DEFAULT_TZ_IDS.map((tz, i) => ({ id: `${tz}-${i}`, tz, ...ZONE_CATALOG.find((z) => z.tz === tz) }))
  );
  const [theme, setTheme] = useState("dark");
  const [is24h, setIs24h] = useState(true);
  const [layout, setLayout] = useState("grid");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [ringingAlarm, setRingingAlarm] = useState(null);
  const beep = useBeep();

  // Single global 1s tick drives all digital readouts + alarm checks.
  // Analog hands animate independently via CSS, so this stays cheap.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Alarm evaluation
  useEffect(() => {
    alarms.forEach((a) => {
      if (!a.enabled || a.triggered) return;
      const zone = zones.find((z) => z.id === a.zoneId);
      if (!zone) return;
      const { hour, minute, second } = getZonedParts(now, zone.tz);
      const current = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      if (current === a.time && second === 0) {
        setAlarms((prev) => prev.map((al) => (al.id === a.id ? { ...al, triggered: true } : al)));
        setRingingAlarm({ ...a, cityName: zone.city });
        beep();
      }
    });
  }, [now, alarms, zones, beep]);

  const addZone = (z) => {
    setZones((prev) => [...prev, { id: `${z.tz}-${Date.now()}`, ...z }]);
    setShowAddPanel(false);
  };
  const removeZone = (id) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    setAlarms((prev) => prev.filter((a) => a.zoneId !== id));
  };
  const addAlarm = (zoneId, time, label) => {
    setAlarms((prev) => [...prev, { id: `alarm-${Date.now()}`, zoneId, time, label, enabled: true, triggered: false }]);
  };
  const toggleAlarm = (id) => setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled, triggered: false } : a)));
  const deleteAlarm = (id) => setAlarms((prev) => prev.filter((a) => a.id !== id));
  const dismissRinging = () => {
    if (ringingAlarm) setAlarms((prev) => prev.map((a) => (a.id === ringingAlarm.id ? { ...a, triggered: false, enabled: false } : a)));
    setRingingAlarm(null);
  };

  const localOffset = getOffsetLabel(now, Intl.DateTimeFormat().resolvedOptions().timeZone);

  return (
    <div className={`wcd wcd--${theme}`}>
      <style>{`
        .wcd {
          --font-sans: 'Space Grotesk', 'Inter', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', 'Courier New', monospace;
          width: 100%;
          font-family: var(--font-sans);
          min-height: 100vh;
          padding: 28px 20px 60px;
          transition: background 0.3s ease, color 0.3s ease;
          box-sizing: border-box;
        }
        .wcd--dark {
          background: #0F1319;
          color: #EDEAE0;
          --panel: #171C24;
          --panel-border: #2A3140;
          --dial: #12161D;
          --dial-ring: #333B4A;
          --tick-minor: #48505F;
          --hand-hour: #EDEAE0;
          --hand-minute: #EDEAE0;
          --text-muted: #8B92A0;
          --input-bg: #1E2530;
        }
        .wcd--light {
          background: #F1EDE4;
          color: #21252B;
          --panel: #FFFFFF;
          --panel-border: #DAD3C2;
          --dial: #FCFAF4;
          --dial-ring: #C9BFA6;
          --tick-minor: #A69B80;
          --hand-hour: #21252B;
          --hand-minute: #21252B;
          --text-muted: #7A7362;
          --input-bg: #F1EDE4;
        }
        .wcd * { box-sizing: border-box; }
        .wcd-header {
          max-width: 1600px; margin: 0 auto 28px; display: flex;
          justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;
        }
        .wcd-header__title { font-size: 26px; font-weight: 600; letter-spacing: 0.5px; margin: 0;    color: #60af3d; }
        .wcd-header__sub { font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); margin: 6px 0 0; letter-spacing: 0.5px; }
        .wcd-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .ctrl-btn {
          display: flex; align-items: center; gap: 6px; background: var(--panel);
          border: 1px solid var(--panel-border); color: inherit; border-radius: 8px;
          padding: 8px 12px; font-size: 12.5px; font-family: var(--font-sans); cursor: pointer;
          transition: border-color 0.15s ease, transform 0.1s ease;
        }
        .ctrl-btn:hover { border-color: #C9A15C; }
        .ctrl-btn:active { transform: scale(0.97); }
        .ctrl-btn--primary { background: #C9A15C; color: #0F1319; border-color: #C9A15C; font-weight: 600; }
        .icon-btn {
          background: transparent; border: none; color: var(--text-muted); cursor: pointer;
          padding: 4px; border-radius: 6px; display: flex; align-items: center;
        }
        .icon-btn:hover { color: #C9668A; background: rgba(201,102,138,0.1); }

        .wcd-grid {
          max-width: 1600px; margin: 0 auto; display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px;
        }
        .wcd-grid--list { grid-template-columns: 1fr; }

        .clock-card {
          background: var(--panel); border: 1px solid var(--panel-border); border-radius: 14px;
          padding: 18px; display: flex; flex-direction: column; gap: 14px;
        }
        .clock-card--list { flex-direction: row; align-items: center; flex-wrap: wrap; }
        .clock-card--list .clock-card__body { flex-direction: row; align-items: center; gap: 20px; flex: 1; }
        .clock-card--list .clock-card__head { flex-direction: column; align-items: flex-start; min-width: 130px; }
        .clock-card--list .clock-card__alarms { flex-basis: 100%; }

        .clock-card__head { display: flex; justify-content: space-between; align-items: flex-start; }
        .clock-card__city { margin: 0; font-size: 16px; font-weight: 600; }
        .clock-card__meta { margin: 2px 0 0; font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); }

        .clock-card__body { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .clock-card__digital-wrap { text-align: center; }
        .clock-card__digital { font-family: var(--font-mono); font-size: 26px; font-weight: 500; letter-spacing: 1px; }
        .clock-card__suffix { font-size: 13px; margin-left: 5px; color: var(--text-muted); }
        .clock-card__date { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11.5px; color: var(--text-muted); margin-top: 4px; }
        .daynight-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .daynight-dot.is-day { background: #E3B34F; }
        .daynight-dot.is-night { background: #5B6B8C; }

        .clock-card__alarms { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .alarm-pill {
          display: flex; align-items: center; gap: 5px; background: var(--input-bg);
          border: 1px solid var(--panel-border); border-radius: 20px; padding: 4px 8px;
          font-size: 11px; font-family: var(--font-mono);
        }
        .alarm-pill--ringing { border-color: #E2665A; animation: pulse 1s ease infinite; }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(226,102,90,0.4);} 50% { box-shadow: 0 0 0 4px rgba(226,102,90,0);} }
        .alarm-pill__toggle, .alarm-pill__del { background: none; border: none; color: inherit; cursor: pointer; display: flex; padding: 0; opacity: 0.75; }
        .alarm-pill__toggle:hover, .alarm-pill__del:hover { opacity: 1; }
        .alarm-pill__label { color: var(--text-muted); }

        .add-alarm-btn {
          display: flex; align-items: center; gap: 5px; background: none; border: 1px dashed var(--panel-border);
          color: var(--text-muted); border-radius: 20px; padding: 4px 10px; font-size: 11px; cursor: pointer;
          font-family: var(--font-sans);
        }
        .add-alarm-btn:hover { border-color: #C9A15C; color: #C9A15C; }

        .alarm-form { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .alarm-form input {
          background: var(--input-bg); border: 1px solid var(--panel-border); border-radius: 6px;
          color: inherit; font-size: 11.5px; padding: 4px 6px; font-family: var(--font-mono);
        }
        .alarm-form input[type="text"] { width: 80px; font-family: var(--font-sans); }
        .alarm-form__ok { background: #C9A15C; border: none; color: #0F1319; font-weight: 600; border-radius: 6px; padding: 4px 10px; font-size: 11px; cursor: pointer; }
        .alarm-form__cancel { background: none; border: none; color: var(--text-muted); font-size: 11px; cursor: pointer; }

        .add-zone-panel {
          position: fixed; top: 90px; right: 20px; width: 300px; max-height: 60vh; overflow: auto;
          background: var(--panel); border: 1px solid var(--panel-border); border-radius: 12px;
          padding: 14px; z-index: 50; box-shadow: 0 12px 32px rgba(0,0,0,0.35);
        }
        .add-zone-panel__head { display: flex; gap: 8px; margin-bottom: 10px; }
        .add-zone-panel__head input {
          flex: 1; background: var(--input-bg); border: 1px solid var(--panel-border);
          border-radius: 7px; padding: 7px 9px; color: inherit; font-size: 13px; font-family: var(--font-sans);
        }
        .add-zone-panel__list { display: flex; flex-direction: column; gap: 3px; }
        .add-zone-panel__item {
          display: flex; justify-content: space-between; background: none; border: none;
          color: inherit; text-align: left; padding: 8px 9px; border-radius: 7px; cursor: pointer; font-size: 13px;
          font-family: var(--font-sans);
        }
        .add-zone-panel__item:hover { background: var(--input-bg); }
        .add-zone-panel__country { color: var(--text-muted); font-size: 11.5px; }
        .add-zone-panel__empty { color: var(--text-muted); font-size: 12.5px; padding: 8px; }

        .ringing-banner {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 100;
          background: #E2665A; color: #2A0E0B; padding: 14px 20px; border-radius: 12px;
          display: flex; align-items: center; gap: 14px; box-shadow: 0 12px 32px rgba(0,0,0,0.4);
          font-family: var(--font-sans);
        }
        .ringing-banner button {
          background: #2A0E0B; color: #F5D8D4; border: none; border-radius: 7px;
          padding: 6px 14px; font-size: 12.5px; cursor: pointer; font-weight: 600;
        }

        @media (max-width: 520px) {
          .wcd-header { flex-direction: column; }
          .wcd-controls { width: 100%; }
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {ringingAlarm && (
        <div className="ringing-banner">
          <Volume2 size={18} />
          <span>Alarm{ringingAlarm.label ? ` · ${ringingAlarm.label}` : ""} — {ringingAlarm.cityName}, {ringingAlarm.time}</span>
          <button onClick={dismissRinging}>Dismiss</button>
        </div>
      )}

      <header className="wcd-header">
        <div>
          <h1 className="wcd-header__title">World clock dashboard</h1>
          <p className="wcd-header__sub">
            <Clock3 size={12} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} />
            Local time zone offset {localOffset} · {zones.length} regions tracked
          </p>
        </div>
        <div className="wcd-controls">
          <button className="ctrl-btn" onClick={() => setIs24h((v) => !v)}>{is24h ? "24h" : "12h"}</button>
          <button className="ctrl-btn" onClick={() => setLayout((l) => (l === "grid" ? "list" : "grid"))}>
            {layout === "grid" ? <Rows size={14} /> : <LayoutGrid size={14} />}
            {layout === "grid" ? "List view" : "Grid view"}
          </button>
          <button className="ctrl-btn" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button className="ctrl-btn ctrl-btn--primary" onClick={() => setShowAddPanel((v) => !v)}>
            <Plus size={14} /> Add zone
          </button>
        </div>
      </header>

      {showAddPanel && (
        <AddZonePanel
          existingIds={zones.map((z) => z.tz)}
          onAdd={addZone}
          onClose={() => setShowAddPanel(false)}
        />
      )}

      <div className={`wcd-grid ${layout === "list" ? "wcd-grid--list" : ""}`}>
        {zones.map((zone, i) => (
          <ClockCard
            key={zone.id}
            zone={zone}
            now={now}
            is24h={is24h}
            accent={ACCENTS[i % ACCENTS.length]}
            alarms={alarms}
            onRemove={removeZone}
            onAddAlarm={addAlarm}
            onToggleAlarm={toggleAlarm}
            onDeleteAlarm={deleteAlarm}
            layout={layout}
          />
        ))}
        {zones.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No regions yet — add a timezone to begin.</p>
        )}
      </div>
    </div>
  );
}
