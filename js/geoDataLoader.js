import { latLongToVector3 } from './earthModel.js';

export function loadGeoJSON(url, lineColor, lineWidth, earth, EARTH_RADIUS, BORDER_OFFSET) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            data.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    processPolygon(feature.geometry.coordinates, lineColor, lineWidth, earth, EARTH_RADIUS, BORDER_OFFSET);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(polygon => {
                        processPolygon(polygon, lineColor, lineWidth, earth, EARTH_RADIUS, BORDER_OFFSET);
                    });
                }
            });
        });
}

export const iataToCoordinates = {}; // 全局对象，用于存储 IATA 到经纬度的映射
export function loadAirports(url, earth, EARTH_RADIUS, BORDER_OFFSET) {
    return fetch(url)
        .then(response => response.json())
        .then(data => {
            const airportCoordinates = [];
            data.features.forEach(feature => {
                if (feature.geometry.type === 'Point') {
                    const [longitude, latitude] = feature.geometry.coordinates;
                    const traffic = feature.properties.TOT_ENP || 0; // 获取机场流量
                    const iata = feature.properties.IATA || ''; // 获取 IATA 代码
                    if (iata) {
                        iataToCoordinates[iata] = { lat: latitude, lon: longitude }; // 存储映射
                    }
                    addAirportMarker(latitude, longitude, earth, EARTH_RADIUS, BORDER_OFFSET, traffic);
                    airportCoordinates.push({ lat: latitude, lon: longitude });
                }
            });
            return airportCoordinates; // 返回机场坐标数组
        });
}

function processPolygon(coordinates, lineColor, lineWidth, earth, EARTH_RADIUS, BORDER_OFFSET) {
    // 绘制边缘线条
    const lineMaterial = new THREE.LineBasicMaterial({
        color: lineColor,
        linewidth: lineWidth,
        opacity: 0.9,
        depthWrite: false
    });
    const points = coordinates[0].map(coord => {
        const [longitude, latitude] = coord;
        return latLongToVector3(latitude, longitude, EARTH_RADIUS + BORDER_OFFSET);
    });
    if (points.length > 0) points.push(points[0].clone());
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    earth.add(line);

    // 添加点阵填充效果
    addDotPattern(coordinates, earth, EARTH_RADIUS + BORDER_OFFSET);
}

function addDotPattern(coordinates, earth, radius) {
    const dotMaterial = new THREE.PointsMaterial({
        color: 0x2596be, // 点的颜色
        size: 0.005,     // 点的大小
        transparent: true,
        opacity: 0.15,
    });

    const dots = [];
    const step = 0.7; // 点阵密度控制，值越小点越密集

    // 遍历多边形范围，生成点阵
    for (let lat = -90; lat <= 90; lat += step) {
        for (let lon = -180; lon <= 180; lon += step) {
            if (isPointInsidePolygon(lat, lon, coordinates)) {
                const position = latLongToVector3(lat, lon, radius);
                dots.push(position);
            }
        }
    }

    const dotGeometry = new THREE.BufferGeometry().setFromPoints(dots);
    const dotMesh = new THREE.Points(dotGeometry, dotMaterial);
    earth.add(dotMesh);
}

/**
 * 判断点是否在多边形内
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @param {Array} polygon - 多边形坐标数组
 * @returns {boolean} 点是否在多边形内
 */
function isPointInsidePolygon(lat, lon, polygon) {
    let inside = false;
    const x = lon, y = lat;
    const vs = polygon[0]; // 主环坐标

    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
                          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}

const airportPositions = []; // 用于存储所有机场的三维位置

