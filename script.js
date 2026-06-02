const TAU = Math.PI * 2;

const canvases = {
  particle: document.getElementById("particleCanvas"),
  car: document.getElementById("carCanvas"),
  wheel: document.getElementById("wheelCanvas"),
  gear: document.getElementById("gearCanvas"),
};

const ctx = Object.fromEntries(Object.entries(canvases).map(([key, canvas]) => [key, canvas.getContext("2d")]));

const state = {
  activeTab: "particle",
  running: false,
  startedAt: 0,
  elapsedBeforePause: 0,
  zoom: 1,
  exerciseIndex: 0,
  particle: { radius: 2, omega0: Math.PI, alpha: 0, mass: 1, vectorScale: 1, time: 0, direction: 1, mode: "mcu", simSpeed: 1 },
  car: { speed: 20, radius: 50, mass: 1000, mu: 0.9, gravity: 9.81, tangential: 0, simSpeed: 1, phase: 0, lastTime: performance.now() },
  wheel: { radius: 0.5, omega0: 10, alpha: 0, time: 0, simSpeed: 1, mode: "fixed" },
  gear: { radiusA: 1, radiusB: 0.5, omegaA: 10, simSpeed: 1, direction: 1, mode: "belt", phaseA: 0, lastTime: performance.now() },
  compare: { radius: 0.5, theta: Math.PI, omega: 10, alpha: 2 },
};

const controlDefs = {
  particle: [
    ["radius", "Raio R", "m", 0.2, 8, 0.1],
    ["omega0", "Velocidade angular inicial ω0", "rad/s", -12.57, 12.57, 0.01],
    ["alpha", "Aceleração angular α", "rad/s²", -6, 6, 0.05],
    ["mass", "Massa m", "kg", 0.1, 200, 0.1],
    ["vectorScale", "Escala dos vetores", "x", 0.2, 3, 0.05],
    ["time", "Tempo t", "s", 0, 300, 0.01],
    ["simSpeed", "Velocidade da simulação", "x", 0.1, 4, 0.1],
  ],
  car: [
    ["speed", "Velocidade linear v", "m/s", 0, 70, 0.5],
    ["radius", "Raio da curva R", "m", 5, 200, 1],
    ["mass", "Massa do carro m", "kg", 100, 3000, 10],
    ["mu", "Coeficiente de atrito μ", "", 0.05, 1.5, 0.01],
    ["gravity", "Gravidade g", "m/s²", 1, 20, 0.01],
    ["tangential", "Aceleração tangencial", "m/s²", -8, 8, 0.1],
    ["simSpeed", "Velocidade da simulação", "x", 0.1, 4, 0.1],
  ],
  wheel: [
    ["radius", "Raio da roda R", "m", 0.1, 2, 0.01],
    ["omega0", "Velocidade angular ω", "rad/s", -20, 20, 0.1],
    ["alpha", "Aceleração angular α", "rad/s²", -5, 5, 0.05],
    ["time", "Tempo t", "s", 0, 120, 0.01],
    ["simSpeed", "Velocidade da simulação", "x", 0.1, 4, 0.1],
  ],
  gear: [
    ["radiusA", "Raio A", "m", 0.2, 2, 0.01],
    ["radiusB", "Raio B", "m", 0.2, 2, 0.01],
    ["omegaA", "Velocidade angular A", "rad/s", 0, 25, 0.1],
    ["simSpeed", "Velocidade da simulação", "x", 0.1, 4, 0.1],
  ],
  compare: [
    ["radius", "Raio R", "m", 0.1, 5, 0.01],
    ["theta", "Ângulo θ", "rad", 0, 30, 0.01],
    ["omega", "Velocidade angular ω", "rad/s", 0, 30, 0.1],
    ["alpha", "Aceleração angular α", "rad/s²", -10, 10, 0.1],
  ],
};

