<template>
  <div>
    <div class="row prepare-swap-container">
      <div class="major col">
        <h1>{{action.toUpperCase()}} {{currency}}</h1>
        <div class="form-label">
          <label for="stellarAccount">
            Stellar Account
          </label>
          <small v-if="action === 'deposit'">
            <a href="https://stellarterm.com/#account">
              Don't have one?
            </a>
          </small>
        </div>
        <input type="text"
               placeholder="GCQNGBNTMHDVKFY3KQ5CXBPICFUAWYLMDRCBEWWAJRWYC6VEEMEQ6NIQ"
               v-model="stellarAccount"
               id="stellarAccount"

        >
        <div class="form-label">
          <label for="cryptoAddress">
            {{currency}} Address
          </label>
        </div>
        <input type="text"
               :placeholder="cryptoAddressPlaceholder"
               v-model="cryptoAddress"
               id="cryptoAddress"

        >
        <div class="form-label">
          <label>
            Amount
          </label>
        </div>
        <div class="full row">
          <div class="major row">
            <div class="col swapSize" v-for="(swapSize, i) in swapSizes" :key="i">
              <input :checked="i === 0"
                     :id='`swapSize-${i}`'
                     :value="swapSize"
                     v-model="amount"
                     name='amount'
                     type='radio'
              >
              <label :for='`swapSize-${i}`'>
                <h3>{{ swapSize }} {{ currency }}</h3>
              </label>
            </div>
          </div>
          <div class="minor">
            <button class="big" @click="startClicked">
              START
            </button>

          </div>
        </div>
      </div>
      <div class="minor col">
        <h2>Info</h2>
        <p>
          You can sign transactions however you please.
          MirrorX provides an easy interface to sign Stellar transactions, but you're not required to use it.
        </p>
        <p>
          To make sure there are enough peers to swap with, right now
          we only support a limited set of deposit & withdrawal sizes.
        </p>
        <p>
          Please allow some time for us to match you with a peer.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
  import SupportedSwaps from '../../../lib/supportedSwaps.mjs'

  export default {
    name: 'prepare-swap',
    data() {
      const {swapSizes} = SupportedSwaps[this.$route.params.currency]
      return {
        currency: this.$route.params.currency,
        action: this.$route.params.action,
        amount: swapSizes[0],
        stellarAccount: '',
        cryptoAddress: '',
        swapSizes,
      }
    },
    beforeRouteEnter(to, from, next) {
      if (to.params.action !== 'withdraw' && to.params.action !== 'deposit') {
        return next(false)
      }
      if (SupportedSwaps[to.params.currency] === undefined) {
        return next(false)
      }
      next()
    },
    methods: {
      startClicked() {
        const {currency, stellarAccount, cryptoAddress, amount, action} = this
        console.log(JSON.stringify({currency, stellarAccount, cryptoAddress, amount, action}))
      },
    },
    computed: {
      cryptoAddressPlaceholder() {
        if (this.currency === 'ETH') {
          return '0xc257274276a4e539741ca11b590b9447b26a8051'
        }
      },
    },
  }
</script>
