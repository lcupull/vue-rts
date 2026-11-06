import {
  UNIT_SPEED, UNIT_RADIUS, MAP_SIZE, EDGE_PADDING, GRID_STEP, BUILDING_SIZE
} from '@/config/game';

const LIMIT = MAP_SIZE / 2 - UNIT_RADIUS - EDGE_PADDING;
const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));

let nextUnitId = 1;
let nextBuildingId = 1;
const t = (tileX, tileY) => ({ x: tileX * GRID_STEP, y: tileY * GRID_STEP });

// Формация: слоты вокруг цели
function computeFormationSlots(center, count) {
  const SPACING = UNIT_RADIUS * 2 + 6; // юниты почти касаются, но не пересекаются
  if (count === 1) return [{ x: center.x, y: center.y }];

  const side = Math.ceil(Math.sqrt(count));
  const offset = (side - 1) / 2;
  const slots = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / side);
    const col = i % side;
    slots.push({
      x: center.x + (col - offset) * SPACING,
      y: center.y + (row - offset) * SPACING
    });
  }
  return slots;
}

// Коллизии: AABB зданий 
function aabb(b) {
  return {
    left:   b.position.x - b.size / 2,
    right:  b.position.x + b.size / 2,
    top:    b.position.y - b.size / 2,
    bottom: b.position.y + b.size / 2
  };
}

// Пересекается ли круг (x, y, r) хотя бы с одним зданием
function collidesWithBuildings(x, y, r, buildings) {
  for (const b of buildings) {
    const a = aabb(b);
    const cx = Math.max(a.left, Math.min(x, a.right));
    const cy = Math.max(a.top,  Math.min(y, a.bottom));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// Выталкивание круга из зданий (если центр оказался внутри AABB)
function resolveCollisions(x, y, r, buildings) {
  for (const b of buildings) {
    const a = aabb(b);
    const cx = Math.max(a.left, Math.min(x, a.right));
    const cy = Math.max(a.top,  Math.min(y, a.bottom));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;

    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      } else {
        // Центр ровно внутри AABB - выталкиваем по ближайшей стороне
        const dl = x - a.left;
        const dr = a.right - x;
        const dt = y - a.top;
        const db = a.bottom - y;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) x = a.left - r;
        else if (m === dr) x = a.right + r;
        else if (m === dt) y = a.top - r;
        else y = a.bottom + r;
      }
    }
  }
  return { x, y };
}

// Модуль 
export default {
  namespaced: true,

  state: () => ({
    units: [
      { id: nextUnitId++, position: t(-2,  3), target: null, speed: UNIT_SPEED },
      { id: nextUnitId++, position: t( 4,  1), target: null, speed: UNIT_SPEED },
      { id: nextUnitId++, position: t( 6, -4), target: null, speed: UNIT_SPEED }
    ],
    buildings: [
      { id: 'b' + nextBuildingId++, position: t(-5, -3), size: BUILDING_SIZE },
      { id: 'b' + nextBuildingId++, position: t( 3,  4), size: BUILDING_SIZE }
    ]
  }),

  getters: {
    getUnitById: (state) => (id) => state.units.find(u => u.id === id),
    getBuildings: (state) => state.buildings
  },

  mutations: {
    // Безопасно принимаем null — иначе tick крашится после достижения цели
    SET_TARGET(state, { id, target }) {
      const u = state.units.find(u => u.id === id);
      if (!u) return;
      u.target = target ? { x: clamp(target.x), y: clamp(target.y) } : null;
    },

    SET_POSITION(state, { id, x, y }) {
      const u = state.units.find(u => u.id === id);
      if (u) {
        u.position.x = clamp(x);
        u.position.y = clamp(y);
      }
    }
  },

  actions: {
    // Выдать команду движения группе юнитов с учётом формации и коллизий
    issueMoveCommand({ state, commit }, { unitIds, target }) {
      if (unitIds.length === 0) return;

      // Ближайший к цели юнит займёт центр формации
      const sorted = [...unitIds].sort((a, b) => {
        const ua = state.units.find(u => u.id === a);
        const ub = state.units.find(u => u.id === b);
        const da = Math.hypot(ua.position.x - target.x, ua.position.y - target.y);
        const db = Math.hypot(ub.position.x - target.x, ub.position.y - target.y);
        return da - db;
      });

      const slots = computeFormationSlots(target, sorted.length);

      sorted.forEach((id, i) => {
        // Слот тоже выталкиваем из зданий, чтобы юнит не шёл в стену
        const s = resolveCollisions(slots[i].x, slots[i].y, UNIT_RADIUS, state.buildings);
        commit('SET_TARGET', { id, target: { x: clamp(s.x), y: clamp(s.y) } });
      });
    },

    // Двигаем всех юнитов с учётом коллизий с зданиями
    tick({ state, commit }, dt) {
      const R = UNIT_RADIUS;
      const B = state.buildings;

      for (const u of state.units) {
        if (!u.target) continue;

        const dx = u.target.x - u.position.x;
        const dy = u.target.y - u.position.y;
        const dist = Math.hypot(dx, dy);

        // Дошли до цели — фиксируемся и очищаем target
        if (dist < 1) {
          commit('SET_POSITION', { id: u.id, x: u.target.x, y: u.target.y });
          commit('SET_TARGET', { id: u.id, target: null });
          continue;
        }

        const step = Math.min(u.speed * dt, dist);
        const nx = (dx / dist) * step;
        const ny = (dy / dist) * step;

        // Скольжение вдоль стен: пробуем оси по отдельности
        let newX = u.position.x;
        let newY = u.position.y;

        if (!collidesWithBuildings(newX + nx, newY, R, B)) newX += nx;
        if (!collidesWithBuildings(newX, newY + ny, R, B)) newY += ny;

        // Финальная страховка — если всё же оказались внутри, выталкиваем
        const fixed = resolveCollisions(newX, newY, R, B);

        commit('SET_POSITION', { id: u.id, x: fixed.x, y: fixed.y });
      }
    }
  }
};