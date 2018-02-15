<template>
  <div class="row-spaced">
    <v-dialog/>
    <div class="twothird form">
      <h1 class="form__header">
        WITHDRAW {{currency}}
      </h1>
      <div class="form__group">
        <label class="form__label" for="withdrawerAccount">
          Stellar Account
        </label>
        <input type="text"
               class="text-input"
               :disabled="requestingSwap"
               v-model="withdrawerAccount"
               id="withdrawerAccount"
               name="withdrawerAccount">
      </div>
      <div class="form__group">
        <span class="form__label">
          <label for="withdrawerCryptoAddr">
            {{ currency }} Address
          </label>
          <button class="button button--link" @click="loadFromMetamaskClicked">
            Load from Metamask
          </button>
        </span>
        <input type="text"
               class="text-input"
               :disabled="requestingSwap"
               v-model="withdrawerCryptoAddr"
               id="withdrawerCryptoAddr"
               name="withdrawerCryptoAddr"
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
          It starts the process of looking for a withdrawor to exchange with.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
  import web3 from '../util/web3'
  import SwapSpecs from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'prepare-withdraw',
    data() {
      const {swapSizes} = SwapSpecs[this.$route.params.currency]
      return {
        currency: this.$route.params.currency,
        swapSize: swapSizes[0],
        withdrawerAccount: null,
        withdrawerCryptoAddr: null,
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
      async loadFromMetamaskClicked() {
        this.withdrawerCryptoAddr = (await web3.eth.getAccounts())[0]
      },
      async startClicked() {
        this.requestingSwap = true
        const {currency, swapSize, withdrawerAccount, withdrawerCryptoAddr} = this
        try {
          const {holdingKeys} = this.swapSpec.makeHoldingKeys()
          let {preimage} = this.swapSpec.makeHashlock()
          preimage = preimage.toString('hex')
          const holdingAccount = holdingKeys.publicKey()
          const holdingSecret = holdingKeys.secret()
          const swapReqData = {
            swapSize,
            holdingAccount,
            withdrawerAccount,
            withdrawerCryptoAddr,
          }
          const {data} = await this.$client.post(`swap/${currency}/withdraw`, swapReqData)
          const {swapReqId} = data
          this.$router.push({
            name: 'complete-withdraw',
            query: {
              swapReqId,
              holdingSecret,
              preimage,
            },
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
