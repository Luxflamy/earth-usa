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
    scene.add(earth);

    // 删除外部辉光层相关代码
}


export function latLongToVector3(lat, lon, radius) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);
    return new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        -radius * Math.sin(phi) * Math.sin(theta)
    );
}
