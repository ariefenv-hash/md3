// ==================== at-a-glance.js — Pixel 10 概览微件 (At a Glance Widget) ====================

import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
import { mediaService } from './media-service.js';
import { ICONS } from './icons.js';
import { onBusEvent, emitToApp, broadcast } from './app-bus.js';

// ==================== 世界时钟城市钉选（批次二·走应用总线） ====================
// 时钟应用内点击城市钉选按钮 → BUS_EMIT clock/pin-city → 本模块收货：
// 桌面 At a Glance 出现城市时间 chip（点击直达时钟，✕ 取消钉选）。
// 钉选列表持久化在 localStorage；双向同步：桌面变化广播 clock/pins-changed，
// 时钟应用加载时发 clock/request-pins，桌面以 emitToApp 定向回填。
const PINNED_CITIES_KEY = 'ios-desktop:pinned-cities';

let pinnedCities = [];
let cityTimer = null;

function loadPinnedCities() {
  try {
    const saved = localStorage.getItem(PINNED_CITIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.filter((c) => c && typeof c.name === 'string' && typeof c.offset === 'number');
    }
  } catch (e) {}
  return [];
}

function savePinnedCities() {
  try { localStorage.setItem(PINNED_CITIES_KEY, JSON.stringify(pinnedCities)); } catch (e) {}
}

/** 用固定 UTC 偏移换算目标城市当前时刻（与时钟子应用同一公式） */
function cityNow(offsetHours) {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offsetHours * 3600000);
}

