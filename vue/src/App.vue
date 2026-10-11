<template>
  <GameViewport />
</template>

<script setup>
import GameViewport from '@/components/game/GameViewport.vue';
</script>

<style lang="scss">
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
}
#app, #project, main, section {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  text-align: left !important;
}
</style>