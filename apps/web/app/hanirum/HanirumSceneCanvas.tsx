"use client";

import { useEffect, useRef } from "react";
import type { PublicAttendee } from "../../lib/hanirum/types";
import styles from "./hanirum.module.css";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

type Gesture = "walk" | "wave" | "handshake" | "bow" | "cheer";

interface Character {
  id: string;
  name: string;
  dinner: boolean;
  checkedIn: boolean;
  floor: 1 | 2;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  hue: number;
  gesture: Gesture;
  gestureUntil: number;
  lastInteractionAt: number;
  nextTargetAt: number;
  nextFloorShiftAt: number;
  pulseUntil: number;
}

interface SceneSnapshot {
  width: number;
  height: number;
  dpr: number;
  time: number;
  characters: Map<string, Character>;
  latestGuestName: string;
}

interface Zone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function ratioFromHash(value: string) {
  return hashString(value) / 4294967295;
}

function getWalkZone(floor: 1 | 2, width: number, height: number): Zone {
  if (floor === 2) {
    return {
      left: width * 0.18,
      right: width * 0.76,
      top: height * 0.15,
      bottom: height * 0.34
    };
  }

  return {
    left: width * 0.14,
    right: width * 0.82,
    top: height * 0.58,
    bottom: height * 0.8
  };
}

function getRandomPoint(zone: Zone, seedKey: string) {
  return {
    x: zone.left + (zone.right - zone.left) * ratioFromHash(`${seedKey}-x`),
    y: zone.top + (zone.bottom - zone.top) * ratioFromHash(`${seedKey}-y`)
  };
}

function clampCharacter(character: Character, width: number, height: number) {
  const zone = getWalkZone(character.floor, width, height);
  character.x = Math.min(zone.right, Math.max(zone.left, character.x));
  character.y = Math.min(zone.bottom, Math.max(zone.top, character.y));
}

function createCharacter(attendee: PublicAttendee, width: number, height: number, isLatest: boolean): Character {
  const seed = hashString(attendee.id);
  const floor = (attendee.dinner || seed % 2 === 0 ? 1 : 2) as 1 | 2;
  const zone = getWalkZone(floor, width, height);
  const origin = getRandomPoint(zone, `${attendee.id}-origin`);
  const target = getRandomPoint(zone, `${attendee.id}-target`);

  return {
    id: attendee.id,
    name: attendee.name,
    dinner: attendee.dinner,
    checkedIn: attendee.checkedIn,
    floor,
    x: origin.x,
    y: origin.y,
    targetX: target.x,
    targetY: target.y,
    speed: 22 + (seed % 15),
    hue: 18 + (seed % 180),
    gesture: "walk",
    gestureUntil: 0,
    lastInteractionAt: 0,
    nextTargetAt: 1800 + (seed % 1500),
    nextFloorShiftAt: 7000 + (seed % 7000),
    pulseUntil: isLatest ? 3200 : 0
  };
}

function syncCharacters(snapshot: SceneSnapshot, attendees: PublicAttendee[], latestGuestName: string) {
  const nextIds = new Set(attendees.map((attendee) => attendee.id));

  snapshot.characters.forEach((character, id) => {
    if (!nextIds.has(id)) {
      snapshot.characters.delete(id);
    }
  });

  attendees.forEach((attendee) => {
    const existing = snapshot.characters.get(attendee.id);

    if (!existing) {
      snapshot.characters.set(
        attendee.id,
        createCharacter(attendee, snapshot.width || 1600, snapshot.height || 900, attendee.name === latestGuestName)
      );
      return;
    }

    existing.dinner = attendee.dinner;
    existing.checkedIn = attendee.checkedIn;

    if (attendee.name === latestGuestName) {
      existing.pulseUntil = Math.max(existing.pulseUntil, snapshot.time + 3200);
    }
  });

  snapshot.latestGuestName = latestGuestName;
}

function chooseNextTarget(character: Character, snapshot: SceneSnapshot) {
  const seed = hashString(`${character.id}-${Math.floor(snapshot.time / 700)}`);

  if (snapshot.time >= character.nextFloorShiftAt && seed % 5 === 0) {
    character.floor = character.floor === 1 ? 2 : 1;
    character.nextFloorShiftAt = snapshot.time + 8000 + (seed % 6000);
  }

  const zone = getWalkZone(character.floor, snapshot.width, snapshot.height);
  const target = getRandomPoint(zone, `${character.id}-${Math.floor(snapshot.time / 700)}-target`);
  character.targetX = target.x;
  character.targetY = target.y;
  character.nextTargetAt = snapshot.time + 1400 + (seed % 2200);
}

