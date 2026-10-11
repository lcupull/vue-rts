import { DEFAULT_ZOOM } from '@/config/game';

export default {
  namespaced: true,
  state: () => ({
    camera: { x: 0, y: 0, zoom: DEFAULT_ZOOM },
    viewport: { width: 0, height: 0 },
    selectedUnitIds: []
  }),
  getters: {
    isUnitSelected: (state) => (id) => state.selectedUnitIds.includes(id)
  },
  mutations: {
    SET_VIEWPORT(state, size) { state.viewport = size; },
    SET_CAMERA(state, cam) { state.camera = cam; },
    MOVE_CAMERA(state, offset) {
      state.camera.x += offset.x;
      state.camera.y += offset.y;
    },
    SET_ZOOM(state, zoom) { state.camera.zoom = zoom; },
    SET_SELECTED(state, ids) { state.selectedUnitIds = ids; }
  },
  actions: {
    setViewport({ commit }, size) { commit('SET_VIEWPORT', size); },
    setCamera({ commit }, cam) { commit('SET_CAMERA', cam); },
    moveCamera({ commit }, offset) { commit('MOVE_CAMERA', offset); },
    setZoom({ commit }, z) { commit('SET_ZOOM', z); },
    selectUnits({ commit }, ids) { commit('SET_SELECTED', ids); }
  }
};