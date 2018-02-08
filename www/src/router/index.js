import Vue from 'vue'
import Router from 'vue-router'
import Landing from '@/components/Landing'
import PrepareSwap from '@/components/PrepareSwap'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'landing',
      component: Landing,
    },
    {
      path: '/:currency/:action',
      name: 'prepare-swap',
      component: PrepareSwap,
    },
    {
      path: '*',
      redirect: '/',
    },
  ],
})
