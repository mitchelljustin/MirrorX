import Vue from 'vue'
import Router from 'vue-router'
import Landing from '@/components/Landing'
import About from '@/components/About'
import SwapContainer from '@/components/SwapContainer'
import PrepareSwap from '@/components/PrepareSwap'
import CompleteSwap from '@/components/CompleteSwap'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'landing',
      component: Landing,
    },
    {
      path: '/about',
      name: 'about',
      component: About,
    },
    {
      path: '/:currency/:side',
      component: SwapContainer,
      children: [
        {
          path: '',
          name: 'prepare-swap',
          component: PrepareSwap,
          props: true,
        },
        {
          path: 'complete',
          name: 'complete-swap',
          component: CompleteSwap,
          props: r => ({
            ...r.params,
            ...r.query,
          }),
        },

      ],
    },
    {
      path: '*',
      redirect: '/',
    },
  ],
})
