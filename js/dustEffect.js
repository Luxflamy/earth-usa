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
        const vx = (Math.random() - 0.5) * 0.001;
        const vy = (Math.random() - 0.5) * 0.001;
        const vz = (Math.random() - 0.5) * 0.001;
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
        blending: THREE.AdditiveBlending, // 叠加效果
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
    // 更新粒子位置 (模拟空气动力学)
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;

    for (let i = 0; i < positions.length; i += 3) {
        // 更新速度 (模拟空气阻力)
        velocities[i] *= 0.99;       // 模拟空气阻力 (X轴)
        velocities[i + 1] *= 0.99;   // 模拟空气阻力 (Y轴)
        velocities[i + 2] *= 0.99;   // 模拟空气阻力 (Z轴)

        // 添加小幅随机扰动 (减少抖动)
        const turbulence = 0.0001; // 随机扰动幅度
        velocities[i] += (Math.random() - 0.5) * turbulence;
        velocities[i + 1] += (Math.random() - 0.5) * turbulence;
        velocities[i + 2] += (Math.random() - 0.5) * turbulence;

        // 更新位置
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // 边界检测 (如果超出范围则重置位置)
        const boundary = 5; // 边界范围
        if (positions[i + 1] < -boundary) positions[i + 1] = boundary; // Y轴循环
        if (positions[i] < -boundary || positions[i] > boundary) positions[i] = (Math.random() - 0.5) * 10;
        if (positions[i + 2] < -boundary || positions[i + 2] > boundary) positions[i + 2] = (Math.random() - 0.5) * 10;
    }

    particles.geometry.attributes.position.needsUpdate = true;
}