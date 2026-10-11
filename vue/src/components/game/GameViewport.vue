<template>
  <div
    ref="viewportRef"
    class="game-viewport"
    @contextmenu.prevent="onRightClick"
    @click="onLeftClick"
    @wheel.prevent="onWheel"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
  >
    <GameWorld />

    <!-- Рамка выделения — рисуется поверх всего в экранных координатах -->
    <div v-if="selectionRect" class="selection-rect" :style="selectionStyle"></div>

    <div class="controls-panel">
        <div class="row"><span class="key">↑ ↓ ← →</span><span class="desc">Камера</span></div>
        <div class="row"><span class="key">Колесо</span><span class="desc">Зум</span></div>
        <div class="row"><span class="key">ЛКМ</span><span class="desc">Выбрать юнита</span></div>
        <div class="row"><span class="key">ЛКМ + drag</span><span class="desc">Выделить группу</span></div>
        <div class="row"><span class="key">ПКМ</span><span class="desc">Отправить к цели</span></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import GameWorld from './GameWorld.vue';
import { useGameLoop } from '@/composables/useGameLoop';
import { useIsoMath } from '@/composables/useIsoMath';
import {
  MIN_ZOOM, MAX_ZOOM, CAMERA_SPEED, ISO_ROTATION_DEG, ISO_SCALE_Y
} from '@/config/game';

const store = useStore();
const viewportRef = ref(null);
const { screenToWorld, worldToScreen } = useIsoMath();

const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false
};
const onKeyDown = (e) => { if (e.key in keys) keys[e.key] = true; };
const onKeyUp   = (e) => { if (e.key in keys) keys[e.key] = false; };

const RAD = ISO_ROTATION_DEG * Math.PI / 180;
const ISO_COS = Math.cos(RAD);
const ISO_SIN = Math.sin(RAD);

function screenDirToWorldDir(sx, sy) {
  const unsquashedY = sy / ISO_SCALE_Y;
  return {
    x: sx * ISO_COS + unsquashedY * ISO_SIN,
    y: unsquashedY * ISO_COS - sx * ISO_SIN
  };
}

useGameLoop((dt) => {
  let sx = 0, sy = 0;
  if (keys.w || keys.ArrowUp)    sy -= 1;
  if (keys.s || keys.ArrowDown)  sy += 1;
  if (keys.a || keys.ArrowLeft)  sx -= 1;
  if (keys.d || keys.ArrowRight) sx += 1;

  if (sx || sy) {
    const world = screenDirToWorldDir(sx, sy);
    const len = Math.hypot(world.x, world.y) || 1;
    const speed = CAMERA_SPEED * dt / store.state.game.camera.zoom;
    store.dispatch('game/moveCamera', {
      x: (world.x / len) * speed,
      y: (world.y / len) * speed
    });
  }
  store.dispatch('units/tick', dt);
});

const getScreenPoint = (event) => {
  const rect = viewportRef.value.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

//Выделение рамкой
const selectionRect = ref(null);       // { x1, y1, x2, y2 } в экранных координатах
let dragStart = null;
let dragged = false;

const onMouseDown = (event) => {
  if (event.button !== 0) return;
  dragStart = getScreenPoint(event);
  dragged = false;
};

const onMouseMove = (event) => {
  if (!dragStart) return;
  const p = getScreenPoint(event);
  if (Math.hypot(p.x - dragStart.x, p.y - dragStart.y) > 4) {
    dragged = true;
    selectionRect.value = {
      x1: Math.min(dragStart.x, p.x),
      y1: Math.min(dragStart.y, p.y),
      x2: Math.max(dragStart.x, p.x),
      y2: Math.max(dragStart.y, p.y)
    };
  }
};

const onMouseUp = () => {
  if (!dragStart) return;

  if (dragged && selectionRect.value) {
    const { viewport, camera } = store.state.game;
    const r = selectionRect.value;
    const ids = [];
    for (const u of store.state.units.units) {
      const sp = worldToScreen(u.position, viewport, camera);
      if (sp.x >= r.x1 && sp.x <= r.x2 && sp.y >= r.y1 && sp.y <= r.y2) {
        ids.push(u.id);
      }
    }
    store.dispatch('game/selectUnits', ids);
  }

  dragStart = null;
  selectionRect.value = null;
};

const selectionStyle = computed(() => {
  const r = selectionRect.value;
  if (!r) return null;
  return {
    left:   `${r.x1}px`,
    top:    `${r.y1}px`,
    width:  `${r.x2 - r.x1}px`,
    height: `${r.y2 - r.y1}px`
  };
});

//ПКМ  команда 
const onRightClick = (event) => {
  const screen = getScreenPoint(event);
  const target = screenToWorld(
    screen.x, screen.y,
    store.state.game.viewport,
    store.state.game.camera
  );
  const ids = store.state.game.selectedUnitIds;
  if (ids.length) {
    store.dispatch('units/issueMoveCommand', { unitIds: ids, target });
  }
};

// ЛКМ по пустому месту - сброс 
const onLeftClick = () => {
  if (dragged) { dragged = false; return; }
  store.dispatch('game/selectUnits', []);
};

//  Зум колесом 
const onWheel = (event) => {
  const screen = getScreenPoint(event);
  const { viewport, camera } = store.state.game;
  const worldBefore = screenToWorld(screen.x, screen.y, viewport, camera);

  const factor = event.deltaY > 0 ? 1 / 1.15 : 1.15;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * factor));

  const offsetX = screen.x - viewport.width / 2;
  const offsetY = screen.y - viewport.height / 2;
  const unscaledX = offsetX / newZoom;
  const unsquashedY = offsetY / newZoom / ISO_SCALE_Y;
  const wox = unscaledX * ISO_COS + unsquashedY * ISO_SIN;
  const woy = unsquashedY * ISO_COS - unscaledX * ISO_SIN;

  store.dispatch('game/setCamera', {
    x: worldBefore.x - wox,
    y: worldBefore.y - woy,
    zoom: newZoom
  });
};

const updateViewport = () => {
  const rect = viewportRef.value.getBoundingClientRect();
  store.dispatch('game/setViewport', { width: rect.width, height: rect.height });
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', updateViewport);
  updateViewport();
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('resize', updateViewport);
});
</script>

<style scoped lang="scss">
.game-viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #c0c0c0;
  user-select: none;
  cursor: crosshair;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.selection-rect {
  position: absolute;
  border: 2px solid rgba(80, 180, 255, 0.9);
  background: rgba(80, 180, 255, 0.18);
  pointer-events: none;
  z-index: 50;
}

.controls-panel {
  position: absolute;
  top: 24px;
  right: 24px;
  padding: 1.2vw 1.6vw;
  background: rgba(15, 15, 15, 0.82);
  color: #e8e8e8;
  border-radius: 10px;
  font-size: clamp(18px, 1vw, 30px);
  line-height: 1.9;
  min-width: clamp(320px, 20vw, 520px);
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);

  .row {
    display: flex;
    justify-content: space-between;
    gap: 1.5vw;
    white-space: nowrap;
  }

  .key {
    color: #a0d0ff;
    font-weight: 600;
  }

  .desc {
    color: #d0d0d0;
  }
}
</style>