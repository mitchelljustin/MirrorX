import Vue from 'vue'
import Router from 'vue-router'
import Landing from '@/components/Landing'
import PrepareWithdraw from '@/components/PrepareWithdraw'
import PrepareDeposit from '@/components/PrepareDeposit'
import CompleteDeposit from '@/components/CompleteDeposit'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'landing',
      component: Landing,
    },
    {
      path: '/:currency/withdraw',
      name: 'prepare-withdraw',
      component: PrepareWithdraw,
    },
    {
      path: '/:currency/deposit',
      name: 'prepare-deposit',
      component: PrepareDeposit,
    },
    {
      path: '/:currency/deposit/complete',
      name: 'complete-deposit',
      component: CompleteDeposit,
    },
    {
      path: '*',
      redirect: '/',
    },
  ],
})
