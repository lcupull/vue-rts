<template>
  <div
    ref="viewportRef"
    class="game-viewport"
    @contextmenu.prevent="($event) => onRightClick($event)"
    @wheel.prevent="($event) => onWheel($event)"
    @mousedown="($event) => onMouseDown($event)"
    @mousemove="($event) => onMouseMove($event)"
    @mouseup="($event) => onMouseUp($event)"
    @mouseleave="() => onMouseUp()"
  >
    <GameWorld />

    <BuildPanel />

    <!-- Рамка выделения — рисуется поверх всего в экранных координатах -->
    <div v-if="selectionRect" class="game-viewport__selection" :style="selectionStyle"></div>

    <div class="game-viewport__controls" :style="controlsStyle">
        <div class="game-viewport__row"><span class="game-viewport__key">↑ ↓ ← →</span><span class="game-viewport__desc">Камера</span></div>
        <div class="game-viewport__row"><span class="game-viewport__key">Колесо</span><span class="game-viewport__desc">Зум</span></div>
        <div class="game-viewport__row"><span class="game-viewport__key">ЛКМ</span><span class="game-viewport__desc">Выбрать юнита</span></div>
        <div class="game-viewport__row"><span class="game-viewport__key">ЛКМ + drag</span><span class="game-viewport__desc">Выделить группу</span></div>
        <div class="game-viewport__row"><span class="game-viewport__key">ПКМ</span><span class="game-viewport__desc">Отправить к цели</span></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import GameWorld from './GameWorld.vue';
import BuildPanel from './BuildPanel.vue';
import { useGameLoop } from '@/composables/useGameLoop';
import { Z_INDEX } from '@/config/game';

const store = useStore();
const viewportRef = ref(null);

// Пересчёт кадра целиком выполняется в сторе
useGameLoop((dt) => {
  store.dispatch('frame/run', dt);
});

const getScreenPoint = (event) => {
  const rect = viewportRef.value.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

// Ввод -> события кадра
const onKeyDown = (event) => store.dispatch('events/keyDown', event.key);
const onKeyUp = (event) => store.dispatch('events/keyUp', event.key);

const onMouseDown = (event) => {
  if (event.button !== 0) return;
  store.dispatch('events/startDrag', getScreenPoint(event));
};

const onMouseMove = (event) => {
  const point = getScreenPoint(event);
  store.dispatch('events/updateCursor', point);
  store.dispatch('events/updateDrag', point);
};

// Отпускание ЛКМ завершает выделение; ПКМ и mouseleave выделение не трогают
const onMouseUp = (event) => {
  if (event && event.button !== 0) return;
  store.dispatch('events/endDrag');
};

const onRightClick = (event) => {
  store.dispatch('events/moveSelected', { cursor: getScreenPoint(event) });
};

const onWheel = (event) => {
  store.dispatch('events/wheel', {
    cursor: getScreenPoint(event),
    deltaY: event.deltaY
  });
};

// Отрисовка действительности из стора
const selectionRect = computed(() => store.getters['game/getSelectionRect']);
const selectionStyle = computed(() => ({
  left: `${selectionRect.value.x1}px`,
  top: `${selectionRect.value.y1}px`,
  width: `${selectionRect.value.x2 - selectionRect.value.x1}px`,
  height: `${selectionRect.value.y2 - selectionRect.value.y1}px`,
  zIndex: Z_INDEX.SELECTION_RECT
}));
const controlsStyle = { zIndex: Z_INDEX.CONTROLS_PANEL };

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

.game-viewport__selection {
  position: absolute;
  border: 2px solid rgba(80, 180, 255, 0.9);
  background: rgba(80, 180, 255, 0.18);
  pointer-events: none;
}

.game-viewport__controls {
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
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}

.game-viewport__row {
  display: flex;
  justify-content: space-between;
  gap: 1.5vw;
  white-space: nowrap;
}

.game-viewport__key {
  color: #a0d0ff;
  font-weight: 600;
}

.game-viewport__desc {
  color: #d0d0d0;
}
</style>