const exercises = [
  {
    question: "Uma roda dá uma volta completa em 1 segundo. Qual é a velocidade angular?",
    answer: "ω = 2π rad/s",
    steps: ["Uma volta completa vale 2π rad.", "Tempo: t = 1 s.", "ω = Δθ/t = 2π/1 = 2π rad/s.", "Interpretação: a roda completa um giro por segundo."],
  },
  {
    question: "Uma roda tem raio 0,5 m e ω = 10 rad/s. Qual é a velocidade tangencial?",
    answer: "v = 5 m/s",
    steps: ["Use v = ωR.", "Substitua: v = 10 · 0,5.", "v = 5 m/s.", "Interpretação: um ponto da borda caminha 5 m a cada segundo."],
  },
  {
    question: "Um corpo gira com ω = 10 rad/s em raio 0,5 m. Qual é a aceleração centrípeta?",
    answer: "ac = 50 m/s²",
    steps: ["Use ac = ω²R.", "Substitua: ac = 10² · 0,5.", "ac = 50 m/s².", "Interpretação: essa aceleração muda a direção da velocidade."],
  },
  {
    question: "Uma roda parte do repouso e atinge ω = 20 rad/s em 5 s. Qual é a aceleração angular?",
    answer: "α = 4 rad/s²",
    steps: ["Use α = Δω/Δt.", "Substitua: α = (20 - 0)/5.", "α = 4 rad/s².", "Interpretação: a velocidade angular aumenta 4 rad/s a cada segundo."],
  },
  {
    question: "Uma roda tem α = 2 rad/s² e R = 0,5 m. Qual é a aceleração tangencial?",
    answer: "at = 1 m/s²",
    steps: ["Use at = αR.", "Substitua: at = 2 · 0,5.", "at = 1 m/s².", "Interpretação: α muda o módulo da velocidade na borda."],
  },
];

function format(value, digits = 2) {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 100000 || (abs > 0 && abs < 0.001)) return value.toExponential(2).replace(".", ",");
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function createControls(group, mountId) {
  const mount = document.getElementById(mountId);
  mount.innerHTML = controlDefs[group].map(([key, label, unit, min, max, step]) => {
    const value = state[group][key];
    return `
      <label class="control">
        <span>${label} <strong id="${group}-${key}-value">${format(value)} ${unit}</strong></span>
        <input id="${group}-${key}" data-group="${group}" data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" />
        <input id="${group}-${key}-number" data-group="${group}" data-key="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${value}" />
      </label>
    `;
  }).join("");
}

function syncControl(group, key, value) {
  const def = controlDefs[group].find((item) => item[0] === key);
  const [, , unit, min, max] = def;
  const safe = clamp(Number(value), min, max);
  state[group][key] = safe;
  document.getElementById(`${group}-${key}`).value = safe;
  document.getElementById(`${group}-${key}-number`).value = safe;
  document.getElementById(`${group}-${key}-value`).textContent = `${format(safe)} ${unit}`;
  if (group === "particle" && key === "time") setSimulationTime(safe);
  drawAll();
}

function getElapsedSeconds(now = performance.now()) {
  if (!state.running) return state.elapsedBeforePause / 1000;
  return (state.elapsedBeforePause + (now - state.startedAt) * state.particle.simSpeed) / 1000;
}

function setSimulationTime(seconds) {
  state.elapsedBeforePause = seconds * 1000;
  if (state.running) state.startedAt = performance.now();
  state.particle.time = seconds;
}

function updateParticleRadios() {
  state.particle.mode = document.querySelector("input[name='particleMode']:checked").value;
  state.particle.direction = document.querySelector("input[name='particleDirection']:checked").value === "cw" ? -1 : 1;
  const alphaDisabled = state.particle.mode === "mcu";
  document.getElementById("particle-alpha").disabled = alphaDisabled;
  document.getElementById("particle-alpha-number").disabled = alphaDisabled;
  if (alphaDisabled) syncControl("particle", "alpha", 0);
  document.getElementById("particleExplanation").textContent = alphaDisabled
    ? "No MCU, α = 0, mas a aceleração centrípeta pode existir porque a direção da velocidade muda o tempo todo."
    : "No MCUV, α altera ω. Isso gera aceleração tangencial enquanto a centrípeta continua apontando para o centro.";
}

function calculateParticle(t) {
  const p = state.particle;
  const omega0 = p.omega0 * p.direction;
  const alpha = p.alpha * p.direction;
  const theta = omega0 * t + alpha * t * t / 2;
  const omega = omega0 + alpha * t;
  const speed = Math.abs(omega) * p.radius;
  const at = alpha * p.radius;
  const ac = omega * omega * p.radius;
  return {
    t, theta, visualTheta: normalizeAngle(theta), degrees: theta * 180 / Math.PI, laps: theta / TAU,
    omega, arc: p.radius * theta, speed, at, ac, total: Math.sqrt(at * at + ac * ac), fc: p.mass * ac,
  };
}

