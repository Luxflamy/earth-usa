export let isDragging = false;
export let previousMousePosition = { x: 0, y: 0 };
export let targetRotation = { x: 0, y: 0 };

let targetZoom = 2; // 目标缩放值
let currentZoom = 2000; // 当前缩放值
let targetY = 0; // 目标Y轴位置
let currentY = 0; // 当前Y轴位置

export let isMouseOverPanel = false; // 标志鼠标是否在面板上

// 通用节流函数,用来优化鼠标移动性能
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function (...args) {
        const context = this;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if (Date.now() - lastRan >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

export function initEventListeners(camera, renderer) {
    window.addEventListener('resize', () => onWindowResize(camera, renderer));
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', throttle(onMouseMove, 50)); // 添加节流
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', throttle((e) => onMouseWheel(e, camera), 50)); // 添加节流
    document.addEventListener('gesturestart', onGestureStart);
    document.addEventListener('gesturechange', throttle(onGestureChange, 50)); // 添加节流
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', throttle(onTouchMove, 50)); // 添加节流
    document.addEventListener('touchend', onTouchEnd);

    // 使用事件委托监听面板的鼠标进入和离开事件
    document.addEventListener('mouseover', (event) => {
        if (event.target.closest('.input-panel, .display-panel')) {
            isMouseOverPanel = true; // 鼠标进入面板
        }
    });

    document.addEventListener('mouseout', (event) => {
        if (event.target.closest('.input-panel, .display-panel')) {
            isMouseOverPanel = false; // 鼠标离开面板
        }
    });
}

function onWindowResize(camera, renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(e) {
    if (isMouseOverPanel) return; // 忽略鼠标事件
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
    if (isMouseOverPanel || !isDragging) return; // 忽略鼠标事件
    const deltaMove = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
    const sensitivity = 0.002;
    targetRotation.y += deltaMove.x * sensitivity;
    targetRotation.x += deltaMove.y * sensitivity;
    previousMousePosition = { x: e.clientX, y: e.clientY };
}

function onMouseUp() {
    if (isMouseOverPanel) return; // 忽略鼠标事件
    isDragging = false;
}

function onMouseWheel(event, camera) {
    if (isMouseOverPanel) return; // 忽略鼠标事件

    const zoomSpeed = 0.0005; // 缩放灵敏度（值越小灵敏度越低）
    const yShiftSpeed = 0.00011; // Y轴升降灵敏度

    targetZoom += event.deltaY * zoomSpeed; // 根据滚轮方向调整目标缩放值
    targetZoom = Math.max(1.8, Math.min(4, targetZoom)); // 限制缩放范围，最小值设置为3

    // 添加Y轴升降效果
    const yShift = event.deltaY * yShiftSpeed;
    targetY -= yShift; // 根据滚轮方向调整目标Y轴位置
    targetY = Math.max(-0.48, Math.min(0, targetY)); // 限制Y轴范围
}

function onGestureStart(event) {
    event.preventDefault(); // 阻止默认行为（如页面缩放）
}

function onGestureChange(event) {
    event.preventDefault(); // 阻止默认行为（如页面缩放）
    if (isMouseOverPanel) return; // 忽略鼠标事件

    const zoomSpeed = 0.05; // 缩放灵敏度
    if (event.scale > 1) {
        // 放大
        targetZoom -= (event.scale - 1) * zoomSpeed;
    } else {
        // 缩小
        targetZoom += (1 - event.scale) * zoomSpeed;
    }
    targetZoom = Math.max(1.8, Math.min(4, targetZoom)); // 限制缩放范围,最小值设置为3
}

// 记录触摸状态
let isTouching = false;
let previousTouchPositions = [];
let initialDistance = null;

function onTouchStart(event) {
    if (isMouseOverPanel) return; // 忽略鼠标事件

    if (event.touches.length === 1) {
        // 单指触控：开始拖动
        isTouching = true;
        previousTouchPositions = [{ x: event.touches[0].clientX, y: event.touches[0].clientY }];
    } else if (event.touches.length === 2) {
        // 双指触控：开始缩放
        isTouching = false; // 禁用拖动
        initialDistance = getDistance(event.touches[0], event.touches[1]);
    }
}

function onTouchMove(event) {
    if (isMouseOverPanel) return; // 忽略鼠标事件

    if (event.touches.length === 1 && isTouching) {
        // 单指触控：拖动
        const currentTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        const deltaMove = {
            x: currentTouch.x - previousTouchPositions[0].x,
            y: currentTouch.y - previousTouchPositions[0].y,
        };
        const sensitivity = 0.002;
        targetRotation.y += deltaMove.x * sensitivity;
        targetRotation.x += deltaMove.y * sensitivity;
        previousTouchPositions = [currentTouch];
    } else if (event.touches.length === 2) {
        // 双指触控：缩放
        const currentDistance = getDistance(event.touches[0], event.touches[1]);
        const zoomSpeed = 0.003; // 缩放灵敏度
        if (initialDistance) {
            targetZoom += (initialDistance - currentDistance) * zoomSpeed;
            targetZoom = Math.max(1.8, Math.min(4, targetZoom)); // 限制缩放范围,最小值设置为3
        }
        initialDistance = currentDistance;
    }
}

function onTouchEnd(event) {
    if (event.touches.length === 0) {
        // 触控结束
        isTouching = false;
        initialDistance = null;
    }
}

function getDistance(touch1, touch2) {
    // 计算两点之间的距离
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

export function updateZoom(camera) {
    if (isMouseOverPanel) return; // 忽略鼠标事件

    const easingFactor = 0.1; // 缓动系数，值越小缓动越慢
    currentZoom += (targetZoom - currentZoom) * easingFactor; // 缓动插值
    currentY += (targetY - currentY) * easingFactor ; // Y轴缓动插值

    camera.position.z = currentZoom; // 更新相机Z轴位置
    camera.position.y = currentY; // 更新相机Y轴位置
}
