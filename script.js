// Developed by Ian Kruger
// Everything you need to know is here --> https://threejs.org/manual/#en/responsive
// Orbit control handling --> https://threejs.org/docs/#examples/en/controls/OrbitControls
// 3D map positioning --> https://threejs.org/docs/#api/en/core/Object3D.position
// raycaster aka live mouse picking/ hotspot stuff --> https://threejs.org/docs/#api/en/core/Raycaster

// want to contain it in a section rather than have the canvas as a screen


const container = document.getElementById("globe-container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Globe texture
const texture = new THREE.TextureLoader().load('assets/images/globe-image.webp', 
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
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});


// now were adding latitude and longitude calcs for specific areas on the map
// this should place tiny spheres on the areas ive chosen
const hotspotGeometry = new THREE.SphereGeometry(0.12, 16, 16);
const hotspotMaterial = new THREE.MeshBasicMaterial({ color: 0xffc400 });
const hotspots = [];

hotspotData.forEach(({ name, lat, lon, info }) => {
    const phi = ( 90 - lat ) * ( Math.PI / 180 );
    const theta = ( lon + 180 ) * ( Math.PI / 180 );
    const radius = 2.1; // the .1 is so its above the globes surface

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const marker = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
    marker.position.set(x,y,z);
    marker.userData = { name, info };
    scene.add(marker);
    hotspots.push(marker);
});

// use raycaster to detect the clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', onGlobeClick);

function onGlobeClick(event) {
    // we take the mouse location and turn it into coordinate to match the hotspots
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hotspots);

    if ( intersects.length > 0) {
        const clicked = intersects[0].object;
        showInfo(clicked.userData.name, clicked.userData.info);
    }
}

function showInfo(name, info) {
    const infoBox = document.getElementById('info-box');
    infoBox.style.display = 'block';
    infoBox.innerHTML = `
    <h2>${name}</h2>
    <p>${info}</p>
    `;
}

// making it highlight on hover cause itll look cool (i know its a prototype as of right now but cmon)
window.addEventListener('mousemove', onHotspotHover);

function onHotspotHover(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hotspots);
  
  hotspots.forEach(h => h.material.color.set(0xffc907)); // reset
  if (intersects.length > 0) {
    intersects[0].object.material.color.set(0xFFF7E1); // glow white
  }
}



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
