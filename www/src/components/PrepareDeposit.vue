<template>
  <div class="row-spaced">
    <v-dialog/>
    <div class="twothird form">
      <h1 class="form__header">
        DEPOSIT {{currency}}
      </h1>
      <div class="form__group">
        <label for="depositorAccount">
          Stellar Account
        </label>
        <input type="text"
               placeholder="GCQNGBNTMHDVKFY3KQ5CXBPICFUAWYLMDRCBEWWAJRWYC6VEEMEQ6NIQ"
               :disabled="requestingSwap"
               v-model="depositorAccount"
               id="depositorAccount"
               name="depositorAccount"
        >
      </div>
      <div class="form__group">
        <label>
          Amount
        </label>
        <div class="radio-buttons">
          <div
            class="radio-buttons__option"
            v-for="(size, i) in swapSpec.swapSizes"
            :key="i">
            <input :checked="i === 0"
                   :id='`swapSize-${size}`'
                   :value="size"
                   :disabled="requestingSwap"
                   v-model="swapSize"
                   name='swapSize'
                   type='radio'
            >
            <label class="radio-buttons__label" :for='`swapSize-${size}`'>
              {{ size }} {{ currency }}
            </label>
          </div>
        </div>
      </div>
      <button class="form__submit" @click="startClicked" :disabled="requestingSwap">
        START
      </button>
    </div>
    <div class="onethird">
      <div class="pitch-box pitch-box--subdued">
        <h2 class="pitch-box__header">
          INFO
        </h2>
        <p class="pitch-box__text">
          MirrorX does not need your Ethereum address for a deposit.
        </p>
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
        depositorAccount: '',
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
        const {currency, swapSize, depositorAccount} = this
        try {
          const swapReqData = {
            swapSize,
            depositorAccount,
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
