<template>
  <router-view/>
</template>

<script>
  import {currencySupported} from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'swap-container',
    beforeRouteEnter(to, from, next) {
      if (!currencySupported(to.params.currency)) {
        return next(false)
      }
      if (['deposit', 'withdraw'].indexOf(to.params.side) === -1) {
        return next(false)
      }
      next()
    },
  }
</script>
