// API Configuration
const API_KEY = '5405a45b84484cb5b6e51248252105';
const BASE_URL = 'https://api.weatherapi.com/v1';

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const themeToggle = document.getElementById('theme-toggle');
const tempToggle = document.getElementById('temp-toggle');
const loadingSpinner = document.getElementById('loading-spinner');
const weatherInfo = document.getElementById('weather-info');
const forecastContainer = document.getElementById('forecast-container');

// State
let isCelsius = true;

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherData(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        }
    }
});

locationBtn.addEventListener('click', getCurrentLocationWeather);
themeToggle.addEventListener('click', toggleTheme);
tempToggle.addEventListener('click', toggleTemperatureUnit);

// Theme Toggle
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('weather-theme', isDark ? 'dark' : 'light');
}

// On page load, set theme from localStorage
(function() {
    const savedTheme = localStorage.getItem('weather-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark');
        themeToggle.textContent = '🌙';
    }
})();

// Temperature Unit Toggle
function toggleTemperatureUnit() {
    isCelsius = !isCelsius;
    updateTemperatureDisplay();
}

// Get Current Location
function getCurrentLocationWeather() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherDataByCoords(latitude, longitude);
            },
            () => {
                hideLoading();
                showError('Unable to get your location. Please try searching for a city instead.');
            }
        );
    } else {
        showError('Geolocation is not supported by your browser.');
    }
}

// API Calls
async function getWeatherData(city) {
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city)}&days=5&aqi=no&alerts=no`);
        if (!response.ok) throw new Error('City not found');
        const data = await response.json();
        updateWeatherUI(data);
        updateForecastUI(data);
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

async function getWeatherDataByCoords(lat, lon) {
    showLoading();
    try {
        const response = await fetch(`${BASE_URL}/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=5&aqi=no&alerts=no`);
        if (!response.ok) throw new Error('Weather data not found');
        const data = await response.json();
        updateWeatherUI(data);
        updateForecastUI(data);
        hideLoading();
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

// UI Updates
function updateWeatherUI(data) {
    document.getElementById('city').textContent = data.location.name;
    document.getElementById('country').textContent = data.location.country;
    document.getElementById('temp').textContent = `${Math.round(data.current.temp_c)}°C`;
    document.getElementById('weather-desc').textContent = data.current.condition.text;
    document.getElementById('humidity').textContent = `${data.current.humidity}%`;
    document.getElementById('wind').textContent = `${Math.round(data.current.wind_kph)} km/h`;
    document.getElementById('pressure').textContent = `${data.current.pressure_mb} hPa`;
    document.getElementById('weather-icon').src = `https:${data.current.condition.icon}`;
    updateDateTime(data.location.localtime);
}

function updateForecastUI(data) {
    forecastContainer.innerHTML = '';
    data.forecast.forecastday.slice(1).forEach(forecast => {
        const item = document.createElement('div');
        item.className = 'forecast-item';
        item.innerHTML = `
            <div class="left">
                <h4>${new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'short' })}</h4>
                <img src="https:${forecast.day.condition.icon}" alt="${forecast.day.condition.text}">
            </div>
            <div class="right">
                <span class="label">High</span>
                <span class="high">${Math.round(forecast.day.maxtemp_c)}°</span>
                <span class="label">Low</span>
                <span class="low">${Math.round(forecast.day.mintemp_c)}°</span>
            </div>
        `;
        forecastContainer.appendChild(item);
    });
}

function updateDateTime(localtime) {
    const now = new Date(localtime);
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('time').textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateTemperatureDisplay() {
    const tempElement = document.getElementById('temp');
    let temp = parseFloat(tempElement.textContent);
    if (isCelsius) {
        temp = Math.round((temp - 32) * (5/9));
        tempElement.textContent = `${temp}°C`;
    } else {
        temp = Math.round((temp * (9/5)) + 32);
        tempElement.textContent = `${temp}°F`;
    }
}

// Helper Functions
function getDailyForecasts(forecastList) {
    const dailyForecasts = [];
    const today = new Date().getDate();

    forecastList.forEach(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        if (forecastDate.getDate() !== today && dailyForecasts.length < 5) {
            const existingForecast = dailyForecasts.find(f => 
                new Date(f.dt * 1000).getDate() === forecastDate.getDate()
            );

            if (!existingForecast) {
                dailyForecasts.push({
                    dt: forecast.dt,
                    temp: {
                        max: forecast.main.temp_max,
                        min: forecast.main.temp_min
                    },
                    weather: forecast.weather
                });
            } else {
                existingForecast.temp.max = Math.max(existingForecast.temp.max, forecast.main.temp_max);
                existingForecast.temp.min = Math.min(existingForecast.temp.min, forecast.main.temp_min);
            }
        }
    });

    return dailyForecasts;
}

function showLoading() {
    loadingSpinner.style.display = 'block';
    weatherInfo.style.opacity = '0.5';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
    weatherInfo.style.opacity = '1';
}

function showError(message) {
    alert(message);
}

// Initialize
updateDateTime(new Date());
setInterval(() => updateDateTime(new Date()), 60000); 