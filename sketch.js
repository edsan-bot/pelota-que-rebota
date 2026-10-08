/*
Pelota que rebota con física 2D real.

- Gravedad y velocidad: las pelotas caen y rebotan perdiendo energía.
- Al tocar los laterales (izquierda/derecha) la pelota se multiplica: nace
  otra pelota con otro color y otro ángulo, hasta un límite.
- Cada rebote suena como una nota suave, tipo piano (p5.sound).
- Cada pelota se detiene mientras el cursor está encima de ella.

El navegador bloquea el audio hasta que el usuario interactúa: haz clic
(o toca la pantalla) una vez para que empiecen a sonar los rebotes.
*/

/*
Compatibilidad con Firefox: no implementa AudioParam.cancelAndHoldAtTime,
y Tone.js (dentro de p5.sound) lo usa al programar cambios de volumen. Sin
este relleno Firefox lanza: "this._param.cancelAndHoldAtTime is not a
function" al llamar a osc.amp().
*/
if (
  typeof AudioParam !== "undefined" &&
  !AudioParam.prototype.cancelAndHoldAtTime
) {
  AudioParam.prototype.cancelAndHoldAtTime = function (cancelTime) {
    const t = cancelTime === undefined ? 0 : cancelTime;
    this.cancelScheduledValues(t);
    this.setValueAtTime(this.value, t);
    return this;
  };
}

const r = 25; // radio de cada pelota
const maxPelotas = 16; // límite para que no se llene toda la pantalla

// Parámetros de la física (2D realista).
const gravedad = 0.4; // aceleración hacia abajo
const restitucion = 0.97; // energía que conserva la pelota en cada rebote
const reboteMinimo = 12; // empuje mínimo en el suelo para que salte alto
const maxVel = 18; // velocidad máxima

let pelotas = []; // cada pelota: { x, y, vx, vy, tono }

// Sonido: oscilador + envolvente con forma de nota de piano.
let osc;
let env;
let audioListo = false; // el contexto de audio arranca con un gesto
let ultimoSonido = 0; // evita disparar notas demasiado seguidas
const notas = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0,
];

// Sistema de partículas: figuras que salen del mouse durante 20 s.
let particulas = [];
let emitiendoHasta = 0; // instante (ms) en que termina la emisión
const duracionEmision = 20000; // 20 segundos
const maxParticulas = 500; // límite para no saturar

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100);

  pelotas = [
    nuevaPelota(
      width / 2,
      height / 3,
      random(3, 6) * (random() < 0.5 ? -1 : 1),
      0,
      random(360),
    ),
  ];

  // Un único oscilador, reutilizado en todas las notas.
  osc = new p5.Oscillator("triangle");
  osc.amp(1); // volumen alto

  env = new p5.Envelope(0.01, 0.2, 0.3, 0.4);
  osc.disconnect(); // quitamos la salida directa al altavoz...
  osc.connect(env); // ...y hacemos pasar el oscilador por la envolvente
}

function nuevaPelota(x, y, vx, vy, tono) {
  return { x, y, vx, vy, tono: tono === undefined ? random(360) : tono };
}

function draw() {
  background(0, 0, 0); // negro

  // Emisión de partículas: durante los 20 s siguientes a cada clic.
  if (millis() < emitiendoHasta) {
    for (let i = 0; i < 3; i++) {
      if (particulas.length < maxParticulas) {
        particulas.push(nuevaParticula());
      }
    }
  }
  actualizarParticulas();
  dibujarParticulas();

  // Las pelotas nuevas se guardan aquí y se añaden al final, para no
  // recorrerlas en el mismo fotograma en que nacen.
  const nuevas = [];

  for (const p of pelotas) {
    // Si el cursor está encima, esa pelota se queda quieta.
    const sobreLaPelota = dist(mouseX, mouseY, p.x, p.y) < r;
    if (!sobreLaPelota) {
      actualizarFisica(p, nuevas);
    }
    dibujarPelota(p, sobreLaPelota);
  }

  for (const n of nuevas) {
    pelotas.push(n);
  }

  dibujarTiempo();
}

function actualizarFisica(p, nuevas) {
  // Física 2D: la gravedad acelera la caída y la velocidad mueve la pelota.
  p.vy += gravedad;
  p.x += p.vx;
  p.y += p.vy;

  rebotar(p, nuevas);
}