function drawBackground(context, width, height) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#0d0b15";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(248,241,220,0.07)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 28) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y <= height; y += 28) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
}

function pointOnCircle(angle, cx, cy, radius) {
  return { x: cx + Math.cos(angle) * radius, y: cy - Math.sin(angle) * radius };
}

function drawLabel(context, text, x, y, offsetX = 0, offsetY = 0, color = "#f8f1dc") {
  const labelX = x + offsetX;
  const labelY = y + offsetY;
  const lines = String(text).split("\n");
  context.save();
  context.font = "800 16px Segoe UI";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const width = Math.max(...lines.map((line) => context.measureText(line).width)) + 16;
  const lineHeight = 18;
  const height = Math.max(24, lines.length * lineHeight + 8);
  context.fillStyle = "rgba(13, 11, 21, 0.78)";
  context.strokeStyle = "rgba(248, 241, 220, 0.18)";
  context.lineWidth = 1;
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(labelX - width / 2, labelY - height / 2, width, height, 6);
  } else {
    context.moveTo(labelX - width / 2, labelY - height / 2);
    context.lineTo(labelX + width / 2, labelY - height / 2);
    context.lineTo(labelX + width / 2, labelY + height / 2);
    context.lineTo(labelX - width / 2, labelY + height / 2);
    context.closePath();
  }
  context.fill();
  context.stroke();
  context.fillStyle = color;
  lines.forEach((line, index) => {
    const yLine = labelY + (index - (lines.length - 1) / 2) * lineHeight;
    context.fillText(line, labelX, yLine);
  });
  context.restore();
}

function drawArrow(context, x, y, dx, dy, color, label = "") {
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  const head = 12;
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + dx, y + dy);
  context.stroke();
  context.beginPath();
  context.moveTo(x + dx, y + dy);
  context.lineTo(x + dx - ux * head - uy * head * 0.55, y + dy - uy * head + ux * head * 0.55);
  context.lineTo(x + dx - ux * head + uy * head * 0.55, y + dy - uy * head - ux * head * 0.55);
  context.closePath();
  context.fill();
  context.restore();
  if (label) drawLabel(context, label, x + dx, y + dy, ux * 14, uy * 14, color);
}

function drawVector(context, x, y, dx, dy, color, label, offsetX, offsetY) {
  drawArrow(context, x, y, dx, dy, color);
  if (Math.hypot(dx, dy) >= 2) drawLabel(context, label, x + dx, y + dy, offsetX, offsetY, color);
}

function getToggles() {
  return ["showRadius", "showArc", "showAngle", "showVelocity", "showCentripetal", "showTangential", "showTotal", "showRadians", "showDegrees"].reduce((acc, id) => {
    acc[id] = document.getElementById(id).checked;
    return acc;
  }, {});
}

