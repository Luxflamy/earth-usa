import { latLongToVector3 } from './earthModel.js';

export function createFlightPath(startLat, startLon, endLat, endLon, earth, EARTH_RADIUS, BORDER_OFFSET) {
    const start = latLongToVector3(startLat, startLon, EARTH_RADIUS + BORDER_OFFSET);
    const end = latLongToVector3(endLat, endLon, EARTH_RADIUS + BORDER_OFFSET);

    // 创建飞线的曲线
    const curve = new THREE.QuadraticBezierCurve3(
        start,
        start.clone().add(end).multiplyScalar(0.5).setLength(EARTH_RADIUS + BORDER_OFFSET + 0.1), // 控制点
        end
    );

    const points = curve.getPoints(50); // 曲线分段
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // 创建飞线材质
    const material = new THREE.LineBasicMaterial({
        color: 0xff6361, // 飞线颜色
        linewidth: 2,    // 调整线条宽度
        transparent: true,
        opacity: 1    
    });

    const line = new THREE.Line(geometry, material);
    earth.add(line);

    // 动画效果
    animateFlight(line, points, earth, EARTH_RADIUS, BORDER_OFFSET, endLat, endLon);
}

function animateFlight(line, points, earth, EARTH_RADIUS, BORDER_OFFSET, endLat, endLon) {
    const totalPoints = points.length;
    let currentPoint = 0;

    function animate() {
        if (currentPoint < totalPoints) {
            const visiblePoints = points.slice(0, currentPoint + 1);
            line.geometry.setFromPoints(visiblePoints);
            currentPoint++;
            requestAnimationFrame(animate);
        } else {
            // 飞线到达终点后触发机场闪烁效果
            createFlashingRing(endLat, endLon, earth, EARTH_RADIUS, BORDER_OFFSET);

            // 开始让飞线从后端逐渐消失
            fadeOutFlight(line, points, earth);
        }
    }

    animate();
}

function fadeOutFlight(line, points, earth) {
    let currentPoint = points.length;

    function animateFadeOut() {
        if (currentPoint > 0) {
            const visiblePoints = points.slice(points.length - currentPoint);
            line.geometry.setFromPoints(visiblePoints);
            currentPoint--;
            requestAnimationFrame(animateFadeOut);
        } else {
            // 动画结束后从场景中移除飞线
            earth.remove(line);
        }
    }

    animateFadeOut();
}

function createFlashingRing(lat, lon, earth, EARTH_RADIUS, BORDER_OFFSET) {
    const textureLoader = new THREE.TextureLoader();
    const ringTexture = textureLoader.load('assets/Red Ellipse.png'); // 加载圆环图样

    const material = new THREE.SpriteMaterial({
        map: ringTexture,
        transparent: true,
        opacity: 0.8
    });

    const sprite = new THREE.Sprite(material);
    const position = latLongToVector3(lat, lon, EARTH_RADIUS + BORDER_OFFSET + 0.001);
    sprite.position.copy(position);

    const scale = 0.02; // 初始缩放大小
    sprite.scale.set(scale, scale, 1);
    earth.add(sprite);

    // 闪烁动画
    let growing = true;
    const maxScale = 0.03;
    const minScale = 0.01;

    function animateRing() {
        if (growing) {
            sprite.scale.x += 0.0005;
            sprite.scale.y += 0.0005;
            if (sprite.scale.x >= maxScale) growing = false;
        } else {
            sprite.scale.x -= 0.0005;
            sprite.scale.y -= 0.0005;
            if (sprite.scale.x <= minScale) growing = true;
        }

        sprite.material.opacity -= 0.01;
        if (sprite.material.opacity <= 0) {
            earth.remove(sprite); // 动画结束后移除圆环
        } else {
            requestAnimationFrame(animateRing);
        }
    }

    animateRing();
}

let airportCoordinates = []; // 全局变量，用于存储所有机场的坐标

export function setAirportCoordinates(coordinates) {
    airportCoordinates = coordinates; // 从外部设置机场坐标
}

export function startRandomFlightPaths(earth, EARTH_RADIUS, BORDER_OFFSET) {
    if (airportCoordinates.length < 2) {
        console.warn('Not enough airports to create flight paths.');
        return;
    }

    setInterval(() => {
        const startIndex = Math.floor(Math.random() * airportCoordinates.length);
        let endIndex;
        do {
            endIndex = Math.floor(Math.random() * airportCoordinates.length);
        } while (startIndex === endIndex); // 确保起点和终点不同

        const start = airportCoordinates[startIndex];
        const end = airportCoordinates[endIndex];

        createFlightPath(start.lat, start.lon, end.lat, end.lon, earth, EARTH_RADIUS, BORDER_OFFSET);
    }, 1500); // 多久生成一条飞线
}
