const cityInput = document.querySelector('.city-input')
const searchBtn = document.querySelector('.search-btn')
const refreshBtn = document.querySelector('.refresh-btn')

const notFoundSection = document.querySelector('.not-found')
const searchCitySection = document.querySelector('.search-city')
const weatherInfoSection = document.querySelector('.weather-info')
const LoadingSection = document.querySelector(".loading-section")
const countryTxt = document.querySelector('.country-txt')
const tempTxt = document.querySelector('.temp-txt')
const conditionTxt = document.querySelector('.condition-txt')
const humidityValueTxt = document.querySelector('.humidity-value-txt')
const windValueTxt = document.querySelector('.wind-value-txt')
const weatherSummaryImg = document.querySelector('.weather-summary-img')
const currentDateTxt = document.querySelector('.current-date-txt')

const forecastItemsContainer = document.querySelector('.forecast-items-container')

const apiKey = 'baec8cb7321f392b0afe3be62eb20191'

let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];
const recentCitiesContainer = document.querySelector('.recent-cities-container');


searchBtn.addEventListener('click', () => {

    if (cityInput.value.trim() != '') {
        updateWeatherinfo(cityInput.value)
        cityInput.value = ''
        cityInput.blur()
    }

})

cityInput.addEventListener('keydown', (event) => {
    if (event.key == 'Enter' && cityInput.value.trim() != '') {
        updateWeatherinfo(cityInput.value)
        cityInput.value = ''
        cityInput.blur()
    }
})

async function getFetchData(endPoint, city) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/${endPoint}?q=${city}&appid=${apiKey}&units=metric`

    const response = await fetch(apiUrl)

    return response.json()
}

function getWeatherIcon(id) {
    if (id <= 232) return 'thunderstorm.svg'
    if (id <= 321) return 'drizzle.svg'
    if (id <= 531) return 'rain.svg'
    if (id <= 622) return 'snow.svg'
    if (id <= 781) return 'atmosphere.svg'
    if (id <= 800) return 'clear.svg'
    else return 'clouds.svg'
    
}

function getCurrentDate() {
    const currentDate = new Date()
    const options = {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    }

    return currentDate.toLocaleDateString('en-GB', options)
}

async function updateWeatherinfo(city) {
    showDisplaySection(LoadingSection)
    const weatherData = await getFetchData('weather', city)

    if (weatherData.cod != 200) {
        showDisplaySection(notFoundSection)
        return 
    }

    localStorage.setItem('selectedCity', city);

    const {
        name: country,
        main: { temp, humidity },
        weather: [{ id, main }],
        wind: { speed }
    } = weatherData

    countryTxt.textContent = country
    tempTxt.textContent = Math.round(temp) + '°C'
    conditionTxt.textContent = main 
    humidityValueTxt.textContent = humidity + '%'
    windValueTxt.textContent = Math.round(speed) + 'M/s'

    currentDateTxt.textContent = getCurrentDate()
    weatherSummaryImg.src = `assets/weather/${getWeatherIcon(id)}`

    await updateForecastInfo(city)
    showDisplaySection(weatherInfoSection)
    
    const actualCityName = weatherData.name;

    addRecentCity(actualCityName); 
    
    renderRecentCities(actualCityName);
}

async function updateForecastInfo(city) {

    const forecastData = await getFetchData('forecast', city)

    const timeTaken = '12:00:00'
    const todayDate = new Date().toLocaleDateString('en-CA')
    
    forecastItemsContainer.replaceChildren()
    forecastData.list.forEach(forecastWeather => {
        if (forecastWeather.dt_txt.includes(timeTaken) && !forecastWeather.dt_txt.includes(todayDate)) {
            updateForecastItems(forecastWeather)
        }
    })
}

function updateForecastItems(weatherData) {
    const {
        dt_txt: date,
        weather: [{ id }],
        main: { temp }
    } = weatherData

    const dateTaken = new Date(date)
    const dateOption = {
        day: '2-digit',
        month: 'short',
    }

    const dateResult = dateTaken.toLocaleDateString('en-US', dateOption)

    const forecastItem = `
        <div class="forecast-item">
            <h5 class="forecast-item-date regular-txt">${dateResult}</h5>
            <img src="assets/weather/${getWeatherIcon(id)}" class="forecast-item-img">
            <h5 class="forecast-item-temp">${Math.round(temp)}°C</h5>
        </div>
    `
    
    forecastItemsContainer.insertAdjacentHTML('beforeend', forecastItem)
}

function showDisplaySection(section) {
    [weatherInfoSection, notFoundSection, searchCitySection, LoadingSection]
        .forEach(section => section.style.display = 'none')

    section.style.display = 'flex'
}

async function getCityByCoords(lat, lon) {
    const reverseGeoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
    const response = await fetch(reverseGeoUrl);
    const data = await response.json();
    
    if (data.length > 0) {
        return data[0].name;
    } else {
        throw new Error("City not found");
    }
}

window.addEventListener('load', () => {
    const savedCity = localStorage.getItem('selectedCity');

    if (savedCity) {
        updateWeatherinfo(savedCity);
    } else {
        getUserLocation();
    }
});

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const cityName = await getCityByCoords(latitude, longitude);
                    updateWeatherinfo(cityName);
                } catch (error) {
                    console.error("Error getting city:", error);
                    showDisplaySection(searchCitySection);
                }
            },
            (error) => {
                console.error("Geolocation denied:", error);
                showDisplaySection(searchCitySection);
            }
        );
    } else {
        showDisplaySection(searchCitySection);
    }
}

refreshBtn.addEventListener('click', () => {
    const currentCity = localStorage.getItem('selectedCity');
    if (currentCity) updateWeatherinfo(currentCity);
});

function renderRecentCities(activeCity) {
    recentCitiesContainer.innerHTML = '';

    const filteredList = recentCities.filter(city => city.toLowerCase() !== activeCity.toLowerCase());

    filteredList.forEach(city => {
        const cityChip = document.createElement('div');
        cityChip.classList.add('recent-city-chip');
        cityChip.textContent = city;
        
        cityChip.addEventListener('click', () => {
            updateWeatherinfo(city);
        });
        
        recentCitiesContainer.appendChild(cityChip);
    });
}

function addRecentCity(city) {
    recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
    
    recentCities.unshift(city);
    
    if (recentCities.length > 3) {
        recentCities.pop();
    }
    
    localStorage.setItem('recentCities', JSON.stringify(recentCities));
}