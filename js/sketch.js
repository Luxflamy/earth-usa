/**
 * 3D地球可视化 - 主程序 (sketch.js)
 * 功能：创建带国家/州边界的三维地球，支持鼠标交互旋转
 */
import { iataToCoordinates } from './geoDataLoader.js';
import { initScene, initCamera, initRenderer, initLighting, scene, camera, renderer } from './sceneSetup.js';
import { initEarth, earth } from './earthModel.js';
import { loadGeoJSON, loadAirports } from './geoDataLoader.js';
import { initEventListeners, targetRotation, isDragging, previousMousePosition } from './eventHandlers.js';
import { animate } from './animationLoop.js';
import { createDust } from './dustEffect.js';
import { showLoadingScreen, hideLoadingScreen } from './loadingScreen.js';
import { setAirportCoordinates, startRandomFlightPaths, startFlightsFromAirport, startFlightsToAirport, startFlightsFromToAirport, setFromAirportCoordinates, setToAirportCoordinates, clearAllFlights } from './flightPathRenderer.js';
import { createInputPanel } from './ui/inputPanel.js';

const EARTH_RADIUS = 1;
const BORDER_OFFSET = 0.001;
const ROTATION_SPEED = 0.00005; // 调整此值来改变自转速度

let particles;
let globalRotation = { y: 0 };
let currentRotation = { x: 0, y: 0 };

function init() {
    showLoadingScreen(); // 显示加载页面

    initScene();
    initCamera();
    initRenderer();
    initLighting();
    initEarth(scene, EARTH_RADIUS, BORDER_OFFSET);
    
    // 创建输入面板
    const panel = createInputPanel();

    // 加载地理数据
    Promise.all([
        loadGeoJSON('assets/countries.geojson', 0x888888, 1, earth, EARTH_RADIUS, BORDER_OFFSET),
        loadGeoJSON('assets/us-states.geojson', 0x2596be, 4, earth, EARTH_RADIUS, BORDER_OFFSET),
        loadAirports('assets/airports.geojson', earth, EARTH_RADIUS, BORDER_OFFSET) // 加载机场数据
            .then(airportCoordinates => {
                // 设置机场坐标
                setAirportCoordinates(airportCoordinates);
            })
    ]).then(() => {
        // 确保所有资源加载完成后隐藏加载页面
        hideLoadingScreen();

        // 获取输入面板的值
        const fromInput = panel.querySelector('#from');
        const toInput = panel.querySelector('#to');
        const searchButton = panel.querySelector('#search-btn');
        let flightInterval = null;
        // startRandomFlightPaths(earth, EARTH_RADIUS, BORDER_OFFSET);
        startRandomFlightPaths(earth, EARTH_RADIUS, BORDER_OFFSET);
        searchButton.addEventListener('click', () => {
            // 清除之前的飞线生成逻辑
            if (flightInterval) {
                clearInterval(flightInterval);
            }

            // 删除之前的飞线
            clearAllFlights(earth);

            const fromCode = fromInput.value.trim().toUpperCase();
            const toCode = toInput.value.trim().toUpperCase();

            if (fromCode && iataToCoordinates[fromCode]) {
                const fromCoordinates = iataToCoordinates[fromCode];
                setFromAirportCoordinates(fromCoordinates);

                if (toCode && iataToCoordinates[toCode]) {
                    // 从指定机场飞到指定机场
                    const toCoordinates = iataToCoordinates[toCode];
                    setToAirportCoordinates(toCoordinates);
                    startFlightsFromToAirport(earth, EARTH_RADIUS, BORDER_OFFSET);
                } else {
                    // 从指定机场飞到随机机场
                    startFlightsFromAirport(earth, EARTH_RADIUS, BORDER_OFFSET);
                }
            } else if (toCode && iataToCoordinates[toCode]) {
                // 飞到指定机场
                const toCoordinates = iataToCoordinates[toCode];
                setToAirportCoordinates(toCoordinates);
                startFlightsToAirport(earth, EARTH_RADIUS, BORDER_OFFSET);
            } else {
                // 如果输入无效或为空，随机生成飞线
                // startRandomFlightPaths(earth, EARTH_RADIUS, BORDER_OFFSET);
            }
        });
    });

    initEventListeners(camera, renderer);
    particles = createDust(earth);
}

init();
animate(renderer, scene, camera, earth, particles, globalRotation, targetRotation, currentRotation, ROTATION_SPEED);