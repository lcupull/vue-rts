<template>
  <div class="build-panel" :style="style">
    <div class="build-panel__title">Стройка</div>
    <button
      v-for="type in types"
      :key="type.type"
      class="build-panel__item"
      :class="{ 'build-panel__item--active': isActive(type) }"
      :style="itemStyle(type)"
      @click.stop="() => onPick(type)"
    >
      {{ type.label }}
      <span class="build-panel__size">{{ type.size }}x{{ type.size }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { BUILDING_TYPES, BUILD_ICON_TILE, Z_INDEX } from '@/config/game';

const store = useStore();
const types = BUILDING_TYPES;
const style = { zIndex: Z_INDEX.BUILD_PANEL };

const isActive = (type) => store.state.game.buildType === type;

// Иконка — квадрат NxN клеток в масштабе панели
const itemStyle = (type) => ({
  '--icon-size': `${type.size * BUILD_ICON_TILE}px`
});

const onPick = (type) => store.dispatch('events/pickBuilding', type);
</script>

<style scoped lang="scss">
.build-panel {
  position: absolute;
  left: 24px;
  top: 24px;
  padding: 1vw 1vw 1.2vw;
  background: rgba(15, 15, 15, 0.82);
  color: #e8e8e8;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.build-panel__title {
  margin-bottom: 8px;
  color: #a0d0ff;
  font-size: clamp(14px, 0.9vw, 22px);
  font-weight: 600;
}

.build-panel__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 6px;
  padding: 8px 12px;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  background: #202020;
  color: #e8e8e8;
  font: inherit;
  cursor: pointer;

  &::before {
    content: '';
    width: var(--icon-size);
    height: var(--icon-size);
    background: #d8d8d8;
    border: 1px solid #1a1a1a;
  }

  &:hover {
    background: #2c2c2c;
  }

  &.build-panel__item--active {
    border-color: #a0d0ff;
    background: #1b3550;
  }
}

.build-panel__size {
  margin-left: auto;
  color: #909090;
  font-size: 0.85em;
}
</style>