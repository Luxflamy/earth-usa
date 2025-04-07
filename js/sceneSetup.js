export let scene, camera, renderer;

export function initScene() {
    scene = new THREE.Scene();
    const textureLoader = new THREE.TextureLoader();
    const backgroundTexture = textureLoader.load('assets/background.jpg');
    const backgroundGeometry = new THREE.PlaneGeometry(22, 15);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
        map: backgroundTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
    });
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    backgroundMesh.position.z = -5;
    scene.add(backgroundMesh);
}

export function initCamera() {
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 2;
}

export function initRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
}

export function initLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 2, 0.05);
    pointLight.position.set(2, 3, 2);
    scene.add(pointLight);
}
