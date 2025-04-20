export function createDust(earth) {
    // 创建粒子系统
    const particleCount = 5000; // 粒子数量
    const particleGeometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = []; // 存储每个粒子的速度

    for (let i = 0; i < particleCount; i++) {
        // 随机生成粒子位置 (在 -5 到 5 的范围内)
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;
        positions.push(x, y, z);

        // 初始化速度向量 (随机方向，初始速度较小)
        const vx = (Math.random() - 0.5) * 0.0001;
        const vy = (Math.random() - 0.5) * 0.0001;
        const vz = (Math.random() - 0.5) * 0.0001;
        velocities.push(vx, vy, vz);
    }

    particleGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    );

    // 加载圆形粒子纹理
    const textureLoader = new THREE.TextureLoader();
    const particleTexture = textureLoader.load('assets/circle.png'); // 确保路径正确

    // 创建粒子材质
    const particleMaterial = new THREE.PointsMaterial({
        map: particleTexture,      // 使用圆形纹理
        color: 0xa2efe1,           // 粒子颜色
        size: 0.01,                // 粒子大小
        transparent: true,         // 开启透明度
        opacity: 0.8,              // 粒子透明度
        // blending: THREE.AdditiveBlending, // 叠加效果
        depthWrite: false          // 禁止深度写入，避免遮挡
    });

    // 创建粒子系统
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.velocities = velocities; // 将速度存储到粒子系统的 userData 中

    // 将粒子系统添加为地球的子对象
    earth.add(particles);

    return particles; // 返回粒子系统对象
}

export function updateDust(particles) {
    // 更新粒子位置 (模拟太空环境)
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;
    
    // 太空环境参数
    const gravityFactor = 0.0000;     // 非常微弱的引力场
    const spaceResistance = 0.9999;    // 太空中几乎没有阻力
    const solarWindStrength = 0.0000002; // 太阳风强度
    const solarWindDirection = { x: 0.5, y: 0.2, z: -0.1 }; // 太阳风方向

    for (let i = 0; i < positions.length; i += 3) {
        // 计算粒子到中心点的距离和方向（用于引力计算）
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        const distanceSquared = x * x + y * y + z * z;
        const distance = Math.sqrt(distanceSquared);
        
        // 避免除以零
        if (distance > 0.1) {
            // 向中心的引力（模拟行星引力场）
            const gravitationalForce = gravityFactor / distanceSquared;
            velocities[i] -= (x / distance) * gravitationalForce;
            velocities[i + 1] -= (y / distance) * gravitationalForce;
            velocities[i + 2] -= (z / distance) * gravitationalForce;
        }
        
        // 太空中极低的阻力
        velocities[i] *= spaceResistance;
        velocities[i + 1] *= spaceResistance;
        velocities[i + 2] *= spaceResistance;

        // 太阳风影响 - 持续的弱方向力
        velocities[i] += solarWindDirection.x * solarWindStrength;
        velocities[i + 1] += solarWindDirection.y * solarWindStrength;
        velocities[i + 2] += solarWindDirection.z * solarWindStrength;

        // 随机微扰动（模拟星际介质的量子扰动）
        const quantumTurbulence = 0.00005; // 星际介质的随机干扰
        velocities[i] += (Math.random() - 0.5) * quantumTurbulence;
        velocities[i + 1] += (Math.random() - 0.5) * quantumTurbulence;
        velocities[i + 2] += (Math.random() - 0.5) * quantumTurbulence;

        // 更新位置
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // 边界检测（太空无限延伸，但为了性能我们需要循环利用粒子）
        const boundary = 5; // 扩大边界范围
        if (Math.abs(positions[i]) > boundary || 
            Math.abs(positions[i + 1]) > boundary || 
            Math.abs(positions[i + 2]) > boundary) {
            
            // 在边界附近重新生成粒子，保持一定的出入平衡
            // 随机生成在球壳上的点，避免突然出现在中心区域
            const phi = Math.random() * Math.PI * 2; // 随机角度
            const theta = Math.acos(2 * Math.random() - 1); // 均匀分布在球面上
            const radius = boundary * 0.9;
            
            positions[i] = radius * Math.sin(theta) * Math.cos(phi);
            positions[i + 1] = radius * Math.sin(theta) * Math.sin(phi);
            positions[i + 2] = radius * Math.cos(theta);
            
            // 重置速度（向球心方向的轻微速度）
            const initialSpeed = 0.001;
            velocities[i] = -positions[i] / radius * initialSpeed * Math.random();
            velocities[i + 1] = -positions[i + 1] / radius * initialSpeed * Math.random();
            velocities[i + 2] = -positions[i + 2] / radius * initialSpeed * Math.random();
        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
}