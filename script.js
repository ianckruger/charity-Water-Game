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
controls.enablePan = false;
controls.enableDamping = true;
// --> Damping is an automatic x and y dragging feature and it adds momentum
// --> it lets it float for a little after dragging to keep it realistic
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 10;  // adding a min and max zoom too 

function animate() {
    // removing the spin untill i figure out a way to stop it spinning after its been interacted with.
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// this will handle all window resizing, incase of mobile phones or ipads, etc.
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})



// Keeping old code but commented out, i will use this as a "loading" icon

// let isDragging = false;
// let prevX = 0;
// let prevY = 0;

// document.addEventListener("mousedown", e => { 
//     isDragging = true; 
//     prevX = e.clientX;
//     prevY = e.clientY; });

// document.addEventListener("mouseup", () => { isDragging = false; });
// document.addEventListener("mousemove", e => {
//   if (isDragging) {
//     const delta = e.clientX - prevX;
//     globe.rotation.y += delta * 0.005;
//     prevX = e.clientX;

//     const delta2 = e.clientY - prevY;
//     globe.rotation.x += delta2 * 0.005;
//     prevY = e.clientY;
//   }
// });