function stepCharacter(character: Character, snapshot: SceneSnapshot, deltaMs: number) {
  if (snapshot.time < character.gestureUntil) {
    clampCharacter(character, snapshot.width, snapshot.height);
    return;
  }

  if (character.gesture !== "walk") {
    character.gesture = "walk";
  }

  const dx = character.targetX - character.x;
  const dy = character.targetY - character.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 8 || snapshot.time >= character.nextTargetAt) {
    chooseNextTarget(character, snapshot);
  }

  const moveDistance = (character.speed * deltaMs) / 1000;

  if (distance > 0.001) {
    character.x += (dx / distance) * Math.min(moveDistance, distance);
    character.y += (dy / distance) * Math.min(moveDistance, distance);
  }

  clampCharacter(character, snapshot.width, snapshot.height);
}

function updateInteractions(snapshot: SceneSnapshot) {
  const characters = [...snapshot.characters.values()];
  const gestures: Gesture[] = ["handshake", "wave", "bow", "cheer"];

  for (let i = 0; i < characters.length; i += 1) {
    for (let j = i + 1; j < characters.length; j += 1) {
      const first = characters[i];
      const second = characters[j];

      if (first.floor !== second.floor) {
        continue;
      }

      if (snapshot.time < first.gestureUntil || snapshot.time < second.gestureUntil) {
        continue;
      }

      if (snapshot.time - first.lastInteractionAt < 4200 || snapshot.time - second.lastInteractionAt < 4200) {
        continue;
      }

      const dx = first.x - second.x;
      const dy = first.y - second.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 62) {
        continue;
      }

      const gesture = gestures[hashString(`${first.id}-${second.id}-${Math.floor(snapshot.time / 1000)}`) % gestures.length];
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;

      first.gesture = gesture;
      second.gesture = gesture;
      first.gestureUntil = snapshot.time + 1800;
      second.gestureUntil = snapshot.time + 1800;
      first.lastInteractionAt = snapshot.time;
      second.lastInteractionAt = snapshot.time;
      first.targetX = centerX - 16;
      second.targetX = centerX + 16;
      first.targetY = centerY;
      second.targetY = centerY;
      return;
    }
  }
}

function drawDeck(
  context: CanvasRenderingContext2D,
  zone: Zone,
  skew: number,
  fillTop: string,
  fillFace: string,
  stroke: string,
  label: string
) {
  const depth = 34;
  const { left, right, top, bottom } = zone;

  context.beginPath();
  context.moveTo(left + skew, top);
  context.lineTo(right + skew, top);
  context.lineTo(right - skew, bottom);
  context.lineTo(left - skew, bottom);
  context.closePath();
  context.fillStyle = fillTop;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.stroke();

  context.beginPath();
  context.moveTo(right + skew, top);
  context.lineTo(right - skew, bottom);
  context.lineTo(right - skew, bottom + depth);
  context.lineTo(right + skew, top + depth);
  context.closePath();
  context.fillStyle = fillFace;
  context.fill();

  context.beginPath();
  context.moveTo(left - skew, bottom);
  context.lineTo(right - skew, bottom);
  context.lineTo(right - skew, bottom + depth);
  context.lineTo(left - skew, bottom + depth);
  context.closePath();
  context.fillStyle = fillFace;
  context.fill();

  context.fillStyle = "rgba(255, 247, 233, 0.92)";
  context.font = "700 18px Pretendard";
  context.fillText(label, left + 14, top + 28);
}

