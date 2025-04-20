// 添加一个全局变量来跟踪卡片展开状态
let isCardExpanded = false;

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
                
                // 添加水平排列样式
                displayPanel.style.display = 'flex';
                displayPanel.style.flexWrap = 'wrap';
                displayPanel.style.justifyContent = 'space-between';
                displayPanel.style.alignItems = 'flex-start';
                displayPanel.style.gap = '20px';
                
                void displayPanel.offsetWidth; // 强制触发重绘
            } else {
                // 确保已存在的面板也有横向排布样式
                displayPanel.style.display = 'flex';
                displayPanel.style.flexWrap = 'wrap';
                displayPanel.style.justifyContent = 'space-between';
                displayPanel.style.alignItems = 'flex-start';
                displayPanel.style.gap = '20px';
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
            
            // 保存当前卡片的展开状态（如果之前有卡片的话）
            const existingDetails = document.querySelector('.flight-card-details');
            if (existingDetails) {
                isCardExpanded = existingDetails.style.display !== 'none' && 
                                existingDetails.style.maxHeight !== '0px';
            }

            // 根据展开状态确定初始样式
            const detailsInitialStyle = isCardExpanded 
                ? 'display: block; overflow: hidden; max-height: 1000px; padding: 10px 0 0 0;' 
                : 'display: none; overflow: hidden; max-height: 0; padding: 0;';
            
            const indicatorInitialText = isCardExpanded ? '▲ Hide details' : '▼ Show details';
            
            // 根据取消概率设置颜色和风险描述
            const cancelProb = predictionResult.cancellation_probability * 100;
            let probColor;
            let riskLevel;
            
            if (cancelProb <= 2.1) {
                probColor = '#4CAF50'; // 绿色
                riskLevel = "Safe";
            } else if (cancelProb <= 3) {
                probColor = '#FF9800'; // 橙色
                riskLevel = "At Risk";
            } else if (cancelProb <= 5) {
                probColor = '#FF5252'; // 浅红色
                riskLevel = "High Risk";
            } else {
                probColor = '#B71C1C'; // 深红色
                riskLevel = "Extreme Risk";
            }

            // 为红眼航班和非红眼航班添加emoji
            // const redEyeEmoji = predictionResult.is_redeye ? "🌙 ✈️ 😴" : "☀️ ✈️ 😊";
            const redEyeEmoji = predictionResult.is_redeye ? "🌙 ✈️ 😴" : "☀️";

            // 格式化时间为更日常化的显示
            let formattedTime = "Time not specified";
            if (flightData.time) {
                const date = new Date(flightData.time);
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const hour12 = hours % 12 || 12;
                formattedTime = `${hour12}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
            }

            // 检查起点和终点是否存在
            const hasOriginDest = flightData.from && flightData.to && flightData.from !== '' && flightData.to !== '';
            
            // 计算大致飞行时间（假设平均飞行速度为500英里/小时）
            const distance = hasOriginDest ? (predictionResult.model_input?.DISTANCE || 0) : 0;
            const flightHours = Math.floor(distance / 500);
            const flightMinutes = Math.round((distance / 500 - flightHours) * 60);
            const flightTimeText = !hasOriginDest ? "Data unavailable" : (
                flightHours > 0 
                ? `approx. ${flightHours} hour${flightHours > 1 ? 's' : ''}${flightMinutes > 0 ? ' ' + flightMinutes + ' min' : ''}`
                : `approx. ${flightMinutes} min`
            );

            // 检查是否有足够的数据来显示取消概率
            const canShowCancelProb = hasOriginDest;
            const cancelProbDisplay = canShowCancelProb 
                ? `<span style="color: ${probColor}; font-weight: bold;">${cancelProb.toFixed(2)}%</span>
                   <span style="color: ${probColor}; font-weight: bold; margin-left: auto;">${riskLevel}</span>`
                : `<span style="color: #888; font-style: italic;">Data unavailable</span>`;
            
            // 检查是否可以确定红眼航班状态
            const canShowRedEye = flightData.time && flightData.time !== '';
            const redEyeDisplay = canShowRedEye
                ? `${predictionResult.is_redeye ? "Yes" : "No"}<span style="margin-left: auto;">${redEyeEmoji}</span>`
                : `<span style="color: #888; font-style: italic;">Data unavailable</span>`;

            // Display cancellation probability results
            displayPanel.innerHTML = `
                <div class="flight-card" style="flex: 1; min-width: 300px; max-width: calc(50% - 10px);">
                    <h3>Cancellation Prediction</h3>
                    <div class="flight-card-content">
                        <p style="display: flex; justify-content: space-between; align-items: center;">
                            <strong>Cancellation Probability:</strong>&nbsp;&nbsp;
                            ${cancelProbDisplay}
                        </p>
                        <p style="display: flex; justify-content: space-between; align-items: center;">
                            <strong>Red-eye Flight:</strong> ${redEyeDisplay}
                        </p>
                        <p><strong>Departure Time:</strong> ${formattedTime}</p>
                        <p><strong>Distance:</strong> ${hasOriginDest ? `${distance} miles` : "Data unavailable"}</p>
                        <p><strong>Est. Flight Duration:</strong> ${flightTimeText}</p>
                    </div>
                    <div class="flight-card-details" style="${detailsInitialStyle} transition: max-height 0.6s ease-in-out, padding 0.6s ease-in-out;">
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
                    <div class="expand-indicator" style="text-align: center; cursor: pointer; padding: 5px 0; font-size: 12px;">
                        <span>${indicatorInitialText}</span>
                    </div>
                </div>
                
                <!-- 添加新卡片 -->
                <div class="flight-card travel-tips-card" style="flex: 1; min-width: 300px; max-width: calc(50% - 10px);">
                    <h3>Travel Tips</h3>
                    <div class="flight-card-content">
                        ${cancelProb > 3 ? 
                            `<div class="travel-alert">
                                <p><strong>⚠️ High Cancellation Risk Alert</strong></p>
                                <p>Based on our prediction, this flight has an elevated risk of cancellation.</p>
                            </div>` : ''
                        }
                        <h4>Recommended Actions:</h4>
                        <ul>
                            ${hasOriginDest ? 
                                `<li>Arrive at ${flightData.from} airport at least ${distance > 1000 ? '3' : '2'} hours before departure.</li>` : 
                                '<li>Arrive at the airport with plenty of time before departure.</li>'
                            }
                            <li>Download the airline's app for real-time flight updates.</li>
                            ${predictionResult.model_input?.EXTREME_WEATHER ? 
                                '<li><strong>Weather Warning:</strong> Check airport conditions due to forecasted extreme weather.</li>' : 
                                '<li>Monitor current weather conditions at departure and arrival cities.</li>'
                            }
                            ${predictionResult.model_input?.PRCP > 50 ? 
                                '<li><strong>Precipitation Alert:</strong> Heavy rainfall may cause delays. Consider flexibility in your travel plans.</li>' : 
                                ''
                            }
                            ${predictionResult.is_redeye ? 
                                '<li>For this red-eye flight, consider bringing items for comfort (neck pillow, eye mask, etc).</li>' : 
                                ''
                            }
                        </ul>
                        
                        <h4>Alternative Options:</h4>
                        <ul>
                            ${cancelProb > 4 ? 
                                '<li><strong>Consider booking a backup flight</strong> if your travel is time-sensitive.</li>' : 
                                ''
                            }
                            <li>Check refund and rebooking policies for your ticket.</li>
                            <li>Consider travel insurance for important trips.</li>
                        </ul>
                    </div>
                </div>
            `;

            // 添加点击事件来展开/收起详情
            const flightCard = displayPanel.querySelector('.flight-card');
            const detailsSection = displayPanel.querySelector('.flight-card-details');
            const expandIndicator = displayPanel.querySelector('.expand-indicator');
            
            expandIndicator.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止触发卡片的点击事件
                toggleDetails();
            });
            
            flightCard.addEventListener('click', (e) => {
                // 如果点击的是扩展指示器，则不重复执行
                if (e.target.closest('.expand-indicator')) return;
                toggleDetails();
            });
            
            function toggleDetails() {
                isCardExpanded = !isCardExpanded;
                updateCardExpandState();
            }
            
            function updateCardExpandState() {
                if (isCardExpanded) {
                    // 展开
                    detailsSection.style.display = 'block';
                    // 强制重绘以使过渡生效
                    void detailsSection.offsetHeight;
                    detailsSection.style.maxHeight = '1000px'; // 设置一个足够大的值
                    detailsSection.style.padding = '10px 0 0 0';
                    expandIndicator.innerHTML = '<span>▲ Hide details</span>';
                } else {
                    // 收起
                    detailsSection.style.maxHeight = '0';
                    detailsSection.style.padding = '0';
                    expandIndicator.innerHTML = '<span>▼ Show details</span>';
                    // 延迟设置display:none以便动画完成
                    setTimeout(() => {
                        detailsSection.style.display = 'none';
                    }, 600);
                }
            }

        } catch (error) {
            console.error('Error calling Python script:', error);
            // Display error message
            let displayPanel = document.querySelector('.display-panel');
            if (displayPanel) {
                // 确保错误卡片也适应横向布局
                displayPanel.innerHTML += `
                    <div class="flight-card error-card" style="flex: 1; min-width: 300px; max-width: 100%;">
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
        
        // 添加水平排列样式
        displayPanel.style.display = 'flex';
        displayPanel.style.flexWrap = 'wrap';
        displayPanel.style.justifyContent = 'space-between';
        displayPanel.style.alignItems = 'flex-start';
        displayPanel.style.gap = '20px';
        
        document.body.appendChild(displayPanel);

        // 强制触发重绘以确保动画生效
        void displayPanel.offsetWidth;
    }

    // 添加显示动画
    displayPanel.classList.add('visible');
}

