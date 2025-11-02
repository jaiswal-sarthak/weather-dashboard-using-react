# 🌤️ Weather Analytics Dashboard

A beautiful, real-time weather monitoring application built with React that provides comprehensive weather analytics for cities worldwide with Google OAuth integration.

## 🚀 Live Demo

**Live Application:** [https://weather-sarthak-jaiswal.netlify.app](https://weather-sarthak-jaiswal.netlify.app)
![Weather Dashboard](https://img.shields.io/badge/React-18.2.0-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![Deployment](https://img.shields.io/badge/Deployed-Netlify-success)

## ✨ Features

### 🔐 **Google OAuth Integration**
- Secure authentication using Google Sign-In
- User-specific favorites storage
- Personalized weather dashboard
- Automatic session management

### ⚡ **Real-time Updates**
- **60-second auto-refresh** for live weather data
- Smart caching to optimize API calls
- Background updates for favorite cities
- Push notifications for weather alerts

### ⭐ **Smart Favorites System**
- Dedicated **Favorites Tab** for quick access
- Persistent storage across sessions
- User-specific favorites (when logged in)
- Local storage fallback for guest users

### 📊 **Comprehensive Weather Analytics**
- **7-day forecast** with detailed charts
- **24-hour hourly data** with interactive graphs
- **Air Quality Index** monitoring
- **Astronomical data** (sunrise, sunset, moon phases)
- Multiple chart types (Temperature, Precipitation, Wind, Humidity)

### 🎨 **Beautiful UI/UX**
- Gradient-based weather condition themes
- Responsive design for all devices
- Smooth animations and transitions
- Dark/Light mode ready components
- Interactive charts with Recharts

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Google Cloud Console account
- WeatherAPI account

### 1. Clone the Repository
```bash
git clone https://github.com/jaiswal-sarthak/weather-dashboard-using-react.git
cd weather-dashboard-using-react
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create `.env` file in root directory:
```env
REACT_APP_WEATHER_API_KEY=your_weather_api_key_here
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 4. Google OAuth Setup
1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create new OAuth 2.0 credentials
3. Add authorized origins:
   - `http://localhost:3000`
   - `https://your-domain.netlify.app`
4. Add redirect URIs (same as above)

### 5. Start Development Server
```bash
npm start
```
App runs on `http://localhost:3000`

## 🔧 Configuration

### WeatherAPI Setup
1. Sign up at [WeatherAPI.com](https://www.weatherapi.com)
2. Get your API key from dashboard
3. Add to environment variables

### Google OAuth Configuration
```javascript
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GOOGLE_SCOPES = 'profile email';
```

## 📁 Project Structure

```
src/
├── App.js                 # Main application component
├── App.css               # Global styles
├── index.js              # Application entry point
├── index.css             # Base styles
├── storagePolyFill.js    # Storage utilities
├── components/           # Reusable components
└── hooks/               # Custom React hooks
```

## 🎯 Key Features Explained

### 🔄 Auto-Refresh System
```javascript
// Updates favorites every 60 seconds
useEffect(() => {
  if (state.favorites.length > 0) {
    const interval = setInterval(() => {
      state.favorites.forEach(city => fetchWeatherData(city));
    }, 60000);
    return () => clearInterval(interval);
  }
}, [state.favorites, fetchWeatherData]);
```

### ⭐ Favorites Management
- **User-specific storage** when logged in via Google
- **Local storage** for guest users
- **Cross-device sync** for authenticated users
- **One-click add/remove** from city cards

### 📊 Chart Analytics
- **Line charts** for temperature trends
- **Bar charts** for precipitation
- **Area charts** for humidity levels
- **Responsive containers** for all screen sizes

### 🔐 Authentication Flow
```javascript
const handleGoogleSignIn = async (response) => {
  // Decode JWT token
  const userInfo = JSON.parse(atob(response.credential.split('.')[1]));
  
  // Save user session
  await window.storage?.set('current_user', JSON.stringify(user));
  
  // Load user-specific favorites
  await loadUserFavorites(user.id);
};
```

## 🌐 API Integration

### WeatherAPI Endpoints Used
- **Current Weather**: `/v1/current.json`
- **7-Day Forecast**: `/v1/forecast.json`
- **City Search**: `/v1/search.json`
- **Air Quality**: Included in forecast
- **Weather Alerts**: Real-time notifications

### Google APIs
- **OAuth 2.0** for authentication
- **User Info** for profile data
- **Secure token management**

## 🎨 UI Components

### City Card
- Gradient backgrounds based on weather conditions
- Favorite star toggle
- Key metrics at a glance
- Click for detailed view

### Detailed View Modal
- 7-day forecast with charts
- Hourly data visualization
- Air quality metrics
- Astronomical information

### Settings Panel
- Temperature unit toggle (°C/°F)
- Auto-refresh configuration
- Notification preferences

## 📱 Responsive Design

- **Mobile-first** approach
- **Tablet-optimized** layouts
- **Desktop-enhanced** experiences
- **Touch-friendly** interactions

## 🚀 Deployment

### Netlify Deployment
```bash
# Build command
npm run build

# Publish directory
build/
```

### Environment Variables in Production
- Set `REACT_APP_WEATHER_API_KEY` in Netlify dashboard
- Set `REACT_APP_GOOGLE_CLIENT_ID` in Netlify dashboard
- Configure authorized domains in Google Cloud Console

## 🛠️ Built With

- **Frontend**: React 18, Recharts, Lucide React
- **Styling**: Tailwind CSS, Custom CSS
- **Authentication**: Google OAuth 2.0
- **API**: WeatherAPI, Google APIs
- **Deployment**: Netlify
- **Storage**: Browser LocalStorage API

## 🔮 Future Enhancements

- [ ] Push notifications for severe weather
- [ ] Weather maps integration
- [ ] Historical weather data
- [ ] Multi-language support
- [ ] Advanced chart analytics
- [ ] Weather data export
- [ ] Social sharing features

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [WeatherAPI](https://www.weatherapi.com) for reliable weather data
- [Google Identity Services](https://developers.google.com/identity) for OAuth integration
- [Recharts](https://recharts.org) for beautiful data visualization
- [Lucide React](https://lucide.dev) for consistent icons

## 📞 Support

For support, email sarthakjaiswal2207@gmail.com or create an issue in the GitHub repository.

## 🔗 Links

- **Live Demo**: [https://weather-sarthak-jaiswal.netlify.app](https://weather-sarthak-jaiswal.netlify.app)
- **GitHub Repository**: [https://github.com/jaiswal-sarthak/weather-dashboard-using-react](https://github.com/jaiswal-sarthak/weather-dashboard-using-react)
- **WeatherAPI**: [https://www.weatherapi.com](https://www.weatherapi.com)

---

<div align="center">

**Made with ❤️ by Sarthak Jaiswal**

*Star ⭐ the repo if you like it!*

</div>

## 📋 Quick Start Commands

```bash
# Development
npm start          # Start development server
npm run build      # Create production build
npm test           # Run test suite

# Deployment
npm run build      # Build for production
# Deploy build/ folder to your hosting service
```

## 🔑 Environment Variables Template

Create a `.env` file with:

```env
REACT_APP_WEATHER_API_KEY=your_api_key_here
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```
