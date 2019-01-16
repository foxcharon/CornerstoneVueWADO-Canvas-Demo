// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import VueResource from 'vue-resource'
Vue.config.productionTip = false
Vue.use(VueResource);

import myUtils from './data/tools'
Vue.prototype.$Tools = myUtils;
import color from './data/color'
Vue.prototype.$Color_class = color;
import canvasMarkDataObject from './data/canvasMarkDataObject'
Vue.prototype.$CanvasMarkDataObject_class = canvasMarkDataObject;
import painting from './data/painting'
Vue.prototype.$Painting_tools = painting;

import $ from 'jquery' // jquery



/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: {
    App
  },
  template: '<App/>'
})
