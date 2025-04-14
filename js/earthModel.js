export let earth;
export let earthGlow; // 导出辉光对象以便后续控制


export function initEarth(scene, EARTH_RADIUS, BORDER_OFFSET) {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 128, 128);

    // 自定义 ShaderMaterial（新增辉光参数）
    const material = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0x2596be) },
            opacityTop: { value: 0.2 },
            opacityBottom: { value: 0 },
            // 新增辉光参数
            glowColor: { value: new THREE.Color(0x00a3ff) }, // 辉光颜色
            glowPower: { value: 3.0 } // 辉光强度
        },
        vertexShader: `
            varying float vHeight;
            varying vec3 vNormal;  // 新增：传递法线
            varying vec3 vViewDir;  // 新增：传递视线方向

            void main() {
                vHeight = position.y;
                
                // 计算法线和视线方向
                vNormal = normalize(normalMatrix * normal);
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vViewDir = normalize(cameraPosition - worldPosition.xyz);
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            uniform float opacityTop;
            uniform float opacityBottom;
            uniform vec3 glowColor;  // 新增
            uniform float glowPower; // 新增
            varying float vHeight;
            varying vec3 vNormal;    // 新增
            varying vec3 vViewDir;   // 新增

            void main() {
                // 原始透明度计算
                float opacity = mix(opacityBottom, opacityTop, (vHeight + 1.0) / 2.0);
                
                // 新增边缘辉光计算
                float rim = 1.0 - dot(vNormal, vViewDir);
                rim = smoothstep(0.4, 1.0, rim); // 控制辉光范围
                rim = pow(rim, glowPower);
                
                // 混合颜色
                vec3 finalColor = mix(color, glowColor, rim);
                
                gl_FragColor = vec4(finalColor, opacity);
            }
        `,
        transparent: true
    });

    earth = new THREE.Mesh(geometry, material);

    // 设置地球的位置
    earth.position.set(0, -0.5, 0.7); // 调整地球的初始位置, 避免与背景重叠
    earth.rotation.y = Math.PI / 4; // 初始旋转角度
    earth.rotation.x = Math.PI / 4; // 初始旋转角度
 scene.add(earth);
}

export function latLongToVector3(lat, lon, radius) {
    // 将经纬度转换为弧度
    const phi = THREE.MathUtils.degToRad(90 - lat); // 纬度转换为极角(phi)
    const theta = THREE.MathUtils.degToRad(lon);     // 经度转换为方位角(theta)
    
    // 计算球面坐标
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = -radius * Math.sin(phi) * Math.sin(theta); // 注意z轴取负
    
    return new THREE.Vector3(x, y, z);
}


