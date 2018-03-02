// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'

import router from './router'
import './assets/all.scss'
import App from './App'

import Spinner from 'vue-simple-spinner'
import Icon from 'vue-awesome'
import SwapProgressLog from '@/components/SwapProgressLog'
import SwapSizeSelect from '@/components/SwapSizeSelect'
import SignTransactionDialog from '@/components/SignTransactionDialog'
import Axios from 'axios'
import VModal from 'vue-js-modal'

Vue.component('spinner', Spinner)
Vue.component('icon', Icon)
Vue.component('swap-progress-log', SwapProgressLog)
Vue.component('swap-size-select', SwapSizeSelect)
Vue.component('sign-transaction-dialog', SignTransactionDialog)

Vue.config.productionTip = false

Vue.use(VModal, {dialog: true})
Vue.use((Vue) => {
  Vue.prototype.$client = Axios.create({
    baseURL: process.env.API_URI,
  })
})

Vue.config.errorHandler = function(err, vm, info) {
  let handler
  let current = vm
  if (vm.$options.errorHandler) {
    handler = vm.$options.errorHandler
  } else {
    while (current.$parent) {
      current = current.$parent
      handler = current.$options.errorHandler
      if (handler) {
        break
      }
    }
  }
  if (handler) {
    handler.call(current, err, vm, info)
  } else {
    console.log(err)
  }
}

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: {App},
  template: '<App/>',
})
