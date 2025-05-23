import { setFromAirportCoordinates, setToAirportCoordinates } from '../flightPathRenderer.js';
import { addToggleFunctionality } from './togglePanel.js';
import { collectFlightData } from '../user/input.js';

export function createInputPanel() {
    const panel = document.createElement('div');
    panel.classList.add('input-panel');
    
    panel.innerHTML = `
        <div class="input-group">
            <label for="from">From:</label>
            <input type="text" id="from" placeholder="Airport code (e.g. LAX)" maxlength="3">
            <span id="from-coordinates" class="coordinates"></span>
        </div>
        <div class="input-group">
            <label for="to">To:</label>
            <input type="text" id="to" placeholder="Airport code (e.g. JFK)" maxlength="3">
            <span id="to-coordinates" class="coordinates"></span>
        </div>
        <div class="input-group">
            <label for="time">Time:</label>
            <input type="datetime-local" id="time">
        </div>
        <div class="input-group">
            <label for="flight-number">Flight Number:</label>
            <input type="text" id="flight-number" placeholder="Flight number (e.g. AA/DL)" maxlength="10">
        </div>
        <button id="search-btn">Search</button>
    `;

    document.body.appendChild(panel);

    addToggleFunctionality(panel, () => {
        const displayPanel = document.querySelector('.display-panel');
        if (displayPanel) {
            displayPanel.classList.toggle('visible', !panel.classList.contains('hidden'));
        }
    }); // 添加按钮功能并同步右侧版面

    // 添加输入验证
    const fromInput = panel.querySelector('#from');
    const toInput = panel.querySelector('#to');
    const fromCoordinates = panel.querySelector('#from-coordinates');
    const toCoordinates = panel.querySelector('#to-coordinates');
    
    let airportData = null;

    // 加载机场数据
    fetch('assets/airports.geojson')
        .then(response => response.json())
        .then(data => {
            airportData = data.features.reduce((map, feature) => {
                const iata = feature.properties.IATA;
                const coordinates = feature.geometry.coordinates;
                map[iata] = { lat: coordinates[1], lon: coordinates[0] }; // 存储纬度和经度
                return map;
            }, {});
        });

    [fromInput, toInput].forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
            const coordinatesSpan = input.id === 'from' ? fromCoordinates : toCoordinates;
            if (airportData) {
                const coordinates = airportData[e.target.value];
                if (coordinates) {
                    const { lat, lon } = coordinates;
                    coordinatesSpan.textContent = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
                    
                    // 设置起点或终点机场
                    if (input.id === 'from') {
                        setFromAirportCoordinates(coordinates); // 设置起点机场
                    } else if (input.id === 'to') {
                        setToAirportCoordinates(coordinates); // 设置终点机场
                    }
                } else {
                    coordinatesSpan.textContent = 'Not found';
                }
            }
        });
    });

    const searchBtn = panel.querySelector('#search-btn');

    searchBtn.addEventListener('click', () => {
        let displayPanel = document.querySelector('.display-panel');
        
        // 如果右侧版面不存在，则创建
        if (!displayPanel) {
            displayPanel = document.createElement('div');
            displayPanel.classList.add('display-panel');
            document.body.appendChild(displayPanel);

            // 强制触发重绘以确保动画生效
            void displayPanel.offsetWidth;
        }

        // 添加 visible 类以触发动画
        displayPanel.classList.add('visible');
    });

    // 调用 collectFlightData
    collectFlightData();

    return panel;
}