function fmtCityTime(d) {
  const h = d.getHours();
  return `${h >= 12 ? '下午' : '上午'} ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 渲染钉选城市 chips 行（无钉选时整行隐藏） */
function renderCityChips() {
  const row = document.getElementById('glanceCitiesRow');
  if (!row) return;
  if (!pinnedCities.length) {
    row.style.display = 'none';
    row.innerHTML = '';
    return;
  }
  row.style.display = 'flex';
  row.innerHTML = pinnedCities.map((c) => `
    <div class="glance-chip glance-city-chip" data-city-id="${c.id}" title="点击打开时钟">
      <span class="glance-chip-icon" style="color:var(--md-primary,#a8c7fa);">${ICONS.push_pin || ICONS.alarm}</span>
      <span class="glance-chip-text" data-city-time>${c.name} · --:--</span>
      <span class="glance-city-unpin" data-unpin-id="${c.id}" title="取消钉选" style="opacity:.55;cursor:pointer;">${ICONS.close}</span>
    </div>
  `).join('');

  row.querySelectorAll('.glance-city-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      // 点 ✕ 取消钉选，其余区域直达时钟应用
      const unpinId = e.target.closest('[data-unpin-id]')?.getAttribute('data-unpin-id');
      if (unpinId) {
        unpinCity(unpinId, true);
        return;
      }
      launchAppById('clock_app');
    });
  });
  updateCityTimes();
}

/** 每 30s 刷新一次钉选城市的时分显示 */
function updateCityTimes() {
  pinnedCities.forEach((c) => {
    const chip = document.querySelector(`.glance-city-chip[data-city-id="${c.id}"] [data-city-time]`);
    if (chip) chip.textContent = `${c.name} · ${fmtCityTime(cityNow(c.offset))}`;
  });
}

function pinCity(city) {
  if (!city || !city.id || pinnedCities.some((c) => c.id === city.id)) return;
  if (pinnedCities.length >= 6) {
    if (window.showSystemToast) window.showSystemToast('最多钉选 6 个城市，请先取消一个', ICONS.push_pin || ICONS.alarm);
    return;
  }
  pinnedCities.push({ id: city.id, name: city.name, country: city.country || '', offset: city.offset });
  savePinnedCities();
  renderCityChips();
  broadcast('clock/pins-changed', { pins: pinnedCities, __silent: true }, '');
  if (window.showSystemToast) window.showSystemToast(`已把「${city.name}」钉到桌面`, ICONS.push_pin || ICONS.alarm);
}

function unpinCity(cityId, fromDesktop) {
  const city = pinnedCities.find((c) => c.id === cityId);
  pinnedCities = pinnedCities.filter((c) => c.id !== cityId);
  savePinnedCities();
  renderCityChips();
  broadcast('clock/pins-changed', { pins: pinnedCities, __silent: true }, '');
  if (fromDesktop && city && window.showSystemToast) window.showSystemToast(`已取消钉选「${city.name}」`, ICONS.push_pin || ICONS.alarm);
}

/** 注册总线事件：钉选/取消/回填请求（时钟子应用 ↔ 桌面微件双向同步） */
function initCityPinning() {
  pinnedCities = loadPinnedCities();

  onBusEvent('clock/pin-city', (city) => pinCity(city));
  onBusEvent('clock/unpin-city', (p) => unpinCity(p && p.id, false));
  onBusEvent('clock/request-pins', () => {
    emitToApp('clock_app', 'clock/pins', { pins: pinnedCities, __silent: true }, '');
  });

  renderCityChips();
  if (cityTimer) clearInterval(cityTimer);
  cityTimer = setInterval(updateCityTimes, 30000);
}

let currentWeather = {
  temp: 26,
  condition: '晴朗',
  icon: ICONS.weather_sunny,
  aqi: '优质 32'
};

const WMO_ICONS = {
  0: { desc: '晴朗', icon: ICONS.weather_sunny },
  1: { desc: '晴朗', icon: ICONS.weather_partly },
  2: { desc: '多云', icon: ICONS.weather_partly },
  3: { desc: '阴天', icon: ICONS.weather_cloudy },
  45: { desc: '有雾', icon: ICONS.weather_fog },
  48: { desc: '雾凇', icon: ICONS.weather_fog },
  51: { desc: '小雨', icon: ICONS.weather_drizzle },
  61: { desc: '小雨', icon: ICONS.weather_rain },
  63: { desc: '中雨', icon: ICONS.weather_rain },
  65: { desc: '大雨', icon: ICONS.weather_rain },
  71: { desc: '小雪', icon: ICONS.weather_snow },
  73: { desc: '大雪', icon: ICONS.weather_snow },
  95: { desc: '雷阵雨', icon: ICONS.weather_thunder }
};

/** 初始化概览微件 */
export function initAtAGlance() {
  renderAtAGlanceWidget();
  mediaService.subscribe(updateMediaGlance);
  fetchBackgroundWeather();
  initCityPinning();
}

/** 后台静默同步当地实时气象 */
async function fetchBackgroundWeather() {
  try {
    let lat = 39.9042, lon = 116.4074;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2000 });
        });
        if (pos && pos.coords) {
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        }
      } catch(e) {}
    }
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.current) {
        const code = data.current.weather_code || 0;
        const wInfo = WMO_ICONS[code] || { desc: '多云', icon: ICONS.weather_partly };
        currentWeather.temp = Math.round(data.current.temperature_2m);
        currentWeather.condition = wInfo.desc;
        currentWeather.icon = wInfo.icon;
        
        const weatherBtn = document.getElementById('glanceWeatherBtn');
        if (weatherBtn) {
          weatherBtn.innerHTML = `
            <span class="glance-weather-icon">${currentWeather.icon}</span>
            <span class="glance-weather-temp">${currentWeather.temp}°C</span>
            <span class="glance-weather-cond">${currentWeather.condition}</span>
          `;
        }
      }
    }
  } catch(err) {
    console.log('Glance weather sync:', err);
  }
}

/** 渲染桌面首屏概览组件 */
export function renderAtAGlanceWidget() {
  const existing = document.getElementById('pixelAtAGlance');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'pixelAtAGlance';
  container.className = 'pixel-at-a-glance';

  const now = new Date();
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]}${now.getDate()}日`;

  container.innerHTML = `
    <div class="glance-main-row">
      <div class="glance-date" id="glanceDateText">${dateStr}</div>
      <div class="glance-weather" id="glanceWeatherBtn" title="查看详细天气">
        <span class="glance-weather-icon">${currentWeather.icon}</span>
        <span class="glance-weather-temp">${currentWeather.temp}°C</span>
        <span class="glance-weather-cond">${currentWeather.condition}</span>
      </div>
    </div>
    <div class="glance-sub-row" id="glanceSubRow">
      <div class="glance-chip" id="glanceScheduleChip">
        <span class="glance-chip-icon">${ICONS.calendar_month}</span>
        <span class="glance-chip-text">下午 3:00 - 项目架构与矢量动效评审</span>
      </div>
      <div class="glance-chip music-chip" id="glanceMusicChip" style="display:none;">
        <span class="glance-chip-icon">${ICONS.music_note}</span>
        <span class="glance-chip-text" id="glanceMusicText">正在播放</span>
      </div>
    </div>
    <div class="glance-sub-row" id="glanceCitiesRow" style="display:none;"></div>
  `;

  // 点击日期/日程打开日历
  container.querySelector('#glanceDateText').addEventListener('click', (e) => {
    e.stopPropagation();
    launchAppById('cal_app');
  });

  container.querySelector('#glanceScheduleChip').addEventListener('click', (e) => {
    e.stopPropagation();
    launchAppById('cal_app');
  });

  // 点击天气打开天气应用
  container.querySelector('#glanceWeatherBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    launchAppById('weather');
  });

  // 点击音乐微件打开音乐应用
  container.querySelector('#glanceMusicChip').addEventListener('click', (e) => {
    e.stopPropagation();
    launchAppById('music');
  });

  const desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.insertBefore(container, desktop.firstChild);
  }
}

function updateMediaGlance(state) {
  const chip = document.getElementById('glanceMusicChip');
  const text = document.getElementById('glanceMusicText');
  const scheduleChip = document.getElementById('glanceScheduleChip');
  if (!chip || !text) return;

  if (state.isPlaying && state.track) {
    chip.style.display = 'inline-flex';
    text.textContent = `${state.track.title} • ${state.track.artist}`;
    if (scheduleChip) scheduleChip.style.display = 'none';
  } else {
    chip.style.display = 'none';
    if (scheduleChip) scheduleChip.style.display = 'inline-flex';
  }
}

function launchAppById(appId) {
  const idx = initialApps.findIndex(a => a.id === appId);
  if (idx !== -1) {
    const iconEl = document.querySelector(`[data-id="${appId}"]`);
    openApp(idx, iconEl);
  }
}
