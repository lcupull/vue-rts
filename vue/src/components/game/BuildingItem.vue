<template>
  <div class="building" :style="style"></div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  building: { type: Object, required: true }
});

const style = computed(() => {
  const b = props.building;
  return {
    left: `${b.position.x - b.size / 2}px`,
    top:  `${b.position.y - b.size / 2}px`,
    width:  `${b.size}px`,
    height: `${b.size}px`
  };
});
</script>

<style scoped lang="scss">
.building {
  position: absolute;
  background: #d8d8d8;
  border: 1px solid #1a1a1a;
  pointer-events: none;
}
</style>