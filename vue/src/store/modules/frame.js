// Модуль: пересчёт следующего кадра
// Кадр = применение всех событий к элементам карты и пересчёт их состояния
export default {
  namespaced: true,

  state: () => ({}),

  actions: {
    run: ({ dispatch, commit }, dt) => {
      commit('game/SET_FRAME', dt, { root: true });

      // 1. Применение событий к элементам карты
      dispatch('events/applyEvents', null, { root: true });

      // 2. Пересчёт игрока: камера и зум
      dispatch('game/applyInput', { dt }, { root: true });
      dispatch('game/zoomCamera', null, { root: true });

      // 3. Пересчёт элементов карты
      dispatch('map/moveUnits', dt, { root: true });

      // 4. Экранные позиции для отрисовки
      dispatch('map/projectToScreen', null, { root: true });

      // 5. Очередь событий очищается до следующего кадра
      dispatch('events/clearEvents', null, { root: true });
      dispatch('game/clearZoomQueue', null, { root: true });
    }
  }
};
