<template>
  <div>
    <v-dialog />
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
            <button class="big" @click="startClicked" :disabled="swapStatus !== 'notStarted'">
              <span v-if="swapStatus === 'notStarted'">
                START
              </span>
              <span v-if="swapStatus === 'waitingForMatch'">
                MATCHING..
              </span>
              <span v-if="swapStatus === 'waitingForHoldingTx'">
                MATCHED..
              </span>
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
  import supportedCurrencies from '../../../lib/supportedCurrencies.mjs'

  export default {
    name: 'prepare-swap',
    data() {
      const {swapSizes} = supportedCurrencies[this.$route.params.currency]
      return {
        currency: this.$route.params.currency,
        action: this.$route.params.action,
        amount: swapSizes[0],
        stellarAccount: '',
        swapStatus: 'notStarted',
        swapSizes,
      }
    },
    beforeRouteEnter(to, from, next) {
      if (to.params.action !== 'withdraw' && to.params.action !== 'deposit') {
        return next(false)
      }
      if (supportedCurrencies[to.params.currency] === undefined) {
        return next(false)
      }
      next()
    },
    methods: {
      startClicked() {
        this.startSwap()
      },

      async startSwap() {
        this.swapStatus = 'waitingForMatch'
        const {currency, stellarAccount, amount, action} = this
        let swapId
        try {
          const res = await this.$client.post(`swap/${currency}`, {
            stellarAccount, amount, action,
          })
          swapId = res.swapId
        } catch (e) {
          this.swapStatus = 'notStarted'
          const {response} = e
          this.$modal.show('dialog', {
            title: `HTTP ${response.status} Error`,
            text: response.data,
            buttons: [{title: 'OK'}],
          })
          return
        }
        this.swapId = swapId
        this.status = 'waitingForHoldingTx'
      },
    },
  }
</script>
