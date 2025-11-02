import React, { useState, useEffect, useReducer, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Cloud, Sun, CloudRain, Wind, Droplets, Eye, Gauge, CloudSnow, CloudDrizzle, CloudFog, Zap, Search, Star, Settings, X, TrendingUp, Calendar, Clock, MapPin, RefreshCw, LogIn, LogOut, Menu, Home, Sunrise, Sunset, Navigation, Thermometer, CloudHail, Waves, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const initialState = {
  cities: [],
  favorites: [],
  selectedCity: null,
  searchQuery: '',
  searchResults: [],
  tempUnit: 'C',
  loading: false,
  error: null,
  lastUpdate: null,
  user: null,
  showSettings: false,
  cache: {},
  activeTab: 'dashboard',
  showNotifications: true,
  notifications: []
};

function weatherReducer(state, action) {
  switch (action.type) {
    case 'SET_CITIES':
      return { ...state, cities: action.payload, lastUpdate: Date.now() };
    case 'ADD_FAVORITE':
      return { ...state, favorites: [...state.favorites, action.payload] };
    case 'REMOVE_FAVORITE':
      return { ...state, favorites: state.favorites.filter(f => f !== action.payload) };
    case 'SET_SELECTED_CITY':
      return { ...state, selectedCity: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    case 'TOGGLE_TEMP_UNIT':
      return { ...state, tempUnit: state.tempUnit === 'C' ? 'F' : 'C' };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'TOGGLE_SETTINGS':
      return { ...state, showSettings: !state.showSettings };
    case 'UPDATE_CACHE':
      return { ...state, cache: { ...state.cache, [action.key]: { data: action.data, timestamp: Date.now() } } };
    case 'LOAD_FAVORITES':
      return { ...state, favorites: action.payload };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

const WeatherIcon = ({ condition, size = 24, className = "" }) => {
  const iconMap = {
    'clear': Sun,
    'sunny': Sun,
    'clouds': Cloud,
    'cloudy': Cloud,
    'rain': CloudRain,
    'drizzle': CloudDrizzle,
    'snow': CloudSnow,
    'mist': CloudFog,
    'fog': CloudFog,
    'thunderstorm': Zap,
    'wind': Wind,
    'hail': CloudHail
  };
  
  const conditionLower = condition?.toLowerCase() || '';
  let IconComponent = Cloud;
  
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (conditionLower.includes(key)) {
      IconComponent = Icon;
      break;
    }
  }
  
  return <IconComponent size={size} className={className} />;
};

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = '923134656521-ke5vq0qd84l57h9o1vbvs0773obtfasq.apps.googleusercontent.com'; // Replace with your actual Google Client ID
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

export default function WeatherDashboard() {
  const [state, dispatch] = useReducer(weatherReducer, initialState);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [googleAuth, setGoogleAuth] = useState(null);
  const API_KEY = '5d7751b3997e42e283f84839250211';

  // Indian cities for dashboard
  const defaultIndianCities = ['Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad'];

  // Initialize Google Auth
  useEffect(() => {
    const initializeGoogleAuth = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignIn,
          auto_select: false,
          context: 'signin',
        });
        
        const auth = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GOOGLE_SCOPES,
          callback: handleGoogleTokenResponse,
        });
        
        setGoogleAuth(auth);
      }
    };

    // Load Google Identity Services script
    const loadGoogleScript = () => {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initializeGoogleAuth;
        document.head.appendChild(script);
      } else {
        initializeGoogleAuth();
      }
    };

    loadGoogleScript();
  }, []);

  useEffect(() => {
    checkAuthState();
    loadUserPreferences();
  }, []);

  const handleGoogleTokenResponse = async (tokenResponse) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Get user info using the access token
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenResponse.access_token}`
        }
      });
      
      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      const userInfo = await userInfoResponse.json();
      
      // Create user object
      const user = {
        id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        accessToken: tokenResponse.access_token
      };
      
      // Save user session
      await window.storage?.set('current_user', JSON.stringify(user));
      await window.storage?.set('google_access_token', tokenResponse.access_token);
      
      // Load user's favorites
      await loadUserFavorites(user.id);
      
      dispatch({ type: 'SET_USER', payload: user });
      addNotification(`Welcome back, ${user.name}!`, 'success');
      
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      addNotification('Sign-in failed. Please try again.', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleGoogleSignIn = (response) => {
    // This handles the One Tap UI response
    if (response.credential) {
      // Decode the JWT token to get user info
      const userInfo = JSON.parse(atob(response.credential.split('.')[1]));
      
      const user = {
        id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
      };
      
      // Save user session
      window.storage?.set('current_user', JSON.stringify(user));
      loadUserFavorites(user.id);
      
      dispatch({ type: 'SET_USER', payload: user });
      addNotification(`Welcome back, ${user.name}!`, 'success');
    }
  };

  const triggerGoogleSignIn = () => {
    if (googleAuth) {
      googleAuth.requestAccessToken();
    }
  };

  // Check if user is already logged in
  const checkAuthState = async () => {
    try {
      const userData = await window.storage?.get('current_user');
      if (userData?.value) {
        const user = JSON.parse(userData.value);
        
        // Check if we have a valid access token
        const token = await window.storage?.get('google_access_token');
        if (token?.value) {
          user.accessToken = token.value;
        }
        
        dispatch({ type: 'SET_USER', payload: user });
        await loadUserFavorites(user.id);
      } else {
        // Load default cities for non-logged in users
        loadDefaultCities();
      }
    } catch (error) {
      console.log('No user session found');
      loadDefaultCities();
    }
  };

  const loadDefaultCities = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const results = await Promise.all(defaultIndianCities.map(city => fetchWeatherData(city)));
    const validResults = results.filter(r => r !== null);
    dispatch({ type: 'SET_CITIES', payload: validResults });
    dispatch({ type: 'SET_LOADING', payload: false });
  };

  const loadUserFavorites = async (userId) => {
    try {
      const result = await window.storage?.get(`favorites_${userId}`);
      if (result?.value) {
        const favs = JSON.parse(result.value);
        dispatch({ type: 'LOAD_FAVORITES', payload: favs });
        
        // Load both default cities and user favorites
        const citiesToLoad = [...defaultIndianCities, ...favs];
        const uniqueCities = [...new Set(citiesToLoad)];
        
        const results = await Promise.all(uniqueCities.map(city => fetchWeatherData(city)));
        const validResults = results.filter(r => r !== null);
        dispatch({ type: 'SET_CITIES', payload: validResults });
      } else {
        // Load default cities if no favorites
        loadDefaultCities();
      }
    } catch (error) {
      console.log('No favorites found for user');
      loadDefaultCities();
    }
  };

  const loadUserPreferences = async () => {
    try {
      const result = await window.storage?.get('user_preferences');
      if (result?.value) {
        const prefs = JSON.parse(result.value);
        if (prefs.tempUnit && prefs.tempUnit !== state.tempUnit) {
          dispatch({ type: 'TOGGLE_TEMP_UNIT' });
        }
      }
    } catch (error) {
      console.log('No preferences found');
    }
  };

  const saveUserFavorites = async (favorites, userId) => {
    try {
      await window.storage?.set(`favorites_${userId}`, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  };

  const saveUserPreferences = async (tempUnit) => {
    try {
      await window.storage?.set('user_preferences', JSON.stringify({ tempUnit }));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id, message, type } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    }, 5000);
  };

  const fetchWeatherData = useCallback(async (city) => {
    const cacheKey = `weather_${city}`;
    const cached = state.cache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&days=7&aqi=yes&alerts=yes`
      );
      
      if (!response.ok) throw new Error('Failed to fetch weather data');
      
      const data = await response.json();
      dispatch({ type: 'UPDATE_CACHE', key: cacheKey, data });
      
      if (data.alerts?.alert?.length > 0) {
        addNotification(`Weather Alert in ${city}: ${data.alerts.alert[0].headline}`, 'warning');
      }
      
      return data;
    } catch (error) {
      console.error('Weather fetch error:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      addNotification('Failed to fetch weather data', 'error');
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.cache]);

  const searchCities = useCallback(async (query) => {
    if (!query || query.length < 2) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }

    try {
      const response = await fetch(
        `https://api.weatherapi.com/v1/search.json?key=${API_KEY}&q=${query}`
      );
      const data = await response.json();
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: data });
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, []);

  useEffect(() => {
    if (state.favorites.length > 0) {
      const interval = setInterval(() => {
        state.favorites.forEach(city => fetchWeatherData(city));
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [state.favorites, fetchWeatherData]);

  const handleAddFavorite = async (cityName) => {
    if (!state.favorites.includes(cityName)) {
      const newFavorites = [...state.favorites, cityName];
      dispatch({ type: 'ADD_FAVORITE', payload: cityName });
      
      // Save to user-specific storage if logged in
      if (state.user) {
        await saveUserFavorites(newFavorites, state.user.id);
      } else {
        // Save to local storage for non-logged in users
        await window.storage?.set('local_favorites', JSON.stringify(newFavorites));
      }
      
      addNotification(`${cityName} added to favorites`, 'success');
      
      // Fetch weather data if not already in cities
      const cityExists = state.cities.some(c => c.location.name === cityName);
      if (!cityExists) {
        const data = await fetchWeatherData(cityName);
        if (data) {
          dispatch({ type: 'SET_CITIES', payload: [...state.cities, data] });
        }
      }
    }
  };

  const handleRemoveFavorite = async (cityName) => {
    const newFavorites = state.favorites.filter(f => f !== cityName);
    dispatch({ type: 'REMOVE_FAVORITE', payload: cityName });
    
    // Save to user-specific storage if logged in
    if (state.user) {
      await saveUserFavorites(newFavorites, state.user.id);
    } else {
      // Save to local storage for non-logged in users
      await window.storage?.set('local_favorites', JSON.stringify(newFavorites));
    }
    
    addNotification(`${cityName} removed from favorites`, 'info');
  };

  const handleCitySelect = async (cityName) => {
    const data = await fetchWeatherData(cityName);
    if (data) {
      dispatch({ type: 'SET_SELECTED_CITY', payload: data });
      dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    }
  };

  const handleSearchResultClick = async (city) => {
    await handleCitySelect(city.name);
  };

  const toggleTempUnit = async () => {
    const newUnit = state.tempUnit === 'C' ? 'F' : 'C';
    dispatch({ type: 'TOGGLE_TEMP_UNIT' });
    await saveUserPreferences(newUnit);
    addNotification(`Temperature unit changed to °${newUnit}`, 'success');
  };

  const convertTemp = (temp) => {
    if (state.tempUnit === 'F') {
      return Math.round(temp * 9/5 + 32);
    }
    return Math.round(temp);
  };

  const handleSignOut = async () => {
    try {
      const userName = state.user?.name || 'User';
      
      // Clear user session
      await window.storage?.remove('current_user');
      await window.storage?.remove('google_access_token');
      
      // Revoke Google token
      if (state.user?.accessToken && window.google) {
        window.google.accounts.oauth2.revoke(state.user.accessToken);
      }
      
      // Load local favorites if any
      const localFavs = await window.storage?.get('local_favorites');
      if (localFavs?.value) {
        const favs = JSON.parse(localFavs.value);
        dispatch({ type: 'LOAD_FAVORITES', payload: favs });
      } else {
        dispatch({ type: 'LOAD_FAVORITES', payload: [] });
      }
      
      // Reload default cities
      await loadDefaultCities();
      
      dispatch({ type: 'SET_USER', payload: null });
      addNotification(`Goodbye, ${userName}! Signed out successfully.`, 'info');
    } catch (error) {
      console.error('Sign out error:', error);
      addNotification('Sign out failed', 'error');
    }
  };

  const getWeatherGradient = (condition) => {
    const cond = condition?.toLowerCase() || '';
    if (cond.includes('clear') || cond.includes('sunny')) return 'from-amber-400 via-orange-500 to-pink-500';
    if (cond.includes('cloud')) return 'from-slate-400 via-slate-500 to-slate-600';
    if (cond.includes('rain')) return 'from-blue-400 via-blue-600 to-indigo-700';
    if (cond.includes('snow')) return 'from-blue-100 via-blue-200 to-blue-300';
    if (cond.includes('thunder')) return 'from-purple-600 via-indigo-700 to-gray-800';
    return 'from-blue-500 via-cyan-500 to-teal-500';
  };

  const CityCard = ({ weather }) => {
    const isFavorite = state.favorites.includes(weather.location.name);
    const gradient = getWeatherGradient(weather.current.condition.text);
    
    return (
      <div 
        className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 text-white cursor-pointer hover:shadow-2xl transition-all duration-500 hover:scale-105 relative overflow-hidden group`}
        onClick={() => handleCitySelect(weather.location.name)}
      >
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-3xl font-bold mb-1">{weather.location.name}</h3>
              <p className="text-white/80 text-sm flex items-center gap-1">
                <MapPin size={14} />
                {weather.location.region}, {weather.location.country}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                isFavorite ? handleRemoveFavorite(weather.location.name) : handleAddFavorite(weather.location.name);
              }}
              className="hover:scale-125 transition-transform duration-300 bg-white/20 p-2 rounded-full backdrop-blur-sm"
            >
              <Star size={20} fill={isFavorite ? 'white' : 'none'} />
            </button>
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                <WeatherIcon condition={weather.current.condition.text} size={56} />
              </div>
              <div>
                <span className="text-7xl font-bold tracking-tight">
                  {convertTemp(weather.current.temp_c)}°
                </span>
                <p className="text-xl text-white/90 mt-1">{weather.current.condition.text}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Feels like</span>
              <span className="font-semibold">{convertTemp(weather.current.feelslike_c)}°</span>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/20">
              <div className="text-center">
                <Droplets size={20} className="mx-auto mb-1 opacity-80" />
                <p className="text-xs text-white/70">Humidity</p>
                <p className="font-bold">{weather.current.humidity}%</p>
              </div>
              <div className="text-center">
                <Wind size={20} className="mx-auto mb-1 opacity-80" />
                <p className="text-xs text-white/70">Wind</p>
                <p className="font-bold">{weather.current.wind_kph} km/h</p>
              </div>
              <div className="text-center">
                <Eye size={20} className="mx-auto mb-1 opacity-80" />
                <p className="text-xs text-white/70">Visibility</p>
                <p className="font-bold">{weather.current.vis_km} km</p>
              </div>
            </div>
          </div>

          {weather.current.air_quality && (
            <div className="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-white/80">Air Quality</span>
              <span className="font-bold text-lg">{Math.round(weather.current.air_quality['us-epa-index'] || 0)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Filter cities based on active tab
  const getDisplayedCities = () => {
    if (state.activeTab === 'favorites') {
      // Show only favorited cities
      return state.cities.filter(city => state.favorites.includes(city.location.name));
    } else {
      // Show all cities (Indian cities + favorites) in dashboard
      return state.cities;
    }
  };

  const DetailedView = ({ weather }) => {
    const [activeChart, setActiveChart] = useState('temperature');
    const isFavorite = state.favorites.includes(weather.location.name);
    
    const hourlyData = weather.forecast.forecastday[0].hour.map(h => ({
      time: new Date(h.time).getHours() + ':00',
      temp: state.tempUnit === 'C' ? h.temp_c : h.temp_f,
      humidity: h.humidity,
      windSpeed: h.wind_kph,
      precipitation: h.precip_mm,
      feelsLike: state.tempUnit === 'C' ? h.feelslike_c : h.feelslike_f,
      uv: h.uv
    }));

    const dailyData = weather.forecast.forecastday.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      maxTemp: state.tempUnit === 'C' ? d.day.maxtemp_c : d.day.maxtemp_f,
      minTemp: state.tempUnit === 'C' ? d.day.mintemp_c : d.day.mintemp_f,
      avgTemp: state.tempUnit === 'C' ? d.day.avgtemp_c : d.day.avgtemp_f,
      condition: d.day.condition.text,
      precipitation: d.day.totalprecip_mm,
      humidity: d.day.avghumidity,
      maxWind: d.day.maxwind_kph,
      uv: d.day.uv
    }));

    const aqiData = weather.current.air_quality ? [
      { name: 'PM2.5', value: weather.current.air_quality.pm2_5 || 0, color: '#3b82f6' },
      { name: 'PM10', value: weather.current.air_quality.pm10 || 0, color: '#8b5cf6' },
      { name: 'O3', value: weather.current.air_quality.o3 || 0, color: '#ec4899' },
      { name: 'NO2', value: weather.current.air_quality.no2 || 0, color: '#f59e0b' },
    ] : [];

    const astroData = weather.forecast.forecastday[0].astro;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6 rounded-t-3xl flex justify-between items-start z-10 shadow-lg">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <MapPin size={32} className="animate-pulse" />
                <h2 className="text-4xl font-bold">{weather.location.name}</h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    isFavorite ? handleRemoveFavorite(weather.location.name) : handleAddFavorite(weather.location.name);
                  }}
                  className="hover:scale-125 transition-transform duration-300 bg-white/20 p-2 rounded-full backdrop-blur-sm ml-2"
                >
                  <Star size={24} fill={isFavorite ? 'white' : 'none'} />
                </button>
              </div>
              <p className="text-white/90 text-lg">{weather.location.region}, {weather.location.country}</p>
              <p className="text-white/70 mt-2 flex items-center gap-2">
                <Clock size={16} />
                {new Date(weather.location.localtime).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_SELECTED_CITY', payload: null })}
              className="hover:bg-white/20 p-3 rounded-full transition-all duration-300 hover:rotate-90"
            >
              <X size={32} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Current Weather Highlight */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-6">
                <div className="flex items-center gap-6">
                  <div className="bg-white/20 p-6 rounded-3xl backdrop-blur-lg">
                    <WeatherIcon condition={weather.current.condition.text} size={80} />
                  </div>
                  <div>
                    <p className="text-7xl font-bold mb-2">
                      {convertTemp(weather.current.temp_c)}°
                    </p>
                    <p className="text-2xl mb-2">{weather.current.condition.text}</p>
                    <p className="text-lg text-white/80">Feels like {convertTemp(weather.current.feelslike_c)}°</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-center min-w-[120px]">
                    <Thermometer className="mx-auto mb-2" size={28} />
                    <p className="text-xs text-white/70 mb-1">High/Low</p>
                    <p className="text-xl font-bold">
                      {convertTemp(dailyData[0].maxTemp)}° / {convertTemp(dailyData[0].minTemp)}°
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-center min-w-[120px]">
                    <Droplets className="mx-auto mb-2" size={28} />
                    <p className="text-xs text-white/70 mb-1">Humidity</p>
                    <p className="text-xl font-bold">{weather.current.humidity}%</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-center min-w-[120px]">
                    <Wind className="mx-auto mb-2" size={28} />
                    <p className="text-xs text-white/70 mb-1">Wind</p>
                    <p className="text-xl font-bold">{weather.current.wind_kph} km/h</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 text-center min-w-[120px]">
                    <Sun className="mx-auto mb-2" size={28} />
                    <p className="text-xs text-white/70 mb-1">UV Index</p>
                    <p className="text-xl font-bold">{weather.current.uv}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow">
                <Gauge className="text-blue-500 mb-2" size={24} />
                <p className="text-gray-600 text-xs mb-1">Pressure</p>
                <p className="text-2xl font-bold text-gray-800">{weather.current.pressure_mb}</p>
                <p className="text-xs text-gray-500">mb</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow">
                <Waves className="text-cyan-500 mb-2" size={24} />
                <p className="text-gray-600 text-xs mb-1">Dew Point</p>
                <p className="text-2xl font-bold text-gray-800">{Math.round(weather.current.dewpoint_c)}°</p>
                <p className="text-xs text-gray-500">Celsius</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow">
                <Navigation className="text-purple-500 mb-2" size={24} />
                <p className="text-gray-600 text-xs mb-1">Wind Direction</p>
                <p className="text-2xl font-bold text-gray-800">{weather.current.wind_degree}°</p>
                <p className="text-xs text-gray-500">{weather.current.wind_dir}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow">
                <CloudRain className="text-indigo-500 mb-2" size={24} />
                <p className="text-gray-600 text-xs mb-1">Precipitation</p>
                <p className="text-2xl font-bold text-gray-800">{weather.current.precip_mm}</p>
                <p className="text-xs text-gray-500">mm</p>
              </div>
            </div>

            {/* Chart Selection Tabs */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {[
                  { id: 'temperature', label: 'Temperature', icon: Thermometer },
                  { id: 'precipitation', label: 'Precipitation', icon: CloudRain },
                  { id: 'wind', label: 'Wind Speed', icon: Wind },
                  { id: 'humidity', label: 'Humidity', icon: Droplets }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChart(tab.id)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold transition-all duration-300 whitespace-nowrap text-sm ${
                      activeChart === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-4">24-Hour Forecast</h3>
              <ResponsiveContainer width="100%" height={300}>
                {activeChart === 'temperature' && (
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #3b82f6', borderRadius: '12px', padding: '8px' }} />
                    <Area type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                  </AreaChart>
                )}
                {activeChart === 'precipitation' && (
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #3b82f6', borderRadius: '12px', padding: '8px' }} />
                    <Bar dataKey="precipitation" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                )}
                {activeChart === 'wind' && (
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #8b5cf6', borderRadius: '12px', padding: '8px' }} />
                    <Line type="monotone" dataKey="windSpeed" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                )}
                {activeChart === 'humidity' && (
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #06b6d4', borderRadius: '12px', padding: '8px' }} />
                    <Area type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorHumidity)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* 7-Day Forecast */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar size={28} className="text-blue-500" />
                7-Day Forecast
              </h3>
              <div className="space-y-3">
                {dailyData.map((day, idx) => (
                  <div key={idx} className="group bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 hover:scale-102">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <p className="font-bold text-gray-800 w-40 text-lg">{day.date}</p>
                        <div className="bg-white p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                          <WeatherIcon condition={day.condition} size={36} />
                        </div>
                        <p className="text-gray-700 font-medium flex-1">{day.condition}</p>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm">
                          <Droplets size={18} className="text-blue-500" />
                          <span className="font-semibold text-gray-700">{day.precipitation}mm</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm">
                          <Droplets size={18} className="text-cyan-500" />
                          <span className="font-semibold text-gray-700">{day.humidity}%</span>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <div className="flex items-center gap-2 justify-end">
                            <TrendingUp size={18} className="text-red-500" />
                            <span className="text-2xl font-bold text-gray-800">{Math.round(day.maxTemp)}°</span>
                          </div>
                          <span className="text-gray-500 text-lg">{Math.round(day.minTemp)}°</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Air Quality Index */}
            {weather.current.air_quality && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Wind size={28} className="text-green-500" />
                  Air Quality Index
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                    <div className="text-center mb-4">
                      <p className="text-6xl font-bold text-gray-800">{Math.round(weather.current.air_quality['us-epa-index'])}</p>
                      <p className="text-gray-600 mt-2">US EPA Index</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {aqiData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                        <span className="font-semibold text-gray-700">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((item.value / 100) * 100, 100)}%`, backgroundColor: item.color }}
                            />
                          </div>
                          <span className="font-bold text-gray-800 w-16 text-right">{Math.round(item.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sunrise & Sunset */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-orange-500 p-4 rounded-2xl">
                    <Sunrise size={32} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Sunrise</p>
                    <p className="text-3xl font-bold text-gray-800">{astroData.sunrise}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-indigo-500 p-4 rounded-2xl">
                    <Sunset size={32} className="text-white" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Sunset</p>
                    <p className="text-3xl font-bold text-gray-800">{astroData.sunset}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Moon Phase */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg text-white">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Cloud size={28} />
                Astronomical Data
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-white/70 mb-2">Moon Phase</p>
                  <p className="text-2xl font-bold">{astroData.moon_phase}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/70 mb-2">Moonrise</p>
                  <p className="text-2xl font-bold">{astroData.moonrise}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/70 mb-2">Moonset</p>
                  <p className="text-2xl font-bold">{astroData.moonset}</p>
                </div>
                <div className="text-center">
                  <p className="text-white/70 mb-2">Moon Illumination</p>
                  <p className="text-2xl font-bold">{astroData.moon_illumination}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Settings size={32} className="text-blue-500" />
            Settings
          </h2>
          <button onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })} className="text-gray-500 hover:text-gray-700 hover:rotate-90 transition-all">
            <X size={28} />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-800 font-bold text-lg">Temperature Unit</p>
                <p className="text-gray-600 text-sm mt-1">Choose your preferred unit</p>
              </div>
              <button
                onClick={toggleTempUnit}
                className={`relative w-20 h-10 rounded-full transition-all duration-300 ${
                  state.tempUnit === 'C' ? 'bg-blue-500' : 'bg-orange-500'
                }`}
              >
                <div className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full shadow-lg transition-transform duration-300 flex items-center justify-center font-bold ${
                  state.tempUnit === 'F' ? 'translate-x-10' : ''
                }`}>
                  °{state.tempUnit}
                </div>
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Auto Refresh</span>
              <CheckCircle size={24} className="text-green-500" />
            </div>
            <p className="text-sm text-gray-500">Data refreshes every 60 seconds</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">Smart Caching</span>
              <CheckCircle size={24} className="text-green-500" />
            </div>
            <p className="text-sm text-gray-500">Reduces API calls for faster loading</p>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle size={24} className="text-orange-500" />
              <span className="text-gray-700 font-medium">Weather Alerts</span>
            </div>
            <p className="text-sm text-gray-500">Get notified about severe weather</p>
          </div>
        </div>
      </div>
    </div>
  );

  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-300 z-50 ${
      sidebarOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Cloud size={32} className="text-blue-400" />
            <h2 className="text-2xl font-bold">Menu</h2>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="hover:bg-white/10 p-2 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Home },
            { id: 'favorites', label: 'Favorites', icon: Star },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_TAB', payload: item.id });
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                state.activeTab === item.id
                  ? 'bg-blue-500 shadow-lg'
                  : 'hover:bg-white/10'
              }`}
            >
              <item.icon size={24} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {state.user && (
          <div className="mt-8 bg-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {state.user.picture ? (
                <img 
                  src={state.user.picture} 
                  alt={state.user.name}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {state.user.name?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <p className="font-bold">{state.user.name}</p>
                <p className="text-sm text-white/70">{state.user.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-500/20 rounded-2xl p-4 border border-blue-400/30">
          <p className="text-sm text-blue-200 mb-2">Favorites: {state.favorites.length}</p>
          <p className="text-sm text-blue-200">Last update: {state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString() : 'N/A'}</p>
        </div>
      </div>
    </div>
  );

  const NotificationToast = ({ notification }) => {
    const icons = {
      success: CheckCircle,
      error: AlertTriangle,
      warning: AlertTriangle,
      info: Info
    };
    const colors = {
      success: 'from-green-500 to-emerald-500',
      error: 'from-red-500 to-rose-500',
      warning: 'from-yellow-500 to-orange-500',
      info: 'from-blue-500 to-indigo-500'
    };
    const Icon = icons[notification.type];
    
    return (
      <div className={`bg-gradient-to-r ${colors[notification.type]} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] animate-slide-in`}>
        <Icon size={24} />
        <p className="font-medium">{notification.message}</p>
      </div>
    );
  };

  const displayedCities = getDisplayedCities();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Sidebar />
      
      {/* Notifications */}
      <div className="fixed top-24 right-6 z-50 space-y-3">
        {state.notifications.map(notification => (
          <NotificationToast key={notification.id} notification={notification} />
        ))}
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu size={28} className="text-gray-700" />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                  <Cloud className="text-white" size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Weather Analytics
                  </h1>
                  <p className="text-xs text-gray-500">Real-time weather intelligence</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search cities..."
                  value={state.searchQuery}
                  onChange={(e) => {
                    dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value });
                    searchCities(e.target.value);
                  }}
                  className="w-64 px-4 py-3 pl-12 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                
                {state.searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto">
                    {state.searchResults.map((city, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSearchResultClick(city)}
                        className="px-5 py-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin size={18} className="text-blue-500" />
                          <div>
                            <p className="font-semibold text-gray-800">{city.name}</p>
                            <p className="text-sm text-gray-500">{city.region}, {city.country}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all hover:rotate-90 duration-300"
              >
                <Settings size={24} className="text-gray-600" />
              </button>

              {state.user ? (
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-2xl">
                  {state.user.picture ? (
                    <img 
                      src={state.user.picture} 
                      alt={state.user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {state.user.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-700">Hi, {state.user.name.split(' ')[0]}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 font-medium"
                  >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={triggerGoogleSignIn}
                  disabled={state.loading || !googleAuth}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-2xl hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.loading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : (
                    <LogIn size={20} />
                  )}
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {state.loading && displayedCities.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="relative">
                <Cloud className="text-blue-500 mx-auto mb-4 animate-bounce" size={64} />
                <RefreshCw className="absolute top-6 left-1/2 -translate-x-1/2 animate-spin text-blue-600" size={32} />
              </div>
              <p className="text-gray-600 text-xl font-medium">
                {state.user ? `Loading ${state.user.name}'s weather...` : 'Loading weather data...'}
              </p>
              <p className="text-gray-400 mt-2">Please wait a moment</p>
            </div>
          </div>
        ) : state.error ? (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-3xl p-8 text-center">
            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
            <p className="text-red-600 font-bold text-xl">{state.error}</p>
            <button
              onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
              className="mt-4 bg-red-500 text-white px-6 py-2 rounded-xl hover:bg-red-600 transition-colors"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">
                  {state.activeTab === 'favorites' 
                    ? '⭐ Your Favorite Cities' 
                    : '🌍 Indian Cities Weather'}
                </h2>
                <p className="text-gray-500 mt-1">
                  {state.user 
                    ? `Welcome back, ${state.user.name}! Your favorites are saved.` 
                    : 'Real-time weather updates every 60 seconds'}
                </p>
              </div>
              {state.lastUpdate && (
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm">
                  <RefreshCw size={16} className="text-green-500" />
                  <span className="text-sm text-gray-600 font-medium">
                    Updated {new Date(state.lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
            
            {displayedCities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedCities.map((weather, idx) => (
                  <CityCard key={idx} weather={weather} />
                ))}
              </div>
            ) : state.activeTab === 'favorites' ? (
              <div className="text-center py-20">
                <div className="bg-white rounded-3xl p-12 shadow-lg max-w-md mx-auto">
                  <Star className="mx-auto text-yellow-400 mb-6" size={80} />
                  <p className="text-gray-700 text-2xl font-bold mb-2">No favorites yet</p>
                  <p className="text-gray-500 mt-2">Click the star icon on any city to add it to favorites</p>
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_TAB', payload: 'dashboard' });
                      setSidebarOpen(false);
                    }}
                    className="mt-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-2xl font-semibold hover:shadow-lg transition-all"
                  >
                    Browse Cities
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>

      {state.selectedCity && <DetailedView weather={state.selectedCity} />}
      {state.showSettings && <SettingsModal />}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}