function addAirportMarker(lat, lon, earth, EARTH_RADIUS, BORDER_OFFSET, traffic) {
    const baseRadius = 0.0004; // 基础小圆半径
    const scaleFactor = 0.001; // 缩放系数

    // 使用对数缩放，确保小机场可见，同时限制大机场的增大程度
    const dynamicRadius = baseRadius + Math.log10(traffic + 1) * scaleFactor;

    console.log(`Airport at (${lat}, ${lon}) with traffic ${traffic} has radius ${dynamicRadius.toFixed(6)}`);

    const circleOpacity = 0.2; // 圆的透明度
    const circleColor = 0xff6361; // 圆的颜色

    // 创建小圆
    const smallGeometry = new THREE.CircleGeometry(dynamicRadius * 0.5, 32);
    const smallMaterial = new THREE.MeshBasicMaterial({
        color: circleColor,
        transparent: true,
        opacity: circleOpacity
    });
    const smallCircle = new THREE.Mesh(smallGeometry, smallMaterial);

    // 创建中圆
    const mediumGeometry = new THREE.CircleGeometry(dynamicRadius, 32);
    const mediumMaterial = new THREE.MeshBasicMaterial({
        color: circleColor,
        transparent: true,
        opacity: circleOpacity
    });
    const mediumCircle = new THREE.Mesh(mediumGeometry, mediumMaterial);

    // 创建大圆
    const largeGeometry = new THREE.CircleGeometry(dynamicRadius * 1.5, 32);
    const largeMaterial = new THREE.MeshBasicMaterial({
        color: circleColor,
        transparent: true,
        opacity: circleOpacity
    });
    const largeCircle = new THREE.Mesh(largeGeometry, largeMaterial);

    // 设置圆环位置
    let position = latLongToVector3(lat, lon, EARTH_RADIUS + BORDER_OFFSET + 0.001);
    position = resolveOverlap(position); // 检测重叠

    // 调整每个圆的高度，避免同心圆重叠
    const normal = position.clone().normalize();
    smallCircle.position.copy(position.clone().add(normal.clone().multiplyScalar(0.0003))); // 小圆稍微偏移
    mediumCircle.position.copy(position.clone().add(normal.clone().multiplyScalar(0.0002))); // 中圆稍微偏移
    largeCircle.position.copy(position.clone().add(normal.clone().multiplyScalar(0.0001))); // 大圆稍微偏移

    // 调整圆环朝向
    smallCircle.lookAt(normal.add(smallCircle.position));
    mediumCircle.lookAt(normal.add(mediumCircle.position));
    largeCircle.lookAt(normal.add(largeCircle.position));

    // 添加到地球
    earth.add(smallCircle);
    earth.add(mediumCircle);
    earth.add(largeCircle);

    // 添加机场标记和直线
    addAirportLabelAndLine(lat, lon, earth, EARTH_RADIUS, BORDER_OFFSET, traffic, circleColor);

    // 将当前机场的位置存储到数组中
    airportPositions.push(position);
}

function addAirportLabelAndLine(lat, lon, earth, EARTH_RADIUS, BORDER_OFFSET, traffic, color) {
    const heightFactor = 0.00008; // 高度缩放系数（可调整）
    const height = Math.sqrt(traffic) * heightFactor; // 根据流量计算高度

    // 创建标记小球
    const labelGeometry = new THREE.SphereGeometry(0.0005, 16, 16); // 标记为小球
    const labelMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, // 修改为固定颜色
        transparent: true,
        opacity: 0.8
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);

    // 设置标记位置
    const labelPosition = latLongToVector3(lat, lon, EARTH_RADIUS + BORDER_OFFSET + 0.00001 + height);
    label.position.copy(labelPosition);

    // 创建沿地球法线的细直线
    const start = latLongToVector3(lat, lon, EARTH_RADIUS + BORDER_OFFSET + 0.00001); // 起点
    const end = labelPosition.clone(); // 终点
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);

    // 添加到地球
    earth.add(label);
    earth.add(line);
}

/**
 * 检测并解决机场标记的重叠问题
 * @param {THREE.Vector3} position - 当前机场的三维位置
 * @returns {THREE.Vector3} 调整后的三维位置
 */
function resolveOverlap(position) {
    const minDistance = 0.01; // 最小距离，避免重叠
    for (const existingPosition of airportPositions) {
        if (position.distanceTo(existingPosition) < minDistance) {
            // 如果重叠，将位置稍微偏移
            const offset = position.clone().sub(existingPosition).normalize().multiplyScalar(minDistance);
            position.add(offset);
        }
    }
    return position;
}
