<template>
  <div class="game-world" :style="worldStyle">
    <div class="game-world__outer-ground"></div>
    <div class="game-world__ground" :style="groundStyle"></div>

    <BuildingItem
      v-for="b in buildings"
      :key="b.id"
      :building="b"
    />

    <div
      v-for="unit in unitsWithTarget"
      :key="'p' + unit.id"
      class="game-world__path-line"
      :style="pathStyle(unit)"
    ></div>

    <UnitItem
      v-for="unit in units"
      :key="unit.id"
      :unit="unit"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import UnitItem from './UnitItem.vue';
import BuildingItem from './BuildingItem.vue';
import {
  GRID_STEP, MAP_SIZE, ISO_ROTATION_DEG, ISO_SCALE_Y
} from '@/config/game';

const store = useStore();
const units = computed(() => store.state.map.units);
const buildings = computed(() => store.state.map.buildings);
const unitsWithTarget = computed(() => units.value.filter((u) => u.target));

const worldStyle = computed(() => {
  const { viewport, camera } = store.state.game;
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  return {
    transform:
      `translate(${cx}px, ${cy}px) ` +
      `scale(${camera.zoom}) ` +
      `scale(1, ${ISO_SCALE_Y}) ` +
      `rotate(${ISO_ROTATION_DEG}deg) ` +
      `translate(${-camera.x}px, ${-camera.y}px)`
  };
});

const groundStyle = computed(() => ({
  left:   `${-MAP_SIZE / 2}px`,
  top:    `${-MAP_SIZE / 2}px`,
  width:  `${MAP_SIZE}px`,
  height: `${MAP_SIZE}px`,
  backgroundSize: `${GRID_STEP}px ${GRID_STEP}px`
}));

const pathStyle = computed(() => store.getters['map/getPathStyle']);
</script>

<style scoped lang="scss">
.game-world {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.game-world__outer-ground {
  position: absolute;
  left: -20000px;
  top: -20000px;
  width: 40000px;
  height: 40000px;
  background: #c0c0c0;
  pointer-events: none;
}

.game-world__ground {
  position: absolute;
  background-color: #3a3a3a;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.32) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.32) 2px, transparent 2px);
  border: 1px solid rgba(0, 0, 0, 0.6);
  box-sizing: border-box;
  pointer-events: none;
}

.game-world__path-line {
  position: absolute;
  height: 0;
  border-top: 2px dashed rgba(255, 220, 80, 0.65);
  pointer-events: none;
}
</style>