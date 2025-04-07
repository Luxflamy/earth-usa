import { updateDust } from './dustEffect.js';
import { updateZoom } from './eventHandlers.js';

export function animate(renderer, scene, camera, earth, particles, globalRotation, targetRotation, currentRotation, ROTATION_SPEED) {
    requestAnimationFrame(() => animate(renderer, scene, camera, earth, particles, globalRotation, targetRotation, currentRotation, ROTATION_SPEED));
    
    globalRotation.y += ROTATION_SPEED;
    const easingFactor = 0.05;

    currentRotation.x += (targetRotation.x - currentRotation.x) * easingFactor;
    currentRotation.y += (targetRotation.y - currentRotation.y) * easingFactor;
    earth.rotation.x = currentRotation.x;
    earth.rotation.y = currentRotation.y + globalRotation.y;

    updateZoom(camera); // 更新相机缩放
    updateDust(particles); // 更新粉尘效果
    renderer.render(scene, camera);
}
