import {
  UNIT_STATS, UNIT_RADIUS, MAP_SIZE, EDGE_PADDING, GRID_STEP, BUILDING_TYPES, groupById
} from '@/config/game';
import { useIsoMath } from '@/composables/useIsoMath';

const { worldToScreen } = useIsoMath();

const LIMIT = MAP_SIZE / 2 - UNIT_RADIUS - EDGE_PADDING;
const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));

const buildingType = (type) => BUILDING_TYPES.find((b) => b.type === type);

let nextUnitId = 1;
let nextBuildingId = 1;

// Юнит с характеристиками: hp/maxHp для здоровья, strength — сила удара,
// damagedAt — игровое время последнего урона (для показа хпбара),
// group — к какой группе относится объект
const unit = (tileX, tileY, group = 'group1') => ({
  id: nextUnitId++,
  position: { x: tileX * GRID_STEP, y: tileY * GRID_STEP },
  target: null,
  group,
  ...UNIT_STATS,
  maxHp: UNIT_STATS.hp,
  damagedAt: null,
  screen: { x: 0, y: 0 }
});

// Здание привязывается к сетке: size — сторона в клетках, center — центр NxN блока
const buildingSize = (size) => size * GRID_STEP;
const snapToGrid = (world, size) => ({
  x: (Math.floor(world.x / GRID_STEP) + size / 2) * GRID_STEP,
  y: (Math.floor(world.y / GRID_STEP) + size / 2) * GRID_STEP
});

// Формация: слоты вокруг цели
const computeFormationSlots = (center, count) => {
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
};

// Коллизии: AABB зданий 
const aabb = (b) => ({
  left:   b.position.x - b.size / 2,
  right:  b.position.x + b.size / 2,
  top:    b.position.y - b.size / 2,
  bottom: b.position.y + b.size / 2
});

// Пересекается ли круг (x, y, r) хотя бы с одним зданием
const collidesWithBuildings = (x, y, r, buildings) => {
  return buildings.some((b) => {
    const a = aabb(b);
    const cx = Math.max(a.left, Math.min(x, a.right));
    const cy = Math.max(a.top,  Math.min(y, a.bottom));
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy < r * r;
  });
};

// Выталкивание круга из зданий (если центр оказался внутри AABB)
const resolveCollisions = (x, y, r, buildings) => {
  let position = { x, y };

  buildings.forEach((b) => {
    const a = aabb(b);
    const cx = Math.max(a.left, Math.min(position.x, a.right));
    const cy = Math.max(a.top,  Math.min(position.y, a.bottom));
    const dx = position.x - cx;
    const dy = position.y - cy;
    const d2 = dx * dx + dy * dy;

    if (d2 >= r * r) return;

    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      position = {
        x: cx + (dx / d) * r,
        y: cy + (dy / d) * r
      };
      return;
    }

    // Центр ровно внутри AABB - выталкиваем по ближайшей стороне
    const dl = position.x - a.left;
    const dr = a.right - position.x;
    const dt = position.y - a.top;
    const db = a.bottom - position.y;
    const m = Math.min(dl, dr, dt, db);

    if (m === dl) position = { ...position, x: a.left - r };
    else if (m === dr) position = { ...position, x: a.right + r };
    else if (m === dt) position = { ...position, y: a.top - r };
    else position = { ...position, y: a.bottom + r };
  });

  return position;
};

