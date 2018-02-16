import Vue from 'vue'
import Router from 'vue-router'
import Landing from '@/components/Landing'
import SwapContainer from '@/components/SwapContainer'
import PrepareSwap from '@/components/PrepareSwap'
import CompleteSwap from '@/components/CompleteSwap'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'landing',
      component: Landing,
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
