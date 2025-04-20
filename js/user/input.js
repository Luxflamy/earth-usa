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
            <label for="rainfall-slider"> Precipitaion (0-500 mm):</label>
            <div class="rainfall-slider-wrapper">
                <input type="range" id="rainfall-slider" class="rainfall-slider" min="0" max="500" value="0" step="1">
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
            extremeWeather, // 添加极端天气参数
            rainfall       // 添加降雨量参数
        };

        // 将数据传递给处理函数
        handleFlightData(flightData);

        // 调用 example.py 并获取结果
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

            // 在右侧版面添加新卡片显示 Python 输出
            let displayPanel = document.querySelector('.display-panel');
            if (!displayPanel) {
                displayPanel = document.createElement('div');
                displayPanel.classList.add('display-panel');
                document.body.appendChild(displayPanel);
                void displayPanel.offsetWidth; // 强制触发重绘
            }

            // 注释掉第一张卡片的显示代码
            /*
            displayPanel.innerHTML += `
                <div class="flight-card">
                    <h3>Python Output</h3>
                    <div class="flight-card-content">
                        <p>${result.output}</p>
                    </div>
                </div>
            `;
            */
            
            // Call predict-cancellation endpoint
            const predictionResponse = await fetch('http://127.0.0.1:5000/predict-cancellation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flightData })
            });

            if (!predictionResponse.ok) {
                throw new Error(`HTTP error! status: ${predictionResponse.status}`);
            }

            const predictionResult = await predictionResponse.json();
            
            // Display cancellation probability results - 保持第二张卡片不变
            displayPanel.innerHTML += `
                <div class="flight-card">
                    <h3>Flight Cancellation Prediction</h3>
                    <div class="flight-card-content">
                        <p><strong>Cancellation Probability:</strong> ${(predictionResult.cancellation_probability * 100).toFixed(2)}%</p>
                        <p><strong>Red-eye Flight:</strong> ${predictionResult.is_redeye ? "Yes" : "No"}</p>
                        <p><strong>Extreme Weather:</strong> ${predictionResult.model_input?.EXTREME_WEATHER ? "Yes" : "No"}</p>
                        <p><strong>Rainfall:</strong> ${predictionResult.model_input?.PRCP} mm</p>
                        ${predictionResult.error ? `<p class="error"><strong>Error:</strong> ${predictionResult.error}</p>` : ''}
                        
                        <h4>Input Data Sent to Model:</h4>
                        <div class="model-input-data">
                            <p><strong>YEAR:</strong> ${predictionResult.model_input?.YEAR || flightData.year}</p>
                            <p><strong>WEEK:</strong> ${predictionResult.model_input?.WEEK || flightData.week}</p>
                            <p><strong>MKT_AIRLINE:</strong> ${predictionResult.model_input?.MKT_AIRLINE || flightData.airline}</p>
                            <p><strong>ORIGIN_IATA:</strong> ${predictionResult.model_input?.ORIGIN_IATA || flightData.from}</p>
                            <p><strong>DEST_IATA:</strong> ${predictionResult.model_input?.DEST_IATA || flightData.to}</p>
                            <p><strong>DISTANCE:</strong> ${predictionResult.model_input?.DISTANCE !== undefined ? predictionResult.model_input.DISTANCE : '1 (default)'}</p>
                            <p><strong>DEP_TIME:</strong> ${predictionResult.model_input?.DEP_TIME || flightData.depTime}</p>
                            <p><strong>IS_REDEYE:</strong> ${predictionResult.model_input?.IS_REDEYE !== undefined ? predictionResult.model_input.IS_REDEYE : 'Not provided'}</p>
                            <p><strong>PRCP:</strong> ${predictionResult.model_input?.PRCP !== undefined ? predictionResult.model_input.PRCP : '0 (default)'}</p>
                            <p><strong>EXTREME_WEATHER:</strong> ${predictionResult.model_input?.EXTREME_WEATHER !== undefined ? predictionResult.model_input.EXTREME_WEATHER : '0 (default)'}</p>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error calling Python script:', error);
            // Display error message
            let displayPanel = document.querySelector('.display-panel');
            if (displayPanel) {
                displayPanel.innerHTML += `
                    <div class="flight-card error-card">
                        <h3>Error</h3>
                        <div class="flight-card-content">
                            <p>${error.message}</p>
                        </div>
                    </div>
                `;
            }
        }
    });
}

function handleFlightData(flightData) {
    console.log('Collected Flight Data:', flightData);

    // 获取或创建右侧版面组件
    let displayPanel = document.querySelector('.display-panel');
    if (!displayPanel) {
        displayPanel = document.createElement('div');
        displayPanel.classList.add('display-panel');
        document.body.appendChild(displayPanel);

        // 强制触发重绘以确保动画生效
        void displayPanel.offsetWidth;
    }

    // // 清空内容并添加新的航班信息卡片
    // displayPanel.innerHTML = `
    //     <div class="flight-card">
    //         <h3>Flight Information</h3>
    //         <div class="flight-card-content">
    //             <p><strong>From:</strong> ${flightData.from}</p>
    //             <p><strong>To:</strong> ${flightData.to}</p>
    //             <p><strong>Time:</strong> ${flightData.time}</p>
    //             <p><strong>Flight Number:</strong> ${flightData.flightNumber}</p>
    //             <p><strong>Airline:</strong> ${flightData.airline}</p>
    //             <p><strong>Distance:</strong> ~${flightData.distance} miles</p>
    //             <p><strong>Extreme Weather:</strong> ${flightData.extremeWeather ? "Yes" : "No"}</p>
    //             <p><strong>Rainfall:</strong> ${flightData.rainfall} mm</p>
    //         </div>
    //     </div>
    // `;

    // 添加显示动画
    displayPanel.classList.add('visible');
}

