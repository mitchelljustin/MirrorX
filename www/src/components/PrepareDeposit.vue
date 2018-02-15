<template>
  <div class="row-spaced">
    <v-dialog/>
    <div class="twothird form">
      <h1 class="form__header">
        DEPOSIT {{currency}}
      </h1>
      <div class="form__group">
        <label class="form__label" for="depositorAccount">
          Stellar Account
        </label>
        <input type="text"
               class="text-input"
               :disabled="requestingSwap"
               v-model="depositorAccount"
               id="depositorAccount"
               name="depositorAccount"
        >
      </div>
      <div class="form__group">
        <label class="form__label" for="depositorCryptoAddr">
          {{ currency }} Address
        </label>
        <input type="text"
               class="text-input"
               :disabled="requestingSwap"
               v-model="depositorCryptoAddr"
               id="depositorCryptoAddr"
               name="depositorCryptoAddr"
        >
      </div>
      <div class="form__group">
        <label class="form__label">
          Amount
        </label>
        <swap-size-select
          :currency="currency"
          :swapSizes="swapSpec.swapSizes"
          :disabled="requestingSwap"
          :selectedSize.sync="swapSize"
          />
      </div>
      <button class="button form__submit" @click="startClicked" :disabled="requestingSwap">
        START
      </button>
    </div>
    <div class="onethird">
      <div class="pitch-box pitch-box--subdued">
        <h2 class="pitch-box__header">
          INFO
        </h2>
        <p class="pitch-box__text">
          Clicking START does not yet move your money.
          It starts the process of looking for a withdrawer to exchange with.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
  import SwapSpecs from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'prepare-deposit',
    data() {
      const {swapSizes} = SwapSpecs[this.$route.params.currency]
      return {
        currency: this.$route.params.currency,
        swapSize: swapSizes[0],
        depositorAccount: null,
        depositorCryptoAddr: null,
        requestingSwap: false,
      }
    },
    beforeRouteEnter(to, from, next) {
      if (SwapSpecs[to.params.currency] === undefined) {
        return next(false)
      }
      next()
    },
    computed: {
      swapSpec() {
        return SwapSpecs[this.currency]
      },
    },
    methods: {
      async startClicked() {
        this.requestingSwap = true
        const {currency, swapSize, depositorAccount, depositorCryptoAddr} = this
        try {
          const swapReqData = {
            swapSize,
            depositorAccount,
            depositorCryptoAddr,
          }
          const {data} = await this.$client.post(`swap/${currency}/deposit`, swapReqData)
          const {swapReqId} = data
          this.$router.push({
            name: 'complete-deposit',
            query: {swapReqId},
          })
        } catch (err) {
          const {response} = err
          let title, text
          if (response !== undefined) {
            title = `HTTP ${response.status} Error`
            text = response.data
          } else {
            title = 'Error'
            text = err.message
          }
          this.$modal.show('dialog', {
            title,
            text,
            buttons: [{title: 'OK'}],
          })
        } finally {
          this.requestingSwap = false
        }
      },
    },
  }
</script>
