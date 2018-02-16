<template>
  <router-view/>
</template>

<script>
  import SwapSpecs from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'swap-container',
    beforeRouteEnter(to, from, next) {
      if (SwapSpecs[to.params.currency] === undefined) {
        return next(false)
      }
      if (['deposit', 'withdraw'].indexOf(to.params.side) === -1) {
        return next(false)
      }
      next()
    },
  }
</script>
