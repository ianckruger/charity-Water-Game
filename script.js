const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Globe texture
const texture = new THREE.TextureLoader().load('assets/images/globe-image.jpg', 
    () => console.log('Texture loaded!'),
    undefined,
    err => console.error('Error loading texture:', err)
);

const geometry = new THREE.SphereGeometry(2,32,32);
const material = new THREE.MeshBasicMaterial({ map: texture });
const globe = new THREE.Mesh(geometry, material);
scene.add(globe);

camera.position.z = 5;

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = true;

function animate() {
    requestAnimationFrame(animate);
    globe.rotation.y += 0.002; // this is the spin speed
    controls.update();
    renderer.render(scene, camera);
}
animate();

let isDragging = false;
let prevX = 0;
let prevY = 0;

document.addEventListener("mousedown", e => { 
    isDragging = true; 
    prevX = e.clientX;
    prevY = e.clientY; });

document.addEventListener("mouseup", () => { isDragging = false; });
document.addEventListener("mousemove", e => {
  if (isDragging) {
    const delta = e.clientX - prevX;
    globe.rotation.y += delta * 0.005;
    prevX = e.clientX;

    const delta2 = e.clientY - prevY;
    globe.rotation.x += delta2 * 0.005;
    prevY = e.clientY;
  }
});