// Модуль 
export default {
  namespaced: true,

  state: () => ({
    // Свои юниты (group1) и две вражеские группы
    units: [
      ...[[-2, 3], [4, 1], [6, -4]].map(([x, y]) => unit(x, y, 'group1')),
      ...[[-8, -6], [-7, -5], [-9, -5]].map(([x, y]) => unit(x, y, 'group2')),
      ...[[8, 6], [9, 5], [7, 7], [8, 7]].map(([x, y]) => unit(x, y, 'group3'))
    ],
    buildings: []
  }),

  getters: {
    getUnitById: (state) => (id) => state.units.find((u) => u.id === id),
    getBuildings: (state) => state.buildings,

    // Характеристики выделенных юнитов: по группе строк на каждого юнита
    getStats: (state) => (unitIds) => {
      const units = state.units.filter((u) => unitIds.includes(u.id));
      if (units.length === 0) return [];
      return units.map((u) => ([
        { label: 'Группа', value: groupById(u.group).label },
        { label: 'Здоровье', value: `${u.hp} / ${u.maxHp}` },
        { label: 'Сила', value: u.strength },
        { label: 'Скорость', value: u.speed },
        { label: 'Скор. атаки', value: `${u.attackSpeed}/с` }
      ]));
    },

    // Характеристики здания
    getBuildingStats: (state) => (buildingId) => {
      const b = state.buildings.find((x) => x.id === buildingId);
      if (!b) return null;
      return [
        { label: 'Группа', value: groupById(b.group).label },
        { label: 'Здоровье', value: `${b.hp} / ${b.maxHp}` }
      ];
    },

    // Свободно ли место под здание размера size (клетки) с центром в world
    canPlace: (state) => (world, size) => {
      const c = snapToGrid(world, size);
      const half = buildingSize(size) / 2;
      const box = { left: c.x - half, right: c.x + half, top: c.y - half, bottom: c.y + half };

      // Внутри карты
      const limit = MAP_SIZE / 2;
      if (box.left < -limit || box.right > limit || box.top < -limit || box.bottom > limit) return false;

      // Не пересекается с другими зданиями
      return !state.buildings.some((b) => {
        const a = aabb(b);
        return box.left < a.right && box.right > a.left && box.top < a.bottom && box.bottom > a.top;
      });
    },

    // Призрак здания под курсором: привязка к сетке и признак допустимости
    getGhost: (state, getters) => (world, type) => {
      if (!world || !type) return null;
      const c = snapToGrid(world, type.size);
      return { ...c, size: buildingSize(type.size), valid: getters.canPlace(world, type.size) };
    },
    // Id юнитов, чья экранная позиция попала в рамку выделения
    getUnitIdsByRect: (state) => (rect) => {
      if (!rect) return [];
      return state.units
        .filter((u) => {
          const sp = u.screen;
          return sp.x >= rect.x1 && sp.x <= rect.x2 && sp.y >= rect.y1 && sp.y <= rect.y2;
        })
        .map((u) => u.id);
    },
    // Формация и целевые точки группы юнитов с учётом коллизий зданий
    getMoveSlots: (state) => ({ unitIds, target }) => {
      if (unitIds.length === 0) return [];

      // Ближайший к цели юнит займёт центр формации
      const sorted = [...unitIds].sort((a, b) => {
        const ua = state.units.find((u) => u.id === a);
        const ub = state.units.find((u) => u.id === b);
        const da = Math.hypot(ua.position.x - target.x, ua.position.y - target.y);
        const db = Math.hypot(ub.position.x - target.x, ub.position.y - target.y);
        return da - db;
      });

      const slots = computeFormationSlots(target, sorted.length);

      // Слот тоже выталкиваем из зданий, чтобы юнит не шёл в стену
      return sorted.map((id, i) => {
        const s = resolveCollisions(slots[i].x, slots[i].y, UNIT_RADIUS, state.buildings);
        return { id, target: { x: clamp(s.x), y: clamp(s.y) } };
      });
    },
    // Линия пути юнита от позиции к цели (мировые координаты)
    getPathStyle: () => (unit) => {
      const dx = unit.target.x - unit.position.x;
      const dy = unit.target.y - unit.position.y;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      return {
        left: `${unit.position.x}px`,
        top: `${unit.position.y}px`,
        width: `${len}px`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%'
      };
    }
  },

  mutations: {
    // Безопасно принимаем null — иначе пересчёт кадра крашится после достижения цели
    SET_TARGET: (state, { id, target }) => {
      const u = state.units.find((u) => u.id === id);
      if (!u) return;
      u.target = target ? { x: clamp(target.x), y: clamp(target.y) } : null;
    },

    SET_POSITION: (state, { id, x, y }) => {
      const u = state.units.find((u) => u.id === id);
      if (u) {
        u.position.x = clamp(x);
        u.position.y = clamp(y);
      }
    },

    // Экранная позиция элемента — пересчитывается при пересчёте кадра
    SET_SCREEN: (state, { id, screen }) => {
      const u = state.units.find((u) => u.id === id);
      if (u) u.screen = screen;
    },

    SET_BUILDING_SCREEN: (state, { id, screen }) => {
      const b = state.buildings.find((b) => b.id === id);
      if (b) b.screen = screen;
    },

    ADD_BUILDING: (state, { type, size, position, group = 'group1' }) => {
      const { hp } = buildingType(type);
      state.buildings.push({
        id: 'b' + nextBuildingId++,
        type,
        position,
        group,
        size: buildingSize(size),
        hp,
        maxHp: hp,
        damagedAt: null,
        screen: { x: 0, y: 0 }
      });
    },

    // Урон юниту или зданию: фиксируем время удара, чтобы хпбар показался в реальном времени
    APPLY_DAMAGE: (state, { id, amount, time }) => {
      const target = state.units.find((u) => u.id === id) || state.buildings.find((b) => b.id === id);
      if (!target) return;
      target.hp = Math.max(0, target.hp - amount);
      target.damagedAt = time;
    }
  },

  actions: {
    // Экранные позиции элементов карты для текущей камеры и вьюпорта
    projectToScreen: ({ state, rootState, commit }) => {
      const { viewport, camera } = rootState.game;
      state.units.forEach((u) => {
        commit('SET_SCREEN', { id: u.id, screen: worldToScreen(u.position, viewport, camera) });
      });
      state.buildings.forEach((b) => {
        commit('SET_BUILDING_SCREEN', { id: b.id, screen: worldToScreen(b.position, viewport, camera) });
      });
    },

    // Применение событий к элементам карты и пересчёт состояния на dt
    moveUnits: ({ state, commit }, dt) => {
      const R = UNIT_RADIUS;
      const B = state.buildings;

      state.units.forEach((u) => {
        if (!u.target) return;

        const dx = u.target.x - u.position.x;
        const dy = u.target.y - u.position.y;
        const dist = Math.hypot(dx, dy);

        // Дошли до цели — фиксируемся и очищаем target
        if (dist < 1) {
          commit('SET_POSITION', { id: u.id, x: u.target.x, y: u.target.y });
          commit('SET_TARGET', { id: u.id, target: null });
          return;
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
      });
    }
  }
};