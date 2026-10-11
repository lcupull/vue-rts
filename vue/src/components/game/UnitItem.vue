<template>
  <div
    class="unit"
    :class="{ selected: isSelected }"
    :style="style"
    @click.stop="onClick"
  ></div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { UNIT_RADIUS } from '@/config/game';

const props = defineProps({
  unit: { type: Object, required: true }
});

const store = useStore();
const isSelected = computed(() => store.getters['game/isUnitSelected'](props.unit.id));

const style = computed(() => ({
  left: `${props.unit.position.x}px`,
  top: `${props.unit.position.y}px`,
  width: `${UNIT_RADIUS * 2}px`,
  height: `${UNIT_RADIUS * 2}px`,
  marginLeft: `${-UNIT_RADIUS}px`,
  marginTop: `${-UNIT_RADIUS}px`
}));

const onClick = () => store.dispatch('game/selectUnits', [props.unit.id]);
</script>

<style scoped lang="scss">
.unit {
  position: absolute;
  border-radius: 50%;
  background: #e0e0e0;
  border: 1px solid #1a1a1a;
  cursor: pointer;
  transition: transform 0.08s;

  &.selected {
    background: #ffe070;
    border-color: #8a6010;
    box-shadow: 0 0 0 2px #8a6010;
  }

  &:hover {
    transform: scale(1.1);
  }
}
</style>