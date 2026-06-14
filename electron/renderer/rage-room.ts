const SCENES: Array<{
  name: string;
  bg: string;
  floor: string;
  wall: string;
  items: Array<{ emoji: string; label: string; w?: number; h?: number }>;
}> = [
  {
    name: "Living Room",
    bg: "linear-gradient(180deg, #c8a97e 0%, #c8a97e 60%, #8b6343 60%)",
    floor: "#8b6343",
    wall: "#c8a97e",
    items: [
      { emoji: "🏺", label: "Vase" },
      { emoji: "🪞", label: "Mirror" },
      { emoji: "🖼️", label: "Painting" },
      { emoji: "🕯️", label: "Candle" },
      { emoji: "📺", label: "TV" },
      { emoji: "🛋️", label: "Sofa" },
      { emoji: "☕", label: "Mug" },
      { emoji: "🍶", label: "Bottle" },
      { emoji: "📚", label: "Books" },
      { emoji: "🪴", label: "Plant" },
    ],
  },
  {
    name: "Kitchen",
    bg: "linear-gradient(180deg, #e8e0d0 0%, #e8e0d0 60%, #b0956a 60%)",
    floor: "#b0956a",
    wall: "#e8e0d0",
    items: [
      { emoji: "🥂", label: "Wine Glass" },
      { emoji: "🍽️", label: "Plate" },
      { emoji: "🫖", label: "Teapot" },
      { emoji: "🍵", label: "Tea Cup" },
      { emoji: "🥣", label: "Bowl" },
      { emoji: "🧂", label: "Salt Shaker" },
      { emoji: "🍾", label: "Bottle" },
      { emoji: "🫙", label: "Jar" },
      { emoji: "🧁", label: "Cupcake" },
      { emoji: "🥄", label: "Spoon" },
    ],
  },
  {
    name: "Home Office",
    bg: "linear-gradient(180deg, #d4c5b0 0%, #d4c5b0 60%, #7a6048 60%)",
    floor: "#7a6048",
    wall: "#d4c5b0",
    items: [
      { emoji: "💻", label: "Laptop" },
      { emoji: "🖥️", label: "Monitor" },
      { emoji: "🖨️", label: "Printer" },
      { emoji: "📱", label: "Phone" },
      { emoji: "⌨️", label: "Keyboard" },
      { emoji: "🖱️", label: "Mouse" },
      { emoji: "📋", label: "Clipboard" },
      { emoji: "🗂️", label: "Files" },
      { emoji: "🕰️", label: "Clock" },
      { emoji: "💡", label: "Lamp" },
    ],
  },
  {
    name: "Bedroom",
    bg: "linear-gradient(180deg, #b8c4d8 0%, #b8c4d8 60%, #6d7a8a 60%)",
    floor: "#6d7a8a",
    wall: "#b8c4d8",
    items: [
      { emoji: "🪆", label: "Figurine" },
      { emoji: "🪔", label: "Diya" },
      { emoji: "🧸", label: "Teddy" },
      { emoji: "🌸", label: "Flowers" },
      { emoji: "🪟", label: "Window" },
      { emoji: "🛏️", label: "Bed" },
      { emoji: "🧴", label: "Lotion" },
      { emoji: "💐", label: "Bouquet" },
      { emoji: "🪑", label: "Chair" },
      { emoji: "🔮", label: "Crystal Ball" },
    ],
  },
  {
    name: "Garden Patio",
    bg: "linear-gradient(180deg, #87CEEB 0%, #87CEEB 55%, #5a8a3c 55%)",
    floor: "#5a8a3c",
    wall: "#87CEEB",
    items: [
      { emoji: "🪴", label: "Potted Plant" },
      { emoji: "🌻", label: "Sunflower" },
      { emoji: "🏺", label: "Garden Vase" },
      { emoji: "🪑", label: "Chair" },
      { emoji: "🍃", label: "Leaves" },
      { emoji: "🫖", label: "Kettle" },
      { emoji: "🕯️", label: "Lantern" },
      { emoji: "🍋", label: "Lemon" },
      { emoji: "🌿", label: "Herb" },
      { emoji: "🪻", label: "Lavender" },
    ],
  },
];

let currentSceneIndex = -1;

const EMOJIS = ["📱","💻","📚","☕","🖥","💰","🎵","💬","📝","🏠","💎","🎯","🎮","📷","🎨"];
const COLORS = ["#FF5252","#FFB74D","#FFD54F","#69F0AE","#40C4FF","#7C4DFF","#E040FB"];

const arena    = document.getElementById("arena")!;
const resetBtn = document.getElementById("reset-btn")!;
const sceneLabel = document.getElementById("scene-label")!;

function random(min: number, max: number): number { return Math.random() * (max - min) + min; }

function nextScene(): (typeof SCENES)[0] {
  currentSceneIndex = (currentSceneIndex + 1) % SCENES.length;
  return SCENES[currentSceneIndex]!;
}

function spawnObjects(): void {
  arena.querySelectorAll(".object, .debris").forEach(el => el.remove());

  const scene = nextScene();
  sceneLabel.textContent = scene.name;

  // Apply room background
  arena.style.background = scene.bg;

  const w = arena.clientWidth;
  const h = arena.clientHeight;
  const floorY = h * 0.6;

  // Draw floor line decoration
  const existing = document.getElementById("floor-line");
  if (existing) existing.remove();
  const floorLine = document.createElement("div");
  floorLine.id = "floor-line";
  floorLine.style.cssText = `position:absolute;left:0;top:${floorY}px;width:100%;height:3px;background:rgba(0,0,0,0.15);z-index:1;`;
  arena.appendChild(floorLine);

  const count = 8 + Math.floor(Math.random() * 4);
  const shuffled = [...scene.items].sort(() => Math.random() - 0.5).slice(0, count);

  shuffled.forEach((item, i) => {
    const obj = document.createElement("div");
    obj.className = "object";
    obj.title = item.label;

    const emoji = document.createElement("span");
    emoji.className = "obj-emoji";
    emoji.textContent = item.emoji;

    const lbl = document.createElement("span");
    lbl.className = "obj-label";
    lbl.textContent = item.label;

    obj.appendChild(emoji);
    obj.appendChild(lbl);

    // Place items: some on floor, some on wall (upper area)
    const onFloor = i % 3 !== 0;
    const x = random(30, w - 100);
    const y = onFloor ? random(floorY - 60, h - 110) : random(40, floorY - 80);
    obj.style.left = `${x}px`;
    obj.style.top = `${y}px`;

    obj.addEventListener("click", () => breakObject(obj));
    arena.appendChild(obj);
  });
}

const DEBRIS_COLORS = ["#FF5252", "#FFB74D", "#FFD54F", "#69F0AE", "#40C4FF", "#7C4DFF", "#E040FB", "#fff"];

function breakObject(obj: HTMLElement): void {
  if (obj.classList.contains("breaking")) return;
  obj.classList.add("breaking");

  const rect = obj.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 10; i++) {
    const debris = document.createElement("div");
    debris.className = "debris";
    const angle = (i / 10) * Math.PI * 2;
    const dist = 50 + Math.random() * 80;
    debris.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    debris.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    debris.style.left = `${cx - 6}px`;
    debris.style.top = `${cy - 6}px`;
    debris.style.background = DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)]!;
    arena.appendChild(debris);
    setTimeout(() => debris.remove(), 1000);
  }

  setTimeout(() => { if (obj.parentNode) obj.remove(); }, 500);
}

resetBtn.addEventListener("click", spawnObjects);
window.addEventListener("resize", spawnObjects);
spawnObjects();
