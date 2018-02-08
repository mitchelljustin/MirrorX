import Vue from 'vue'
import Router from 'vue-router'
import Landing from '@/components/Landing'
import Withdraw from '@/components/Withdraw'
import Deposit from '@/components/Deposit'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Landing',
      component: Landing,
    },
    {
      path: '/withdraw/:currency',
      name: 'Withdraw',
      component: Withdraw,
    },
    {
      path: '/deposit/:currency',
      name: 'Deposit',
      component: Deposit,
    },
  ],
})
