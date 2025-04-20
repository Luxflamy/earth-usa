import { handleFlightData, displayError } from './output.js';

export function collectFlightData() {
    // 首先检查是否已经存在极端天气按钮和降雨量滑块
    const panel = document.querySelector('.input-panel');
    
    // 添加极端天气按钮
    if (panel && !document.getElementById('extreme-weather')) {
        const weatherFormGroup = document.createElement('div');
        weatherFormGroup.className = 'form-group';
        weatherFormGroup.innerHTML = `
            <label class="weather-toggle">
                <input type="checkbox" id="extreme-weather">
                <span class="weather-toggle-slider"></span>
                <span class="weather-toggle-label">Extreme Weather</span>
            </label>
        `;
        
        // 将按钮添加到搜索按钮之前
        const searchBtn = document.querySelector('#search-btn');
        if (searchBtn) {
            panel.insertBefore(weatherFormGroup, searchBtn);
        } else {
            panel.appendChild(weatherFormGroup);
        }
    }
    
    // 添加降雨量滑块
    if (panel && !document.getElementById('rainfall-slider')) {
        const rainfallFormGroup = document.createElement('div');
        rainfallFormGroup.className = 'form-group rainfall-slider-container';
        rainfallFormGroup.innerHTML = `
            <label for="rainfall-slider"> Precipitaion (0-200 mm):</label>
            <div class="rainfall-slider-wrapper">
                <input type="range" id="rainfall-slider" class="rainfall-slider" min="0" max="200" value="0" step="1">
                <span id="rainfall-value" class="rainfall-slider-value">0 mm</span>
            </div>
        `;
        
        // 将滑块添加到搜索按钮之前
        const searchBtn = document.querySelector('#search-btn');
        if (searchBtn) {
            panel.insertBefore(rainfallFormGroup, searchBtn);
            
            // 添加滑块值更新事件
            const rainfallSlider = document.getElementById('rainfall-slider');
            const rainfallValue = document.getElementById('rainfall-value');
            
            if (rainfallSlider && rainfallValue) {
                rainfallSlider.addEventListener('input', function() {
                    rainfallValue.textContent = this.value + ' mm';
                });
            }
        } else {
            panel.appendChild(rainfallFormGroup);
        }
    }

    const fromInput = document.querySelector('#from');
    const toInput = document.querySelector('#to');
    const timeInput = document.querySelector('#time');
    const flightNumberInput = document.querySelector('#flight-number');
    const searchButton = document.querySelector('#search-btn');

    // 清除可能的旧事件监听器
    const newSearchBtn = searchButton.cloneNode(true);
    if (searchButton.parentNode) {
        searchButton.parentNode.replaceChild(newSearchBtn, searchButton);
    }

    newSearchBtn.addEventListener('click', async () => {
        // 获取极端天气选择状态
        const extremeWeatherInput = document.querySelector('#extreme-weather');
        const extremeWeather = extremeWeatherInput ? extremeWeatherInput.checked ? 1 : 0 : 0;
        
        // 获取降雨量值
        const rainfallSlider = document.querySelector('#rainfall-slider');
        const rainfall = rainfallSlider ? parseFloat(rainfallSlider.value) : 0;
        
        // Get the input values
        const from = fromInput.value.trim().toUpperCase();
        const to = toInput.value.trim().toUpperCase();
        const time = timeInput.value;
        const flightNumber = flightNumberInput.value.trim().toUpperCase();
        
        // Extract airline code from flight number (usually first 2 characters)
        const airline = flightNumber.substring(0, 2);
        
        // Parse time input properly
        let depTime = 0;
        let year = 0;
        let week = 0;
        
        if (time) {
            // Extract proper departure time
            const date = new Date(time);
            
            // Convert hours and minutes to HHMM format
            const hours = date.getHours();
            const minutes = date.getMinutes();
            depTime = hours * 100 + minutes;
            
            // Extract year
            year = date.getFullYear();
            
            // Get day of week (0-6, where 0 is Sunday)
            week = date.getDay();
        }
        
        // Dummy distance - in a real app this would come from an API
        const distance = 0; // Example distance in miles
        
        const flightData = {
            from,
            to,
            time,
            flightNumber,
            airline,
            depTime,
            year,
            week,
            distance,
            extremeWeather,
            rainfall
        };

        // 将数据传递给处理函数
        handleFlightData(flightData);

        // 调用 API 并获取结果
        try {
            const response = await fetch('http://127.0.0.1:5000/run-python', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: `${flightData.from},${flightData.to}` })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // 准备输出面板
            let displayPanel = document.querySelector('.display-panel');
            if (!displayPanel) {
                displayPanel = document.createElement('div');
                displayPanel.classList.add('display-panel');
                document.body.appendChild(displayPanel);
                void displayPanel.offsetWidth; // 强制触发重绘
            }

            // 修改样式和结构
            displayPanel.style.width = '80%';
            displayPanel.style.margin = '0 auto';
            displayPanel.style.maxWidth = '1200px';

            // 调用预测API
            const predictionResponse = await fetch('http://127.0.0.1:5000/predict-cancellation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flightData })
            });

            if (!predictionResponse.ok) {
                throw new Error(`HTTP error! status: ${predictionResponse.status}`);
            }

            const predictionResult = await predictionResponse.json();
            
            // 将获取的数据传递给输出处理函数
            handleFlightData(flightData, predictionResult, displayPanel);
            
        } catch (error) {
            console.error('Error calling Python script:', error);
            displayError(error.message);
        }
    });
}