function drawParticleScene() {
  const canvas = canvases.particle;
  const c = ctx.particle;
  const p = state.particle;
  const physics = calculateParticle(p.time);
  const opts = getToggles();
  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 15;
  const maxR = Math.min(canvas.width, canvas.height) / 2 - 100;
  const radiusPx = clamp(p.radius / 8, 0.18, 1) * maxR * state.zoom;
  const particle = pointOnCircle(physics.visualTheta, cx, cy, radiusPx);
  drawBackground(c, canvas.width, canvas.height);
  c.strokeStyle = "rgba(248,241,220,0.55)";
  c.lineWidth = 3;
  c.beginPath();
  c.arc(cx, cy, radiusPx, 0, TAU);
  c.stroke();
  c.fillStyle = "#ffd166";
  c.beginPath();
  c.arc(cx, cy, 5, 0, TAU);
  c.fill();

  const marks = [
    [0, "0 / 2π", "0° / 360°", 86, 0, 86],
    [Math.PI / 2, "π/2", "90°", 0, -22, 62],
    [Math.PI, "π", "180°", -36, 0, 64],
    [3 * Math.PI / 2, "3π/2", "270°", 0, 24, 62],
  ];
  marks.forEach(([angle, rad, deg, offsetX, offsetY, labelDistance]) => {
    const mark = pointOnCircle(normalizeAngle(angle), cx, cy, radiusPx);
    const baseLabel = pointOnCircle(normalizeAngle(angle), cx, cy, radiusPx + labelDistance);
    c.strokeStyle = "rgba(255,209,102,0.85)";
    c.fillStyle = "rgba(255,209,102,0.35)";
    c.beginPath(); c.arc(mark.x, mark.y, 3, 0, TAU); c.fill(); c.stroke();
    const text = [opts.showRadians ? rad : "", opts.showDegrees ? deg : ""].filter(Boolean).join("\n");
    if (text) drawLabel(c, text, baseLabel.x, baseLabel.y, offsetX, offsetY, "#f8f1dc");
  });

  if (opts.showArc) {
    c.strokeStyle = "#ffd166"; c.lineWidth = 7; c.lineCap = "round"; c.beginPath();
    c.arc(cx, cy, radiusPx + 14, 0, -physics.visualTheta, physics.theta >= 0);
    c.stroke();
    const nearInitialPoint = physics.visualTheta < 0.25 || physics.visualTheta > TAU - 0.25;
    const arcLabel = nearInitialPoint
      ? pointOnCircle(Math.PI / 4, cx, cy, radiusPx + 92)
      : pointOnCircle(physics.visualTheta / 2, cx, cy, radiusPx + 52);
    drawLabel(c, "s = Rθ", arcLabel.x, arcLabel.y, nearInitialPoint ? 24 : 0, nearInitialPoint ? -18 : 0, "#ffd166");
  }
  if (opts.showAngle) {
    c.strokeStyle = "#8ee66b"; c.lineWidth = 3; c.beginPath();
    c.arc(cx, cy, 54, 0, -physics.visualTheta, physics.theta >= 0);
    c.stroke();
    drawLabel(c, "θ", cx, cy, 70, -38, "#8ee66b");
  }
  if (opts.showRadius) {
    c.strokeStyle = "rgba(56,217,255,0.72)"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(particle.x, particle.y); c.stroke();
  }

  c.fillStyle = "#ff4fa3"; c.strokeStyle = "#f8f1dc"; c.lineWidth = 3; c.beginPath(); c.arc(particle.x, particle.y, 16, 0, TAU); c.fill(); c.stroke();
  drawLabel(c, "posição atual", particle.x, particle.y, 0, 38, "#ff4fa3");

  const scale = (14 * p.vectorScale) / Math.sqrt(state.zoom);
  const tangentSign = physics.omega >= 0 ? 1 : -1;
  const tangent = { x: -Math.sin(physics.visualTheta) * tangentSign, y: -Math.cos(physics.visualTheta) * tangentSign };
  const inward = { x: (cx - particle.x) / radiusPx, y: (cy - particle.y) / radiusPx };
  const atSign = Math.sign(physics.at || 0);
  const atZero = Math.abs(physics.at) < 1e-9;
  const vLen = clamp(physics.speed * scale, 0, 125);
  const acLen = clamp(physics.ac * scale * 0.32, 0, 135);
  const atLen = atZero ? 0 : clamp(Math.abs(physics.at) * scale, 0, 115);
  const acVec = { x: inward.x * acLen, y: inward.y * acLen };
  const atVec = { x: -Math.sin(physics.visualTheta) * atSign * atLen, y: -Math.cos(physics.visualTheta) * atSign * atLen };
  if (opts.showVelocity) drawVector(c, particle.x, particle.y, tangent.x * vLen, tangent.y * vLen, "#38d9ff", "v", tangent.x * 22, tangent.y * 22);
  if (opts.showCentripetal) drawVector(c, particle.x, particle.y, acVec.x, acVec.y, "#ff4fa3", "ac", inward.y * 24, -inward.x * 24);
  if (opts.showTangential && !atZero && atLen > 0.2) drawVector(c, particle.x, particle.y, atVec.x, atVec.y, "#8ee66b", "at", -tangent.y * 26, tangent.x * 26);
  if (opts.showTotal && !atZero) drawVector(c, particle.x, particle.y, acVec.x + atVec.x, acVec.y + atVec.y, "#ff9f43", "a", 28, 28);

  setResults("particleResults", [
    ["Movimento atual", atZero ? "MCU" : "MCUV"], ["Tempo t", `${format(physics.t)} s`], ["θ em radianos", `${format(physics.theta)} rad`], ["θ em graus", `${format(physics.degrees)}°`],
    ["Voltas completas", format(physics.laps, 3)], ["Arco s = Rθ", `${format(physics.arc)} m`], ["ω atual", `${format(physics.omega)} rad/s`],
    ["v = ωR", `${format(physics.speed)} m/s`], ["at = αR", `${format(physics.at)} m/s²`], ["ac = ω²R", `${format(physics.ac)} m/s²`],
    ["a total", `${format(physics.total)} m/s²`], ["Fc = m ac", `${format(physics.fc)} N`],
  ]);
  updateParticleAlert(physics, opts);
}

