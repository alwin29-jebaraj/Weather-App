import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  Droplets,
  Thermometer,
  Search,
  Settings,
  RefreshCw,
  AlertCircle,
  MapPin,
  Calendar,
  Sparkles,
  Database,
  Key,
  X,
  History,
  Compass
} from 'lucide-react';

// ==========================================
// WEATHER MAPPER HELPERS
// ==========================================

function mapWmoToTextAndIcon(code) {
  if (code === 0) return { text: "Clear Sky", icon: "Sun" };
  if ([1, 2, 3].includes(code)) return { text: "Partly Cloudy", icon: "CloudSun" };
  if ([45, 48].includes(code)) return { text: "Foggy", icon: "CloudFog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: "Drizzle", icon: "CloudDrizzle" };
  if ([61, 63, 65, 66, 67].includes(code)) return { text: "Rainy", icon: "CloudRain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: "Snowy", icon: "Snowflake" };
  if ([80, 81, 82].includes(code)) return { text: "Rain Showers", icon: "CloudRain" };
  if ([95, 96, 99].includes(code)) return { text: "Thunderstorm", icon: "CloudLightning" };
  return { text: "Cloudy", icon: "Cloud" };
}

function mapOwmToTextAndIcon(id, description) {
  const capDesc = description.charAt(0).toUpperCase() + description.slice(1);
  if (id >= 200 && id < 300) return { text: capDesc, icon: "CloudLightning" };
  if (id >= 300 && id < 400) return { text: capDesc, icon: "CloudDrizzle" };
  if (id >= 500 && id < 600) return { text: capDesc, icon: "CloudRain" };
  if (id >= 600 && id < 700) return { text: capDesc, icon: "Snowflake" };
  if (id >= 700 && id < 800) return { text: capDesc, icon: "CloudFog" };
  if (id === 800) return { text: "Clear Sky", icon: "Sun" };
  if (id > 800 && id < 900) {
    if (id === 801 || id === 802) return { text: capDesc, icon: "CloudSun" };
    return { text: capDesc, icon: "Cloud" };
  }
  return { text: capDesc, icon: "Cloud" };
}

// Reusable Icon Renderer
export const WeatherIcon = ({ name, className }) => {
  switch (name) {
    case 'Sun': return <Sun className={className} id="icon-sun" />;
    case 'Moon': return <Moon className={className} id="icon-moon" />;
    case 'CloudSun': return <CloudSun className={className} id="icon-cloudsun" />;
    case 'CloudFog': return <CloudFog className={className} id="icon-cloudfog" />;
    case 'CloudDrizzle': return <CloudDrizzle className={className} id="icon-clouddrizzle" />;
    case 'CloudRain': return <CloudRain className={className} id="icon-cloudrain" />;
    case 'CloudLightning': return <CloudLightning className={className} id="icon-cloudlightning" />;
    case 'Snowflake': return <Snowflake className={className} id="icon-snowflake" />;
    default: return <Cloud className={className} id="icon-cloud" />;
  }
};

// Quick cities list
const QUICK_CITIES = ['Reykjavík', 'New York', 'London', 'Tokyo', 'Sydney', 'Cairo'];

export default function WeatherDashboard() {
  const [cityInput, setCityInput] = useState('');
  const [currentSearch, setCurrentSearch] = useState('Reykjavík');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tempUnit, setTempUnit] = useState('C');
  
  // Settings & Configuration States (stored in localStorage)
  const [dataSource, setDataSource] = useState(() => {
    return localStorage.getItem('weather_source') || 'open-meteo';
  });
  const [owmApiKey, setOwmApiKey] = useState(() => {
    return localStorage.getItem('weather_owm_key') || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('weather_history');
    return saved ? JSON.parse(saved) : ['Reykjavík', 'New York', 'London', 'Tokyo'];
  });

  // Load weather data when currentSearch, dataSource, or apiKey changes
  useEffect(() => {
    fetchWeather(currentSearch);
  }, [currentSearch, dataSource, owmApiKey]);

  // Handle weather fetch
  const fetchWeather = async (query) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (dataSource === 'openweathermap') {
        if (!owmApiKey.trim()) {
          throw new Error('Please enter a valid OpenWeatherMap API Key in Settings to use this source.');
        }
        
        // OpenWeatherMap calls
        const [currentRes, forecastRes] = await Promise.all([
          axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${owmApiKey}&units=metric`),
          axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(query)}&appid=${owmApiKey}&units=metric`)
        ]);

        const currentData = currentRes.data;
        const forecastData = forecastRes.data;

        // Group forecast by day and calculate max/min
        const groups = {};
        forecastData.list.forEach((item) => {
          const dateStr = item.dt_txt.split(' ')[0];
          if (!groups[dateStr]) groups[dateStr] = [];
          groups[dateStr].push(item);
        });

        const forecast = Object.keys(groups).slice(0, 5).map((dateStr) => {
          const items = groups[dateStr];
          let tempMax = -Infinity;
          let tempMin = Infinity;
          const midItem = items[Math.floor(items.length / 2)];
          
          items.forEach(item => {
            if (item.main.temp_max > tempMax) tempMax = item.main.temp_max;
            if (item.main.temp_min < tempMin) tempMin = item.main.temp_min;
          });

          const weatherId = midItem.weather[0].id;
          const description = midItem.weather[0].description;
          const { text, icon } = mapOwmToTextAndIcon(weatherId, description);

          const dateObj = new Date(midItem.dt * 1000);
          const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

          return {
            date: formattedDate,
            tempMax,
            tempMin,
            conditionText: text,
            weatherCode: weatherId,
            iconName: icon,
          };
        });

        const { text: currentText, icon: currentIcon } = mapOwmToTextAndIcon(currentData.weather[0].id, currentData.weather[0].description);

        const formatOwmTime = (timestamp, timezoneOffset) => {
          const date = new Date((timestamp + timezoneOffset) * 1000);
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
        };

        const parsedData = {
          city: currentData.name,
          country: currentData.sys.country,
          temperature: currentData.main.temp,
          feelsLike: currentData.main.feels_like,
          humidity: currentData.main.humidity,
          windSpeed: currentData.wind.speed * 3.6, // m/s to km/h
          weatherCode: currentData.weather[0].id,
          conditionText: currentText,
          iconName: currentIcon,
          precipitation: currentData.rain ? (currentData.rain['1h'] || currentData.rain['3h'] || 0) : 0,
          sunrise: formatOwmTime(currentData.sys.sunrise, currentData.timezone),
          sunset: formatOwmTime(currentData.sys.sunset, currentData.timezone),
          isDay: currentData.weather[0].icon.endsWith('d'),
          forecast,
          source: 'OpenWeatherMap',
        };

        setWeather(parsedData);
        updateHistory(currentData.name);

      } else {
        // Open-Meteo Mode
        // 1. Resolve latitude/longitude using free keyless Geocoding API
        const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
        
        if (!geoRes.data.results || geoRes.data.results.length === 0) {
          throw new Error(`Could not find the city "${query}". Please verify the name.`);
        }

        const geo = geoRes.data.results[0];
        const { latitude, longitude, name: resolvedName, country_code: country, admin1 } = geo;

        // 2. Fetch forecast and current weather
        const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`);
        
        const data = weatherRes.data;

        const formatTimeStr = (isoStr) => {
          try {
            const date = new Date(isoStr);
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          } catch (e) {
            return '--:--';
          }
        };

        // Map forecast array
        const forecast = data.daily.time.map((timeStr, idx) => {
          const wmoCode = data.daily.weather_code[idx];
          const { text, icon } = mapWmoToTextAndIcon(wmoCode);
          const dateObj = new Date(timeStr);
          const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          return {
            date: formattedDate,
            tempMax: data.daily.temperature_2m_max[idx],
            tempMin: data.daily.temperature_2m_min[idx],
            conditionText: text,
            weatherCode: wmoCode,
            iconName: icon,
          };
        });

        const { text: currentText, icon: currentIcon } = mapWmoToTextAndIcon(data.current.weather_code);

        const parsedData = {
          city: admin1 ? `${resolvedName}, ${admin1}` : resolvedName,
          country: country || '',
          temperature: data.current.temperature_2m,
          feelsLike: data.current.apparent_temperature,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          weatherCode: data.current.weather_code,
          conditionText: currentText,
          iconName: currentIcon,
          precipitation: data.current.precipitation,
          sunrise: formatTimeStr(data.daily.sunrise[0]),
          sunset: formatTimeStr(data.daily.sunset[0]),
          isDay: data.current.is_day === 1,
          forecast,
          source: 'Open-Meteo',
        };

        setWeather(parsedData);
        updateHistory(resolvedName);
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        setError('Unauthorized: Your OpenWeatherMap API Key is invalid or not yet active. Keys can take up to 2 hours to activate.');
      } else if (err.response && err.response.status === 404) {
        setError(`City "${query}" not found. Please try another search.`);
      } else {
        setError(err.message || 'An error occurred while fetching the weather. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Keep search history synchronized & capped at 5 items
  const updateHistory = (cityName) => {
    setSearchHistory(prev => {
      const cleanName = cityName.trim();
      const filtered = prev.filter(c => c.toLowerCase() !== cleanName.toLowerCase());
      const updated = [cleanName, ...filtered].slice(0, 5);
      localStorage.setItem('weather_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Convert values based on Unit selection
  const formatTemp = (celsius) => {
    if (tempUnit === 'F') {
      const fahrenheit = (celsius * 9) / 5 + 32;
      return `${Math.round(fahrenheit)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (cityInput.trim()) {
      setCurrentSearch(cityInput.trim());
      setCityInput('');
    }
  };

  const handleSaveSettings = (source, apiKey) => {
    setDataSource(source);
    setOwmApiKey(apiKey);
    localStorage.setItem('weather_source', source);
    localStorage.setItem('weather_owm_key', apiKey);
    setShowSettings(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('weather_history');
  };

  // Dynamic style parameters based on weather condition (glow neon lighting behind)
  const getWeatherMoodStyles = () => {
    if (!weather) return {
      glowColorTop: 'bg-blue-600/10',
      glowColorBottom: 'bg-indigo-600/10',
      accentColor: 'text-sky-400',
      accentBg: 'bg-sky-500/10',
      borderColor: 'border-slate-800/60',
      badgeColor: 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
    };

    const code = weather.iconName;
    if (code === 'Sun') {
      return {
        glowColorTop: 'bg-amber-500/10',
        glowColorBottom: 'bg-orange-600/10',
        accentColor: 'text-amber-400',
        accentBg: 'bg-amber-500/15',
        borderColor: 'border-amber-900/30',
        badgeColor: 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
      };
    }
    if (['CloudRain', 'CloudDrizzle'].includes(code)) {
      return {
        glowColorTop: 'bg-blue-500/10',
        glowColorBottom: 'bg-sky-600/10',
        accentColor: 'text-blue-400',
        accentBg: 'bg-blue-500/15',
        borderColor: 'border-blue-900/30',
        badgeColor: 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
      };
    }
    if (code === 'CloudLightning') {
      return {
        glowColorTop: 'bg-purple-500/10',
        glowColorBottom: 'bg-violet-600/10',
        accentColor: 'text-purple-400',
        accentBg: 'bg-purple-500/15',
        borderColor: 'border-purple-900/30',
        badgeColor: 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
      };
    }
    if (code === 'Snowflake') {
      return {
        glowColorTop: 'bg-cyan-500/10',
        glowColorBottom: 'bg-sky-600/10',
        accentColor: 'text-cyan-400',
        accentBg: 'bg-cyan-500/15',
        borderColor: 'border-cyan-900/30',
        badgeColor: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
      };
    }
    if (code === 'CloudFog') {
      return {
        glowColorTop: 'bg-slate-500/10',
        glowColorBottom: 'bg-zinc-600/10',
        accentColor: 'text-slate-400',
        accentBg: 'bg-slate-500/15',
        borderColor: 'border-slate-800/60',
        badgeColor: 'bg-slate-500/15 text-slate-300 border border-slate-500/20'
      };
    }
    // Default / cloudy
    return {
      glowColorTop: 'bg-blue-600/10',
      glowColorBottom: 'bg-indigo-600/10',
      accentColor: 'text-sky-400',
      accentBg: 'bg-sky-500/10',
      borderColor: 'border-slate-800/60',
      badgeColor: 'bg-sky-500/15 text-sky-300 border border-sky-500/20'
    };
  };

  const mood = getWeatherMoodStyles();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden py-10 px-4 sm:px-6 lg:px-12 font-sans" id="weather-app-container">
      {/* Background Neon Orbs */}
      <div className={`absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] ${mood.glowColorTop} rounded-full blur-[100px] sm:blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none transition-all duration-700`} id="ambient-glow-top-right"></div>
      <div className={`absolute bottom-0 left-0 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] ${mood.glowColorBottom} rounded-full blur-[80px] sm:blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-700`} id="ambient-glow-bottom-left"></div>

      <div className="max-w-6xl mx-auto relative z-10" id="weather-app-wrapper">
        
        {/* ==========================================
            HEADER & GLOBAL ACTIONS (Pill theme)
            ========================================== */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b border-slate-900 pb-6" id="weather-app-header">
          <div className="flex items-center gap-3" id="app-logo-area">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 animate-[pulse_3s_infinite]" id="logo-icon-box">
              <Sun className="w-6 h-6 text-white" id="app-logo-sun-icon" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-slate-50" id="app-title-main">SkyCast.io</h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider" id="app-subtitle-source">
                PROVIDER / <span className="font-semibold text-slate-400 uppercase">{weather?.source || (dataSource === 'open-meteo' ? 'Open-Meteo' : 'OpenWeatherMap')}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4" id="header-controls">
            {/* Celsius / Fahrenheit Toggle */}
            <div className="bg-slate-900/80 p-1 rounded-full border border-slate-800/60 shadow-inner flex gap-1" id="temp-unit-toggle">
              <button
                id="btn-unit-c"
                onClick={() => setTempUnit('C')}
                className={`px-4 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  tempUnit === 'C'
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                °C
              </button>
              <button
                id="btn-unit-f"
                onClick={() => setTempUnit('F')}
                className={`px-4 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  tempUnit === 'F'
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                °F
              </button>
            </div>

            {/* Config & Settings Button */}
            <button
              id="btn-toggle-settings"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-full bg-slate-900/80 border border-slate-800/80 hover:bg-slate-800 shadow-sm transition-all text-slate-400 hover:text-slate-100 relative cursor-pointer ${
                showSettings ? 'ring-2 ring-sky-500/30 bg-slate-800' : ''
              }`}
              title="API & Settings"
            >
              <Settings className="w-5 h-5" id="settings-cog-icon" />
              {!owmApiKey && dataSource === 'openweathermap' && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" id="api-alert-ping" />
              )}
            </button>
          </div>
        </header>

        {/* ==========================================
            SETTINGS COMPONENT (Drawer/Expandable)
            ========================================== */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              id="settings-drawer"
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 30 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 border border-slate-800 shadow-xl text-slate-100" id="settings-card">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800" id="settings-header">
                  <h3 className="font-bold tracking-wider text-slate-200 flex items-center gap-2 text-sm" id="settings-title">
                    <Database className="w-4 h-4 text-sky-400" />
                    WEATHER DATA PROVIDER CONFIGURATION
                  </h3>
                  <button
                    id="btn-close-settings"
                    onClick={() => setShowSettings(false)}
                    className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-5" id="settings-body">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3" id="lbl-data-source">
                      Select Weather Source
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="source-radio-grid">
                      <button
                        id="radio-source-om"
                        type="button"
                        onClick={() => handleSaveSettings('open-meteo', owmApiKey)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          dataSource === 'open-meteo'
                            ? 'border-sky-500 bg-sky-950/20 text-slate-100 font-medium'
                            : 'border-slate-800 hover:border-slate-700 text-slate-400 bg-slate-900/40'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold">Open-Meteo API</span>
                          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/20">Keyless / Free</span>
                        </div>
                        <p className="text-xs text-slate-500 font-normal leading-relaxed">No API Key required. Highly reliable, instant lookup with 7-day weather forecast.</p>
                      </button>

                      <button
                        id="radio-source-owm"
                        type="button"
                        onClick={() => handleSaveSettings('openweathermap', owmApiKey)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          dataSource === 'openweathermap'
                            ? 'border-sky-500 bg-sky-950/20 text-slate-100 font-medium'
                            : 'border-slate-800 hover:border-slate-700 text-slate-400 bg-slate-900/40'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold">OpenWeatherMap</span>
                          <span className="text-[9px] bg-amber-500/15 text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/20">Key Required</span>
                        </div>
                        <p className="text-xs text-slate-500 font-normal leading-relaxed">Requires a personal API Key. High accuracy global cities data and 5-day forecast.</p>
                      </button>
                    </div>
                  </div>

                  {dataSource === 'openweathermap' && (
                    <motion.div
                      id="owm-api-key-form"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800"
                    >
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5" id="lbl-api-key">
                        <Key className="w-3.5 h-3.5 text-sky-400" />
                        OpenWeatherMap API Key
                      </label>
                      <div className="flex gap-2" id="api-input-row">
                        <input
                          id="input-api-key"
                          type="password"
                          placeholder="Paste your API Key here..."
                          value={owmApiKey}
                          onChange={(e) => setOwmApiKey(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        <button
                          id="btn-save-key"
                          onClick={() => handleSaveSettings('openweathermap', owmApiKey)}
                          className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-sky-500/10 cursor-pointer"
                        >
                          Save Key
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed" id="api-key-instructions">
                        Get a free API key by signing up on{' '}
                        <a
                          href="https://openweathermap.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline font-semibold"
                        >
                          openweathermap.org
                        </a>
                        . Newly created keys can take up to 2 hours to become fully active.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==========================================
            SEARCH BAR & POPULAR CITIES (Bold Design)
            ========================================== */}
        <section className="bg-slate-900/30 backdrop-blur-md rounded-3xl p-6 border border-slate-800/60 shadow-lg mb-8 space-y-5" id="search-section">
          <form onSubmit={handleSearchSubmit} className="flex gap-3" id="search-form">
            <div className="relative flex-1" id="search-input-container">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" id="search-lens-icon" />
              <input
                id="input-city-search"
                type="text"
                placeholder="Search weather by city name (e.g. Reykjavik, New York, Tokyo)..."
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-full pl-12 pr-4 py-3.5 text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm transition-all"
              />
            </div>
            <button
              id="btn-search-submit"
              type="submit"
              disabled={loading}
              className={`px-6 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                loading
                  ? 'bg-slate-800 text-slate-500 border border-slate-700'
                  : 'bg-sky-500 text-white hover:bg-sky-400 shadow-sky-500/10 active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" id="spin-refresh-icon" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Search</span>
            </button>
          </form>

          {/* Popular Cities Quick Buttons (Rounded Pill design) */}
          <div className="flex flex-wrap items-center gap-2 text-xs" id="quick-cities-area">
            <span className="text-slate-500 font-bold uppercase tracking-wider mr-1 text-[10px]">Popular:</span>
            {QUICK_CITIES.map((city) => (
              <button
                id={`btn-quick-${city.toLowerCase().replace(/\s+/g, '-')}`}
                key={city}
                type="button"
                onClick={() => setCurrentSearch(city)}
                className={`px-4 py-1.5 rounded-full border text-slate-400 hover:text-slate-100 bg-slate-900/40 border-slate-800/60 hover:border-slate-700 transition-all font-semibold cursor-pointer ${
                  currentSearch.toLowerCase() === city.toLowerCase()
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30 font-bold'
                    : ''
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          {/* Search History Panel */}
          {searchHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-900 text-xs" id="search-history-row">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> RECENT:
              </span>
              <div className="flex flex-wrap gap-2 flex-1" id="history-items-container">
                {searchHistory.map((histCity, i) => (
                  <button
                    id={`btn-history-${i}-${histCity.toLowerCase().replace(/\s+/g, '-')}`}
                    key={`${histCity}-${i}`}
                    type="button"
                    onClick={() => setCurrentSearch(histCity)}
                    className="px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/40 hover:bg-slate-800 hover:border-slate-700 text-slate-300 transition-all cursor-pointer text-xs"
                  >
                    {histCity}
                  </button>
                ))}
              </div>
              <button
                id="btn-clear-history"
                type="button"
                onClick={clearHistory}
                className="text-[10px] text-rose-500 hover:text-rose-400 font-black uppercase tracking-wider cursor-pointer"
              >
                CLEAR
              </button>
            </div>
          )}
        </section>

        {/* ==========================================
            LOADING / ERROR STATE DISPLAY
            ========================================== */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              id="error-banner"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-rose-950/40 border border-rose-900/50 rounded-3xl p-6 mb-8 flex gap-4 items-start"
            >
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" id="error-alert-icon" />
              <div className="flex-1" id="error-alert-text">
                <h4 className="font-bold text-rose-200 mb-1 tracking-wider uppercase text-xs">Weather Lookup Error</h4>
                <p className="text-sm text-rose-300 leading-relaxed">{error}</p>
                {dataSource === 'openweathermap' && (
                  <button
                    id="btn-err-switch-om"
                    onClick={() => handleSaveSettings('open-meteo', owmApiKey)}
                    className="mt-3 text-[10px] uppercase tracking-wider bg-rose-500 text-white hover:bg-rose-400 font-bold px-4 py-2 rounded-full transition-all cursor-pointer"
                  >
                    Switch to Free Open-Meteo (Works instantly!)
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div
              id="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Giant Card Skeleton matching Bold style */}
              <div className="animate-pulse space-y-6" id="skele-card-main">
                <div className="h-4 bg-slate-800 rounded-md w-1/4" />
                <div className="h-32 bg-slate-800 rounded-2xl w-2/3" />
                <div className="h-16 bg-slate-800 rounded-xl w-1/2" />
              </div>
              {/* Grid skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6" id="skele-metrics-grid">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-slate-900/30 h-32 rounded-3xl border border-slate-800/40 animate-pulse" />
                ))}
              </div>
            </motion.div>
          )}

          {/* ==========================================
              MAIN WEATHER DATA DISPLAY (Bold Typography Theme)
              ========================================== */}
          {!loading && weather && (
            <motion.main
              id="weather-data-main"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-12"
            >
              {/* PRIMARY CURRENT CONDITIONS DISPLAY */}
              <div className="flex flex-col relative z-10" id="current-conditions-display">
                <p className="text-sky-400 font-bold tracking-[0.2em] uppercase text-xs sm:text-sm mb-2 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                  </span>
                  Current Conditions / {weather.isDay ? 'DAY' : 'NIGHT'}
                </p>
                
                <h1 className="text-8xl sm:text-[11rem] md:text-[14rem] font-black leading-[0.8] tracking-tighter flex items-start text-slate-50 mb-4" id="display-large-temp">
                  {Math.round(weather.temperature)}
                  <span className="text-2xl sm:text-4xl md:text-5xl mt-4 sm:mt-12 font-bold text-slate-400 select-none">°{tempUnit}</span>
                </h1>

                <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-10 mt-4" id="display-title-meta">
                  <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-slate-50 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {weather.city}
                    <span className="text-xs sm:text-sm bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest shrink-0">
                      {weather.country}
                    </span>
                  </h2>
                  <div className="flex flex-col md:border-l md:border-slate-800 md:pl-8">
                    <span className="text-xl sm:text-2xl font-semibold text-slate-300 capitalize flex items-center gap-2">
                      <WeatherIcon name={weather.iconName} className="w-6 h-6 text-sky-400" />
                      {weather.conditionText}
                    </span>
                    <span className="text-xs sm:text-sm text-sky-400 font-bold uppercase tracking-widest mt-1.5">
                      High {formatTemp(Math.max(...weather.forecast.map(f => f.tempMax)))} / Low {formatTemp(Math.min(...weather.forecast.map(f => f.tempMin)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* METRICS DETAIL GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="grid-metrics-details">
                
                {/* 1. Feels Like */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 p-6 rounded-3xl flex flex-col justify-between" id="metric-feels-like">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Feels Like</p>
                  <p className="text-3xl font-bold text-slate-50">{formatTemp(weather.feelsLike)}</p>
                  <div className="w-full h-1 bg-slate-800 mt-5 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${Math.min(Math.max((weather.feelsLike + 10) * 2, 5), 100)}%` }}></div>
                  </div>
                </div>

                {/* 2. Humidity */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 p-6 rounded-3xl flex flex-col justify-between" id="metric-humidity">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Humidity</p>
                  <p className="text-3xl font-bold text-slate-50">{weather.humidity}%</p>
                  <div className="w-full h-1 bg-slate-800 mt-5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${weather.humidity}%` }}></div>
                  </div>
                </div>

                {/* 3. Wind Speed */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 p-6 rounded-3xl flex flex-col justify-between" id="metric-wind">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Wind Speed</p>
                  <p className="text-3xl font-bold text-slate-50 uppercase">{Math.round(weather.windSpeed)} <span className="text-sm text-slate-400">km/h</span></p>
                  <div className="flex items-center gap-1.5 mt-4 text-[10px] font-black uppercase tracking-wider text-sky-400">
                    <Compass className="w-4 h-4 text-sky-400 animate-[spin_12s_linear_infinite]" />
                    WIND VELOCITY
                  </div>
                </div>

                {/* 4. Precipitation */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 p-6 rounded-3xl flex flex-col justify-between" id="metric-precipitation">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Precipitation</p>
                  <p className="text-3xl font-bold text-slate-50">{weather.precipitation} <span className="text-sm text-slate-400">mm</span></p>
                  <div className="w-full h-1 bg-slate-800 mt-5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(Math.max(weather.precipitation * 15, 0), 100)}%` }}></div>
                  </div>
                </div>

              </div>

              {/* MULTI-DAY FORECAST SECTION */}
              <section className="bg-slate-900/20 backdrop-blur-md rounded-3xl p-8 border border-slate-800/40 shadow-xs" id="weather-forecast-block">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 pb-4 border-b border-slate-800/60 gap-3" id="forecast-header">
                  <h3 className="font-black uppercase tracking-tight text-slate-200 flex items-center gap-2.5 text-lg" id="forecast-title">
                    <Calendar className={`w-5 h-5 ${mood.accentColor}`} />
                    Multi-Day Forecast
                  </h3>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full ${mood.badgeColor}`} id="forecast-source-badge">
                    Source: {weather.source}
                  </span>
                </div>

                {/* Forecast Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4" id="forecast-card-grid">
                  {weather.forecast.map((day, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div
                        id={`forecast-card-${idx}`}
                        key={day.date}
                        className={`rounded-2xl p-5 border flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-lg ${
                          isFirst
                            ? 'bg-slate-900/60 border-sky-500/30'
                            : 'bg-slate-900/30 border-slate-800/40 hover:bg-slate-900/50'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2" id={`f-date-${idx}`}>
                          {isFirst ? 'TODAY' : day.date.toUpperCase()}
                        </span>
                        
                        <div className="my-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/50 text-slate-300" id={`f-icon-box-${idx}`}>
                          <WeatherIcon name={day.iconName} className="w-8 h-8" />
                        </div>

                        <span className="text-xs text-slate-400 font-medium line-clamp-1 h-4 max-w-full capitalize" id={`f-desc-${idx}`} title={day.conditionText}>
                          {day.conditionText}
                        </span>

                        <div className="mt-4 flex items-center gap-1.5 text-xs font-mono" id={`f-temps-${idx}`}>
                          <span className="font-bold text-rose-400" id={`f-max-${idx}`}>
                            {formatTemp(day.tempMax)}
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className="text-sky-400" id={`f-min-${idx}`}>
                            {formatTemp(day.tempMin)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* API FOOTER */}
              <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest pt-4 border-t border-slate-900" id="app-footer-bar">
                <div>Data provided by {weather.source === 'Open-Meteo' ? 'Open-Meteo free API' : 'OpenWeather API'}</div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" /> LAST UPDATED: JUST NOW
                </div>
              </footer>

            </motion.main>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
