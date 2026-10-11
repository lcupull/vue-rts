<template>
  <div class="unit-sprite" :style="style" @click="onClick">
    <div class="unit-shadow"></div>
    <div class="unit-body" :class="{ selected: isSelected }">
      <div class="face face-top"></div>
      <div class="face face-left"></div>
      <div class="face face-right"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useIsoMath } from '@/composables/useIsoMath';

const props = defineProps({ unit: { type: Object, required: true } });
const store = useStore();
const { gridToScreen } = useIsoMath();

const isSelected = computed(() => store.getters['game/isUnitSelected'](props.unit.id));

const style = computed(() => {
  const { screenX, screenY } = gridToScreen(props.unit.x, props.unit.y);
  return { left: `${screenX}px`, top: `${screenY}px` };
});

const onClick = (event) => {
  event.stopPropagation();
  store.dispatch('game/selectUnits', [props.unit.id]);
};
</script>

<style lang="scss" scoped>
/* Спрайт: нижняя точка по центру совпадает с центром клетки */
.unit-sprite {
  position: absolute;
  width: 40px;
  height: 55px;
  /* Сдвигаем так, чтобы низ спрайта (ноги) стоял в центре тайла */
  transform: translate(-50%, -100%);
  cursor: pointer;
}

/* Тень-эллипс под юнитом */
.unit-shadow {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 34px;
  height: 16px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 50%;
  transform: translate(-50%, 50%);
  filter: blur(1px);
}

/* Тело: контейнер 40x40 — общий bounding box для трёх граней */
.unit-body {
  position: absolute;
  left: 50%;
  bottom: 8px;
  width: 40px;
  height: 40px;
  margin-left: -20px; /* центрируем по горизонтали */
  transition: transform 0.1s;
}

/* Верхняя грань — ромб 40x40 (по высоте ромба = 20px) */
.face {
  position: absolute;
  inset: 0;
}

.face-top {
  background: #e89c7c;
  clip-path: polygon(50% 0, 100% 25%, 50% 50%, 0 25%);
}

.face-left {
  background: #8a3018;
  clip-path: polygon(0 25%, 50% 50%, 50% 100%, 0 75%);
}

.face-right {
  background: #b04a28;
  clip-path: polygon(50% 50%, 100% 25%, 100% 75%, 50% 100%);
}

/* Выделение — светлая обводка поверх всех граней */
.unit-body.selected {
  .face-top    { background: #ffd870; }
  .face-left   { background: #b08020; }
  .face-right  { background: #d0a040; }
}

.unit-sprite:hover .unit-body {
  transform: translateY(-2px);
}
</style>