function rebotar(p, nuevas) {
  // Laterales: rebota, cambia de color y se multiplica.
  if (p.x < r) {
    p.x = r;
    p.vx = abs(p.vx) * restitucion;
    cambiarColor(p);
    tocarNota(p);
    multiplicar(p, nuevas);
  } else if (p.x > width - r) {
    p.x = width - r;
    p.vx = -abs(p.vx) * restitucion;
    cambiarColor(p);
    tocarNota(p);
    multiplicar(p, nuevas);
  }

  // Techo.
  if (p.y < r) {
    p.y = r;
    p.vy = abs(p.vy) * restitucion;
    tocarNota(p);
  } else if (p.y > height - r) {
    // Suelo: pierde energía, con un mínimo para que siga rebotando.
    p.y = height - r;
    p.vy = -abs(p.vy) * restitucion;
    if (abs(p.vy) < reboteMinimo) {
      p.vy = -reboteMinimo;
    }
    p.vx *= 0.99; // pequeña fricción con el suelo
    tocarNota(p);
  }
}

function multiplicar(p, nuevas) {
  // Solo si aún no se alcanzó el límite de pelotas.
  if (pelotas.length + nuevas.length >= maxPelotas) return;

  // La nueva pelota sale con otro ángulo y otro color para que se separen.
  const nueva = nuevaPelota(
    p.x,
    p.y,
    constrain(p.vx * random(0.6, 1.3), -maxVel, maxVel),
    p.vy + random(-3.5, 3.5),
    (p.tono + random(40, 140)) % 360,
  );
  nuevas.push(nueva);
}

function cambiarColor(p) {
  // Salta a otro color cada vez que toca un lateral.
  p.tono = (p.tono + random(40, 140)) % 360;
}

function dibujarPelota(p, sobreLaPelota) {
  noStroke();
  fill(p.tono, sobreLaPelota ? 35 : 85, 100);
  circle(p.x, p.y, r * 2);
}

// --- Sistema de partículas ---

function nuevaParticula() {
  const angulo = random(TWO_PI);
  const velocidad = random(1.5, 5.5);
  const vidaMax = random(60, 150); // ~1 a 2.5 s a 60 fps
  return {
    x: mouseX,
    y: mouseY,
    vx: cos(angulo) * velocidad,
    vy: sin(angulo) * velocidad,
    vida: vidaMax,
    vidaMax: vidaMax,
    tono: random(360),
    forma: floor(random(3)), // 0 círculo, 1 cuadrado, 2 triángulo
    tam: random(6, 16),
    rot: random(TWO_PI),
    velRot: random(-0.15, 0.15),
  };
}

function actualizarParticulas() {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.vy += 0.08; // gravedad leve para que caigan
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.velRot;
    p.vida--;
    if (p.vida <= 0) {
      particulas.splice(i, 1); // se desvanece y desaparece
    }
  }
}

function dibujarParticulas() {
  noStroke();
  for (const p of particulas) {
    const alfa = map(p.vida, 0, p.vidaMax, 0, 255); // se desvanecen
    fill(p.tono, 85, 100, alfa);
    push();
    translate(p.x, p.y);
    rotate(p.rot);
    if (p.forma === 0) {
      circle(0, 0, p.tam);
    } else if (p.forma === 1) {
      rect(-p.tam / 2, -p.tam / 2, p.tam, p.tam);
    } else {
      triangle(-p.tam / 2, p.tam / 2, p.tam / 2, p.tam / 2, 0, -p.tam / 2);
    }
    pop();
  }
}

function dibujarTiempo() {
  // Muestra cuánto queda de emisión (solo mientras está activa).
  if (millis() >= emitiendoHasta) return;
  const restante = ceil((emitiendoHasta - millis()) / 1000);
  noStroke();
  fill(0, 0, 100, 170);
  textAlign(RIGHT, TOP);
  textSize(14);
  text(restante + " s", width - 14, 12);
}

// --- Sonido (nota tipo piano, ahora más fuerte) ---

function tocarNota(p) {
  if (!audioListo) return;
  if (millis() - ultimoSonido < 70) return;
  ultimoSonido = millis();

  // La posición horizontal elige la nota, como un piano a lo ancho.
  const i = constrain(
    floor(map(p.x, r, width - r, 0, notas.length)),
    0,
    notas.length - 1,
  );
  osc.freq(notas[i]);
  env.play();
}

function iniciarAudio() {
  if (audioListo) return;
  userStartAudio();
  osc.start();
  audioListo = true;
}

function mousePressed() {
  iniciarAudio();
  emitiendoHasta = millis() + duracionEmision; // reinicia los 20 s de emisión
}

function touchStarted() {
  iniciarAudio();
  emitiendoHasta = millis() + duracionEmision;
  return false; // evita el scroll/zoom táctil por defecto
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
