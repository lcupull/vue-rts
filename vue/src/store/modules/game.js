import {
  DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, CAMERA_SPEED,
  ISO_ROTATION_DEG, ISO_SCALE_Y
} from '@/config/game';
import { useIsoMath } from '@/composables/useIsoMath';

const { screenToWorld } = useIsoMath();

const RAD = ISO_ROTATION_DEG * Math.PI / 180;
const ISO_COS = Math.cos(RAD);
const ISO_SIN = Math.sin(RAD);

// Направление на экране -> направление в мире (с учётом изометрии)
const screenDirToWorldDir = (sx, sy) => {
  const unsquashedY = sy / ISO_SCALE_Y;
  return {
    x: sx * ISO_COS + unsquashedY * ISO_SIN,
    y: unsquashedY * ISO_COS - sx * ISO_SIN
  };
};

export default {
  namespaced: true,
  state: () => ({
    camera: { x: 0, y: 0, zoom: DEFAULT_ZOOM },
    viewport: { width: 0, height: 0 },
    selectedUnitIds: [],
    // Зажатые клавиши камеры
    keys: {
      w: false, a: false, s: false, d: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
    },
    // Текущее перетаскивание ЛКМ
    drag: { start: null, current: null, dragged: false },
    // Очередь зума колесом за кадр: { cursor, worldBefore, deltaY }
    zoomQueue: [],
    // Последний пересчитанный кадр
    frame: { dt: 0 }
  }),
  getters: {
    isUnitSelected: (state) => (id) => state.selectedUnitIds.includes(id),
    // Рамка выделения в экранных координатах
    getSelectionRect: (state) => {
      const { start, current, dragged } = state.drag;
      if (!dragged || !start || !current) return null;
      return {
        x1: Math.min(start.x, current.x),
        y1: Math.min(start.y, current.y),
        x2: Math.max(start.x, current.x),
        y2: Math.max(start.y, current.y)
      };
    },
    // Мировые координаты по экранной точке — только чтение результата
    getWorldByScreen: (state) => (screen) => {
      return screenToWorld(screen.x, screen.y, state.viewport, state.camera);
    }
  },
  mutations: {
    SET_VIEWPORT: (state, size) => { state.viewport = size; },
    SET_CAMERA: (state, cam) => { state.camera = cam; },
    MOVE_CAMERA: (state, offset) => {
      state.camera.x += offset.x;
      state.camera.y += offset.y;
    },
    SET_ZOOM: (state, zoom) => { state.camera.zoom = zoom; },
    SET_SELECTED: (state, ids) => { state.selectedUnitIds = ids; },

    SET_KEY: (state, { key, pressed }) => {
      if (key in state.keys) state.keys[key] = pressed;
    },
    CLEAR_KEYS: (state) => {
      Object.keys(state.keys).forEach((key) => { state.keys[key] = false; });
    },

    START_DRAG: (state, point) => {
      state.drag = { start: point, current: point, dragged: false };
    },
    UPDATE_DRAG: (state, { point, threshold }) => {
      if (!state.drag.start) return;
      state.drag.current = point;
      const start = state.drag.start;
      if (Math.hypot(point.x - start.x, point.y - start.y) > threshold) {
        state.drag.dragged = true;
      }
    },
    END_DRAG: (state) => {
      state.drag = { start: null, current: null, dragged: false };
    },

    SET_FRAME: (state, dt) => { state.frame = { dt }; },

    PUSH_ZOOM: (state, zoom) => { state.zoomQueue.push(zoom); }
  },
  actions: {
    setViewport: ({ commit }, size) => { commit('SET_VIEWPORT', size); },
    setCamera: ({ commit }, cam) => { commit('SET_CAMERA', cam); },
    moveCamera: ({ commit }, offset) => { commit('MOVE_CAMERA', offset); },
    setZoom: ({ commit }, z) => { commit('SET_ZOOM', z); },
    selectUnits: ({ commit }, ids) => { commit('SET_SELECTED', ids); },
    endDrag: ({ commit }) => { commit('END_DRAG'); },

    // Применение накопленных за кадр событий ввода: клавиши камеры
    applyInput: ({ state, commit }, { dt }) => {
      const { keys, camera } = state;

      let sx = 0, sy = 0;
      if (keys.w || keys.ArrowUp)    sy -= 1;
      if (keys.s || keys.ArrowDown)  sy += 1;
      if (keys.a || keys.ArrowLeft)  sx -= 1;
      if (keys.d || keys.ArrowRight) sx += 1;

      if (sx || sy) {
        const world = screenDirToWorldDir(sx, sy);
        const len = Math.hypot(world.x, world.y) || 1;
        const speed = CAMERA_SPEED * dt / camera.zoom;
        commit('MOVE_CAMERA', {
          x: (world.x / len) * speed,
          y: (world.y / len) * speed
        });
      }
    },

    // Пересчёт камеры по событиям зума: точка мира под курсором остаётся на месте
    zoomCamera: ({ state, commit }) => {
      state.zoomQueue.forEach(({ cursor, worldBefore, deltaY }) => {
        const { camera, viewport } = state;
        const factor = deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * factor));

        const offsetX = cursor.x - viewport.width / 2;
        const offsetY = cursor.y - viewport.height / 2;
        const unscaledX = offsetX / newZoom;
        const unsquashedY = offsetY / newZoom / ISO_SCALE_Y;
        const wox = unscaledX * ISO_COS + unsquashedY * ISO_SIN;
        const woy = unsquashedY * ISO_COS - unscaledX * ISO_SIN;

        commit('SET_CAMERA', {
          x: worldBefore.x - wox,
          y: worldBefore.y - woy,
          zoom: newZoom
        });
      });
    },

    clearZoomQueue: ({ state }) => {
      state.zoomQueue = [];
    }
  }
};
