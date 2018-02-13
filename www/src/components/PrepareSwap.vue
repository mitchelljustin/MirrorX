<template>
  <div>
    <v-dialog />
    <div class="row align-left">
      <div class="twothird col">
        <h1>{{action.toUpperCase()}} {{currency}}</h1>
        <div class="form-field">
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
        <div class="form-field">
          <label>
            Amount
          </label>
        </div>
        <div class="full row">
          <div class="twothird row">
            <div class="col radio-buttons" v-for="(swapSize, i) in swapSizes" :key="i">
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
          <div class="onethird">
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
      <div class="onethird col">
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
  import SwapSpecs from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'prepare-swap',
    data() {
      const {swapSizes} = SwapSpecs[this.$route.params.currency]
      return {
        currency: this.$route.params.currency,
        action: this.$route.params.action,
        swapSize: swapSizes[0],
        stellarAccount: '',
        swapStatus: 'notStarted',
      }
    },
    beforeRouteEnter(to, from, next) {
      if (to.params.action !== 'withdraw' && to.params.action !== 'deposit') {
        return next(false)
      }
      if (SwapSpecs[to.params.currency] === undefined) {
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
