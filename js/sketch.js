/**
 * 3D地球可视化 - 主程序 (sketch.js)
 * 功能：创建带国家/州边界的三维地球，支持鼠标交互旋转
 */

import { initScene, initCamera, initRenderer, initLighting, scene, camera, renderer } from './sceneSetup.js';
import { initEarth, earth } from './earthModel.js';
import { loadGeoJSON, loadAirports } from './geoDataLoader.js';
import { initEventListeners, targetRotation, isDragging, previousMousePosition } from './eventHandlers.js';
import { animate } from './animationLoop.js';
import { createDust } from './dustEffect.js';
import { showLoadingScreen, hideLoadingScreen } from './loadingScreen.js';
import { createFlightPath, setAirportCoordinates, startRandomFlightPaths } from './flightPathRenderer.js';

const EARTH_RADIUS = 1;
const BORDER_OFFSET = 0.001;
const ROTATION_SPEED = 0.0002;

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

        // 开始随机生成飞线
        startRandomFlightPaths(earth, EARTH_RADIUS, BORDER_OFFSET);
    });

    initEventListeners(camera, renderer);
    particles = createDust(earth);
}

init();
animate(renderer, scene, camera, earth, particles, globalRotation, targetRotation, currentRotation, ROTATION_SPEED);