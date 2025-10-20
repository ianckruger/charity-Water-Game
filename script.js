// Developed by Ian Kruger
// Everything you need to know is here --> https://threejs.org/manual/#en/responsive
// Orbit control handling --> https://threejs.org/docs/#examples/en/controls/OrbitControls
// 3D map positioning --> https://threejs.org/docs/#api/en/core/Object3D.position
// raycaster aka live mouse picking/ hotspot stuff --> https://threejs.org/docs/#api/en/core/Raycaster

// want to contain it in a section rather than have the canvas as a screen

const container = document.getElementById("globe-container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  container.clientWidth / container.clientHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Globe texture
const texture = new THREE.TextureLoader().load("assets/images/globe-image.webp");
const greyTexture = new THREE.TextureLoader().load("assets/images/globe-image-grey.webp");

// shader for blending
const globeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    greyMap: { value: greyTexture },
    colorMap: { value: texture },
    blendFactor: { value: 0.0 } // starting fully grey
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D greyMap;
    uniform sampler2D colorMap;
    uniform float blendFactor;
    varying vec2 vUv;
    void main() {
      vec4 greyColor = texture2D(greyMap, vUv);
      vec4 colorColor = texture2D(colorMap, vUv);
      gl_FragColor = mix(greyColor, colorColor, blendFactor);
    }
  `
});

const geometry = new THREE.SphereGeometry(2, 32, 32);
const globe = new THREE.Mesh(geometry, globeMaterial);
scene.add(globe);
camera.position.z = 5;

// Shuffle array using Fisher–Yates algorithm
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
shuffle(hotspotData); // shuffle BEFORE marker creation

// Guessing game variables
let currIndex = 0;
let foundRegions = 0;
let gameActive = true;

// now were adding latitude and longitude calcs for specific areas on the map
// this should place tiny spheres on the areas ive chosen
const hotspotGeometry = new THREE.SphereGeometry(0.06, 16, 16);
const hotspots = [];

hotspotData.forEach(({ name, lat, lon, info }) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const radius = 2.1; // slightly above globe surface

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  const hotspotMaterial = new THREE.MeshBasicMaterial({ color: 0xffc400 });
  const marker = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
  marker.position.set(x, y, z);
  marker.userData = { name, info, visited: false };
  marker.visible = false; // hidden until discovered
  scene.add(marker);
  hotspots.push(marker);
});

// show the first clue
showClue();
updateProgress();

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.enableDamping = true;
// --> Damping is an automatic x and y dragging feature and it adds momentum
// --> it lets it float for a little after dragging to keep it realistic
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 10; // adding a min and max zoom too

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// handle window resizing
window.addEventListener("resize", () => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

// use raycaster to detect clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", onGlobeClick);

function onGlobeClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // First check for marker clicks
  const markerIntersects = raycaster.intersectObjects(hotspots.filter(h => h.visible));
  if (markerIntersects.length > 0) {
    const clickedMarker = markerIntersects[0].object;
    if (clickedMarker.userData.visited) {
      showInfo(clickedMarker.userData.name, clickedMarker.userData.info);
      return;
    }
  }

  // Otherwise, guess mode (if game is active)
  if (gameActive) {
    const globeIntersects = raycaster.intersectObject(globe);
    if (globeIntersects.length > 0) {
      const point = globeIntersects[0].point.normalize();
      checkGuess(point);
    }
  }
}

function checkGuess(clickedPoint) {
  const target = latLonToVector3(hotspotData[currIndex].lat, hotspotData[currIndex].lon);
  const distance = clickedPoint.distanceTo(target);

  if (distance < 0.1) {
    revealRegion();
  } else {
    showTemporaryMessage("Not quite. Try again!");
  }
}

function latLonToVector3(lat, lon) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  );
}

function revealRegion() {
  const { name, info } = hotspotData[currIndex];
  const hotspot = hotspots[currIndex];

  hotspot.visible = true;
  hotspot.userData.visited = true;
  showInfo(name, info);

  foundRegions++;
  updateProgress();
  blendGlobeColor();

  currIndex++;
  if (currIndex < hotspotData.length) {
    showClue();
  } else {
    gameActive = false;
    showTemporaryMessage("You discovered all regions!");
    globe.material.uniforms.blendFactor.value = 1.0;
  }
}

function blendGlobeColor() {
  const total = hotspotData.length;
  const targetBlend = foundRegions / total;
  const startBlend = globe.material.uniforms.blendFactor.value;

  let progress = 0;
  const duration = 1000;
  function animateBlend() {
    progress += 16 / duration;
    const eased = startBlend + (targetBlend - startBlend) * Math.min(progress, 1);
    globe.material.uniforms.blendFactor.value = eased;
    if (progress < 1) requestAnimationFrame(animateBlend);
  }
  animateBlend();
}

function showTemporaryMessage(text) {
  const msg = document.createElement("div");
  msg.textContent = text;
  msg.style.position = "fixed";
  msg.style.top = "10%";
  msg.style.left = "50%";
  msg.style.transform = "translateX(-50%)";
  msg.style.background = "rgba(0,0,0,0.7)";
  msg.style.color = "#ffc907";
  msg.style.padding = "10px 20px";
  msg.style.borderRadius = "10px";
  msg.style.fontSize = "1rem";
  msg.style.zIndex = 200;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 1500);
}

// SHOW INFORMATION FUNCTION
// SHOW INFORMATION ABOUT THE DISCOVERED REGION --> APPEAR AS A CARD BOX
function showInfo(name, info) {
  const infoBox = document.getElementById("info-box");
  const infoContent = document.getElementById("info-box-content");

  infoContent.innerHTML = `<h2>${name}</h2>
  <p>${info}</p>
  <button id="close-info">Close</button>`;
  infoBox.style.display = "flex";
  infoBox.classList.remove("fade-out");

  // Function to hide with fade
  const hideOverlay = () => {
    infoBox.classList.add("fade-out");
    setTimeout(() => {
      infoBox.style.display = "none";
      infoBox.classList.remove("fade-out");
    }, 300);
  };

  // click the button to close
  document.getElementById("close-info").addEventListener("click", hideOverlay);

  // click outside to close (for mobile)
  infoBox.addEventListener("click", e => {
    if (e.target === infoBox) hideOverlay();
  });
}

// making it highlight on hover cause itll look cool (i know its a prototype as of right now but cmon)
window.addEventListener("mousemove", onHotspotHover);

function onHotspotHover(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hotspots);

  hotspots.forEach(h => h.material.color.set(0xffc907)); // reset
  if (intersects.length > 0) {
    intersects[0].object.material.color.set(0xfff7e1); // glow white
  }
}

function updateProgress() {
  const total = hotspotData.length;
  const percent = (foundRegions / total) * 100;
  document.getElementById("progress-bar").style.width = percent + "%";
  document.getElementById("progress-text").textContent =
    `${foundRegions} / ${total} regions discovered`;
}

// fixing feedback and adding the touchscreen element for mobile users
renderer.domElement.addEventListener("touchstart", e => {
  e.preventDefault();
  const touch = e.touches[0];
  onGlobeClick({ clientX: touch.clientX, clientY: touch.clientY });
});

renderer.domElement.addEventListener("touchmove", e => {
  e.preventDefault();
  const touch = e.touches[0];
  onHotspotHover({ clientX: touch.clientX, clientY: touch.clientY });
});

function showClue() {
  const clueText = document.getElementById("clue-text");
  const { clue } = hotspotData[currIndex];
  clueText.textContent = clue;
}
