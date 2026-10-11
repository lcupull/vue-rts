import { createStore } from 'vuex'

import game from './modules/game'
import units from './modules/units'

export default createStore({
  modules: {
    game,
    units
    // list
  }
})