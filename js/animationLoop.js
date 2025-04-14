import { updateDust } from './dustEffect.js';
import { updateZoom } from './eventHandlers.js';

let rotationDirection = 1; // 自转方向，1 表示顺时针，-1 表示逆时针
const ROTATION_LIMIT = Math.PI / 40; // 限制范围

export function animate(renderer, scene, camera, earth, particles, globalRotation, targetRotation, currentRotation, ROTATION_SPEED) {
    requestAnimationFrame(() => animate(renderer, scene, camera, earth, particles, globalRotation, targetRotation, currentRotation, ROTATION_SPEED));
    
    // 更新自转方向
    globalRotation.y += ROTATION_SPEED * rotationDirection;
    if (globalRotation.y > ROTATION_LIMIT || globalRotation.y < -ROTATION_LIMIT) {
        rotationDirection *= -1; // 到达边界时反向
    }

    const easingFactor = 0.05;
    currentRotation.x += (targetRotation.x - currentRotation.x) * easingFactor;
    currentRotation.y += (targetRotation.y - currentRotation.y) * easingFactor;
    earth.rotation.x = currentRotation.x;
    earth.rotation.y = currentRotation.y + globalRotation.y;

    updateZoom(camera); // 更新相机缩放
    updateDust(particles); // 更新粉尘效果
    renderer.render(scene, camera);
}