function updateParticleAlert(physics, opts = getToggles()) {
  const box = document.getElementById("particleAlert");
  const alphaZero = Math.abs(state.particle.alpha) < 1e-9;
  const omegaZero = Math.abs(state.particle.omega0) < 1e-9;
  const atZero = Math.abs(physics.at) < 1e-9;
  if (alphaZero && opts.showTotal && atZero && Math.abs(physics.ac) > 1e-9) box.textContent = "Como α = 0, não há aceleração tangencial. No MCU, a aceleração total coincide com a centrípeta.";
  else if (alphaZero) box.textContent = "Como α = 0, não há aceleração tangencial.";
  else if (omegaZero && Math.abs(state.particle.alpha) > 1e-9 && physics.t < 0.1) box.textContent = "No instante inicial, a centrípeta é zero, mas a aceleração tangencial já existe.";
  else box.textContent = "α gera at; ω gera ac. Elas não são a mesma aceleração.";
}

function setResults(id, rows) {
  document.getElementById(id).innerHTML = rows.map(([label, value]) => `<div class="result-item"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function drawCarScene(now = performance.now()) {
  const canvas = canvases.car, c = ctx.car, car = state.car;
  const rawDt = Math.min((now - car.lastTime) / 1000, 0.05);
  const dt = state.running && state.activeTab === "car" ? rawDt * car.simSpeed : 0;
  car.lastTime = now;
  const drive = document.querySelector("input[name='carDrive']:checked").value;
  const at = drive === "constant" ? 0 : drive === "accelerate" ? Math.abs(car.tangential) : -Math.abs(car.tangential);
  car.speed = clamp(car.speed + at * dt, 0, 70);
  syncReadoutOnly("car", "speed");
  const ac = car.speed ** 2 / car.radius;
  const fc = car.mass * ac;
  const frictionMax = car.mu * car.mass * car.gravity;
  const ratio = frictionMax === 0 ? Infinity : fc / frictionMax;
  car.phase = normalizeAngle(car.phase + (car.speed / car.radius) * dt);
  drawBackground(c, canvas.width, canvas.height);
  const center = { x: canvas.width / 2, y: canvas.height / 2 + 20 };
  const radiusPx = clamp(car.radius / 200, 0.24, 1) * 210;
  const pos = pointOnCircle(car.phase, center.x, center.y, radiusPx);
  c.strokeStyle = ratio > 1 ? "#ff5b5b" : ratio > 0.82 ? "#ffd166" : "rgba(142,230,107,0.7)";
  c.lineWidth = 32; c.beginPath(); c.arc(center.x, center.y, radiusPx, 0, TAU); c.stroke();
  c.strokeStyle = "rgba(248,241,220,0.65)"; c.lineWidth = 3; c.setLineDash([16, 16]); c.beginPath(); c.arc(center.x, center.y, radiusPx, 0, TAU); c.stroke(); c.setLineDash([]);
  c.save(); c.translate(pos.x, pos.y); c.rotate(-car.phase); c.fillStyle = "#38d9ff"; c.strokeStyle = "#f8f1dc"; c.lineWidth = 3; c.fillRect(-28, -14, 56, 28); c.strokeRect(-28, -14, 56, 28); c.restore();
  const tangent = { x: -Math.sin(car.phase), y: -Math.cos(car.phase) };
  const inward = { x: (center.x - pos.x) / radiusPx, y: (center.y - pos.y) / radiusPx };
  drawArrow(c, pos.x, pos.y, tangent.x * clamp(car.speed * 4, 0, 170), tangent.y * clamp(car.speed * 4, 0, 170), "#38d9ff", "v");
  drawArrow(c, pos.x, pos.y, inward.x * clamp(ac * 8, 0, 170), inward.y * clamp(ac * 8, 0, 170), "#ff4fa3", "ac");
  if (Math.abs(at) > 0.05) drawArrow(c, pos.x, pos.y, tangent.x * Math.sign(at) * 90, tangent.y * Math.sign(at) * 90, "#8ee66b", "at");
  setResults("carResults", [["ac = v²/R", `${format(ac)} m/s²`], ["Fc", `${format(fc)} N`], ["Atrito máximo", `${format(frictionMax)} N`], ["Uso do atrito", `${format(ratio * 100, 1)}%`], ["Se dobrar v", `ac vira ${format(4 * ac)} m/s²`]]);
  const box = document.getElementById("carAlert");
  box.className = `alert-box ${ratio > 1 ? "danger" : ratio > 0.82 ? "warn" : "safe"}`;
  box.textContent = ratio > 1 ? "Risco de derrapagem: a força centrípeta exigida passou do atrito máximo." : ratio > 0.82 ? "Próximo do limite: há pouca margem de atrito." : "Curva possível: o atrito disponível cobre a força centrípeta.";
}

function syncReadoutOnly(group, key) {
  const def = controlDefs[group].find((item) => item[0] === key);
  const unit = def[2];
  document.getElementById(`${group}-${key}`).value = state[group][key];
  document.getElementById(`${group}-${key}-number`).value = state[group][key].toFixed(2);
  document.getElementById(`${group}-${key}-value`).textContent = `${format(state[group][key])} ${unit}`;
}

function drawWheelScene() {
  const canvas = canvases.wheel, c = ctx.wheel, w = state.wheel;
  const theta = w.omega0 * w.time + w.alpha * w.time * w.time / 2;
  const omega = w.omega0 + w.alpha * w.time;
  const v = omega * w.radius;
  drawBackground(c, canvas.width, canvas.height);
  const ground = canvas.height - 95;
  const radiusPx = clamp(w.radius / 2, 0.18, 1) * 150;
  const xCenter = w.mode === "rolling" ? 170 + ((w.radius * theta) * 35 % (canvas.width - 340)) : canvas.width / 2;
  const yCenter = ground - radiusPx;
  c.strokeStyle = "rgba(248,241,220,0.4)"; c.lineWidth = 4; c.beginPath(); c.moveTo(80, ground); c.lineTo(canvas.width - 80, ground); c.stroke();
  c.strokeStyle = "#ffd166"; c.lineWidth = 5; c.beginPath(); c.arc(xCenter, yCenter, radiusPx, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) {
    const a = theta + i * TAU / 8;
    const p = pointOnCircle(a, xCenter, yCenter, radiusPx);
    c.strokeStyle = "rgba(248,241,220,0.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(xCenter, yCenter); c.lineTo(p.x, p.y); c.stroke();
  }
  const dot = pointOnCircle(theta, xCenter, yCenter, radiusPx);
  c.fillStyle = "#ff4fa3"; c.beginPath(); c.arc(dot.x, dot.y, 9, 0, TAU); c.fill();
  const tangent = { x: -Math.sin(theta) * Math.sign(omega || 1), y: -Math.cos(theta) * Math.sign(omega || 1) };
  drawArrow(c, dot.x, dot.y, tangent.x * clamp(Math.abs(v) * 22, 0, 150), tangent.y * clamp(Math.abs(v) * 22, 0, 150), "#38d9ff", "v borda");
  if (w.mode === "rolling") drawArrow(c, xCenter, yCenter, Math.sign(v || 1) * clamp(Math.abs(v) * 22, 0, 160), 0, "#ff9f43", "v centro");
  c.fillStyle = "#f8f1dc"; c.font = "700 16px Segoe UI"; c.fillText(`s = Rθ = ${format(w.radius * theta)} m`, canvas.width / 2, 45);
  setResults("wheelResults", [["θ", `${format(theta)} rad`], ["ω atual", `${format(omega)} rad/s`], ["v = ωR", `${format(Math.abs(v))} m/s`], ["s linear", `${format(w.radius * theta)} m`], ["Modo", w.mode === "rolling" ? "Rolamento sem escorregamento" : "Roda fixa"]]);
}

function drawGearScene(now = performance.now()) {
  const canvas = canvases.gear, c = ctx.gear, g = state.gear;
  const rawDt = Math.min((now - g.lastTime) / 1000, 0.05);
  const dt = state.running && state.activeTab === "gears" ? rawDt * g.simSpeed : 0;
  g.lastTime = now;
  g.mode = document.querySelector("input[name='gearMode']:checked").value;
  g.direction = document.querySelector("input[name='gearDirection']:checked").value === "cw" ? -1 : 1;
  const vA = g.omegaA * g.radiusA;
  const omegaBMag = vA / g.radiusB;
  const directionB = g.mode === "gear" ? -g.direction : g.direction;
  g.phaseA = normalizeAngle(g.phaseA + g.omegaA * g.direction * dt);
  const phaseB = normalizeAngle(-g.phaseA * g.radiusA / g.radiusB * (g.mode === "gear" ? 1 : -1));
  drawBackground(c, canvas.width, canvas.height);
  const rA = g.radiusA * 95;
  const rB = g.radiusB * 95;
  const cxA = canvas.width / 2 - rA - 28;
  const cxB = g.mode === "gear" ? cxA + rA + rB : canvas.width / 2 + rB + 28;
  const cy = canvas.height / 2 + 25;
  if (g.mode === "belt") {
    c.strokeStyle = "rgba(248,241,220,0.45)"; c.lineWidth = 10;
    c.beginPath(); c.moveTo(cxA, cy - rA); c.lineTo(cxB, cy - rB); c.moveTo(cxA, cy + rA); c.lineTo(cxB, cy + rB); c.stroke();
  }
  drawWheelForGear(c, cxA, cy, rA, g.phaseA, "#38d9ff", "A");
  drawWheelForGear(c, cxB, cy, rB, phaseB, "#ff4fa3", "B");
  drawArrow(c, cxA, cy - rA - 12, g.direction * 80, 0, "#38d9ff", "ωA");
  drawArrow(c, cxB, cy - rB - 12, directionB * 80, 0, "#ff4fa3", "ωB");
  setResults("gearResults", [["vA", `${format(vA)} m/s`], ["vB", `${format(vA)} m/s`], ["ωA", `${format(g.omegaA)} rad/s`], ["ωB", `${format(omegaBMag)} rad/s`], ["RA/RB", format(g.radiusA / g.radiusB, 2)], ["Sentido B", directionB === g.direction ? "Mesmo" : "Oposto"]]);
  document.getElementById("gearAlert").textContent = g.radiusB < g.radiusA ? "A roda menor gira mais rápido para manter a mesma velocidade tangencial na borda." : "A roda maior gira mais devagar para manter a mesma velocidade tangencial na borda.";
}

function drawWheelForGear(c, x, y, r, phase, color, label) {
  c.strokeStyle = color; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  for (let i = 0; i < 10; i++) {
    const a = phase + i * TAU / 10;
    const p1 = pointOnCircle(a, x, y, r * 0.78);
    const p2 = pointOnCircle(a, x, y, r);
    c.strokeStyle = "rgba(248,241,220,0.45)"; c.lineWidth = 2; c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
  }
  c.fillStyle = "#f8f1dc"; c.font = "800 22px Segoe UI"; c.textAlign = "center"; c.fillText(label, x, y + 7);
}

function updateCompare() {
  const p = state.compare;
  setResults("compareResults", [["s = Rθ", `${format(p.radius * p.theta)} m`], ["v = ωR", `${format(p.omega * p.radius)} m/s`], ["at = αR", `${format(p.alpha * p.radius)} m/s²`], ["ac = ω²R", `${format(p.omega * p.omega * p.radius)} m/s²`]]);
}

function updateExercise(mode = "question") {
  const ex = exercises[state.exerciseIndex];
  document.getElementById("exerciseQuestion").textContent = ex.question;
  const box = document.getElementById("exerciseSolution");
  if (mode === "answer") box.innerHTML = `<strong>${ex.answer}</strong>`;
  else if (mode === "steps") box.innerHTML = ex.steps.map((step) => `<p>${step}</p>`).join("");
  else box.innerHTML = "Escolha uma ação para revelar a resposta ou o passo a passo.";
}

function drawAll(now = performance.now()) {
  if (state.activeTab === "particle") drawParticleScene();
  if (state.activeTab === "car") drawCarScene(now);
  if (state.activeTab === "wheel") drawWheelScene();
  if (state.activeTab === "gears") drawGearScene(now);
  if (state.activeTab === "compare") updateCompare();
}

function tick(now = performance.now()) {
  if (state.running && state.activeTab === "particle") {
    state.particle.time = getElapsedSeconds(now);
    syncReadoutOnly("particle", "time");
  }
  if (state.running && state.activeTab === "wheel") {
    state.wheel.time += (1 / 60) * state.wheel.simSpeed;
    state.wheel.time = clamp(state.wheel.time, 0, 120);
    syncReadoutOnly("wheel", "time");
  }
  drawAll(now);
  requestAnimationFrame(tick);
}

function startSimulation() {
  if (state.running) return;
  state.running = true;
  state.startedAt = performance.now();
  document.getElementById("statusChip").textContent = "Rodando";
}

function pauseSimulation() {
  if (!state.running) return;
  state.elapsedBeforePause = state.particle.time * 1000;
  state.running = false;
  document.getElementById("statusChip").textContent = "Pausado";
}

function resetSimulation() {
  state.running = false;
  state.startedAt = 0;
  state.elapsedBeforePause = 0;
  state.particle.time = 0;
  state.wheel.time = 0;
  state.car.phase = 0;
  state.gear.phaseA = 0;
  syncReadoutOnly("particle", "time");
  syncReadoutOnly("wheel", "time");
  document.getElementById("statusChip").textContent = "Pausado";
  drawAll();
}

function setupEvents() {
  document.querySelectorAll("input[type='range'][data-group], input[type='number'][data-group]").forEach((input) => {
    input.addEventListener("input", () => syncControl(input.dataset.group, input.dataset.key, input.value));
  });
  document.querySelectorAll("input[name='particleMode'], input[name='particleDirection']").forEach((input) => input.addEventListener("change", () => { updateParticleRadios(); drawAll(); }));
  document.querySelectorAll("input[name='wheelMode']").forEach((input) => input.addEventListener("change", () => { state.wheel.mode = input.value; drawAll(); }));
  document.querySelectorAll("input[name='gearMode'], input[name='gearDirection'], input[name='carDrive']").forEach((input) => input.addEventListener("change", drawAll));
  document.querySelectorAll("#visualToggles input").forEach((input) => input.addEventListener("change", drawAll));
  document.querySelectorAll("[data-action='start']").forEach((button) => button.addEventListener("click", startSimulation));
  document.querySelectorAll("[data-action='pause']").forEach((button) => button.addEventListener("click", pauseSimulation));
  document.querySelectorAll("[data-action='reset']").forEach((button) => button.addEventListener("click", resetSimulation));
  document.getElementById("zoomOutBtn").addEventListener("click", () => { state.zoom = clamp(state.zoom - 0.1, 0.5, 2.4); updateZoom(); drawAll(); });
  document.getElementById("zoomInBtn").addEventListener("click", () => { state.zoom = clamp(state.zoom + 0.1, 0.5, 2.4); updateZoom(); drawAll(); });
  document.getElementById("zoomResetBtn").addEventListener("click", () => { state.zoom = 1; updateZoom(); drawAll(); });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${button.dataset.tab}`));
      drawAll();
    });
  });
  document.getElementById("showAnswerBtn").addEventListener("click", () => updateExercise("answer"));
  document.getElementById("showStepsBtn").addEventListener("click", () => updateExercise("steps"));
  document.getElementById("newExerciseBtn").addEventListener("click", () => { state.exerciseIndex = (state.exerciseIndex + 1) % exercises.length; updateExercise("question"); });
}

function updateZoom() {
  document.getElementById("zoomValue").textContent = `${format(state.zoom)}x`;
}

function init() {
  createControls("particle", "particleControls");
  createControls("car", "carControls");
  createControls("wheel", "wheelControls");
  createControls("gear", "gearControls");
  createControls("compare", "compareControls");
  setupEvents();
  updateParticleRadios();
  updateZoom();
  updateExercise();
  drawAll();
  requestAnimationFrame(tick);
}

init();