function drawBackground(context: CanvasRenderingContext2D, snapshot: SceneSnapshot) {
  const { width, height } = snapshot;
  const upper = getWalkZone(2, width, height);
  const lower = getWalkZone(1, width, height);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#0d2233");
  background.addColorStop(0.55, "#15384f");
  background.addColorStop(1, "#0a1a28");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 212, 140, 0.08)";
  context.beginPath();
  context.arc(width * 0.16, height * 0.12, width * 0.16, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(width * 0.82, height * 0.82, width * 0.18, 0, Math.PI * 2);
  context.fill();

  drawDeck(context, upper, 56, "#ead7b8", "#c29a69", "rgba(62, 41, 24, 0.24)", "2F SKY LOUNGE");
  drawDeck(context, lower, 72, "#f4dfbc", "#c88547", "rgba(62, 41, 24, 0.22)", "1F CHECK-IN HALL");

  const stairTop = upper.bottom + 22;
  const stairBottom = lower.top - 16;
  context.fillStyle = "rgba(240, 226, 199, 0.88)";
  context.beginPath();
  context.moveTo(width * 0.44, stairTop);
  context.lineTo(width * 0.58, stairTop);
  context.lineTo(width * 0.54, stairBottom);
  context.lineTo(width * 0.4, stairBottom);
  context.closePath();
  context.fill();

  for (let step = 0; step < 7; step += 1) {
    const y = stairTop + ((stairBottom - stairTop) / 7) * step;
    context.strokeStyle = "rgba(117, 81, 52, 0.28)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(width * 0.43, y);
    context.lineTo(width * 0.56, y);
    context.stroke();
  }

  context.fillStyle = "rgba(17, 65, 74, 0.28)";
  for (let index = 0; index < 5; index += 1) {
    const x = width * 0.14 + index * width * 0.14;
    context.fillRect(x, lower.top + 26, 56, 32);
    context.fillStyle = "rgba(239, 217, 178, 0.24)";
    context.beginPath();
    context.arc(x + 28, lower.top + 98, 30, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(17, 65, 74, 0.28)";
  }

  context.fillStyle = "rgba(28, 102, 87, 0.36)";
  for (let index = 0; index < 4; index += 1) {
    const x = upper.left + 40 + index * 150;
    context.beginPath();
    context.arc(x, upper.bottom - 46, 18, 0, Math.PI * 2);
    context.fill();
  }
}

function drawGesture(
  context: CanvasRenderingContext2D,
  character: Character,
  snapshot: SceneSnapshot,
  radius: number
) {
  if (snapshot.time >= character.gestureUntil || character.gesture === "walk") {
    return;
  }

  context.save();
  context.translate(character.x, character.y - radius - 22);
  context.strokeStyle = "rgba(255, 247, 233, 0.92)";
  context.lineWidth = 3;

  if (character.gesture === "handshake") {
    context.beginPath();
    context.moveTo(-10, 0);
    context.lineTo(0, -6);
    context.lineTo(10, 0);
    context.stroke();
  }

  if (character.gesture === "wave") {
    context.beginPath();
    context.arc(0, 0, 10, Math.PI * 0.2, Math.PI * 1.1);
    context.stroke();
  }

  if (character.gesture === "bow") {
    context.beginPath();
    context.moveTo(-10, -4);
    context.quadraticCurveTo(0, 8, 10, -4);
    context.stroke();
  }

  if (character.gesture === "cheer") {
    context.beginPath();
    context.moveTo(0, -10);
    context.lineTo(0, 10);
    context.moveTo(-10, 0);
    context.lineTo(10, 0);
    context.stroke();
  }

  context.restore();
}

function drawCharacter(context: CanvasRenderingContext2D, character: Character, snapshot: SceneSnapshot) {
  const radius = character.floor === 2 ? 19 : 21;
  const pulseAlpha = character.pulseUntil > snapshot.time ? 0.32 + ((character.pulseUntil - snapshot.time) / 3200) * 0.28 : 0;

  if (pulseAlpha > 0) {
    context.fillStyle = `rgba(255, 213, 122, ${pulseAlpha})`;
    context.beginPath();
    context.arc(character.x, character.y, radius + 18, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = "rgba(6, 14, 22, 0.34)";
  context.beginPath();
  context.ellipse(character.x, character.y + radius + 8, radius * 0.9, 10, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = `hsl(${character.hue} 66% 60%)`;
  context.beginPath();
  context.arc(character.x, character.y, radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(255, 247, 233, 0.95)";
  context.beginPath();
  context.arc(character.x, character.y - 4, radius * 0.52, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(16, 31, 45, 0.78)";
  context.fillRect(character.x - radius * 0.52, character.y + 5, radius * 1.04, radius * 0.72);

  context.font = "700 14px Pretendard";
  const labelWidth = Math.max(84, context.measureText(character.name).width + 28);
  const labelX = Math.min(snapshot.width - labelWidth - 18, Math.max(18, character.x - labelWidth / 2));
  context.fillStyle = "rgba(255, 247, 233, 0.94)";
  context.beginPath();
  context.roundRect(labelX, character.y - radius - 34, labelWidth, 28, 14);
  context.fill();
  context.fillStyle = "#143146";
  context.fillText(character.name, labelX + 14, character.y - radius - 15);

  if (character.dinner) {
    context.fillStyle = "#d2a24f";
    context.beginPath();
    context.roundRect(Math.min(snapshot.width - 42, labelX + labelWidth - 18), character.y - radius - 30, 24, 20, 10);
    context.fill();
    context.fillStyle = "#fff6e7";
    context.font = "700 12px Pretendard";
    context.fillText("DIN", Math.min(snapshot.width - 37, labelX + labelWidth - 13), character.y - radius - 16);
  }

  drawGesture(context, character, snapshot, radius);
}

function renderScene(canvas: HTMLCanvasElement, snapshot: SceneSnapshot) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  context.setTransform(snapshot.dpr, 0, 0, snapshot.dpr, 0, 0);
  context.clearRect(0, 0, snapshot.width, snapshot.height);
  drawBackground(context, snapshot);

  const characters = [...snapshot.characters.values()].sort((first, second) => first.y - second.y);
  characters.forEach((character) => {
    drawCharacter(context, character, snapshot);
  });
}

function buildTextSnapshot(snapshot: SceneSnapshot) {
  const characters = [...snapshot.characters.values()].map((character) => ({
    id: character.id,
    name: character.name,
    floor: character.floor,
    x: Number(character.x.toFixed(1)),
    y: Number(character.y.toFixed(1)),
    dinner: character.dinner,
    gesture: snapshot.time < character.gestureUntil ? character.gesture : "walk"
  }));

  return JSON.stringify({
    coordinateSystem: "origin: top-left, x+: right, y+: down",
    latestGuestName: snapshot.latestGuestName,
    floors: {
      upper: getWalkZone(2, snapshot.width, snapshot.height),
      lower: getWalkZone(1, snapshot.width, snapshot.height)
    },
    characters
  });
}

function createInitialSnapshot(): SceneSnapshot {
  return {
    width: 1280,
    height: 720,
    dpr: 1,
    time: 0,
    characters: new Map<string, Character>(),
    latestGuestName: ""
  };
}

export function HanirumSceneCanvas({
  attendees,
  latestGuestName
}: {
  attendees: PublicAttendee[];
  latestGuestName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<SceneSnapshot>(createInitialSnapshot());

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(640, Math.round(rect.width || canvas.parentElement?.clientWidth || 640));
      const height = Math.max(420, Math.round(rect.height || width * (9 / 16)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      snapshotRef.current.width = width;
      snapshotRef.current.height = height;
      snapshotRef.current.dpr = dpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      renderScene(canvas, snapshotRef.current);
    };

    resizeCanvas();
    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(canvas);

    let previousTime = performance.now();
    let animationFrame = 0;

    const frame = (now: number) => {
      const deltaMs = Math.min(40, now - previousTime);
      previousTime = now;
      snapshotRef.current.time += deltaMs;
      snapshotRef.current.characters.forEach((character) => {
        stepCharacter(character, snapshotRef.current, deltaMs);
      });
      updateInteractions(snapshotRef.current);
      renderScene(canvas, snapshotRef.current);
      animationFrame = window.requestAnimationFrame(frame);
    };

    animationFrame = window.requestAnimationFrame(frame);

    window.render_game_to_text = () => buildTextSnapshot(snapshotRef.current);
    window.advanceTime = (ms: number) => {
      snapshotRef.current.time += ms;
      snapshotRef.current.characters.forEach((character) => {
        stepCharacter(character, snapshotRef.current, ms);
      });
      updateInteractions(snapshotRef.current);
      renderScene(canvas, snapshotRef.current);
    };

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, []);

  useEffect(() => {
    syncCharacters(snapshotRef.current, attendees, latestGuestName);

    if (canvasRef.current) {
      renderScene(canvasRef.current, snapshotRef.current);
    }
  }, [attendees, latestGuestName]);

  return <canvas className={styles.sceneCanvas} ref={canvasRef} />;
}
