<template>
  <div class="row-spaced">
    <v-dialog/>
    <div class="twothird form">
      <h1 class="form__header">
        {{side.toUpperCase()}} {{currency}}
      </h1>
      <div class="form__group">
        <label class="form__label" for="stellarAccount">
          Stellar Account
        </label>
        <input type="text"
               class="text-input"
               :disabled="requestingSwap"
               v-model="stellarAccount"
               id="stellarAccount"
               name="stellarAccount"
        >
      </div>
      <div class="form__group">
        <label class="form__label" for="cryptoAddress">
          {{ currency }} Address
          <button class="button button--link" @click="loadFromMetamaskClicked">
            Load from Metamask
          </button>
        </label>
        <input type="text"
               class="text-input"
               :disabled="requestingSwap"
               v-model="cryptoAddress"
               id="cryptoAddress"
               name="cryptoAddress"
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
  import web3 from '../util/web3'
  import SwapSpecs from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'prepare-deposit',
    props: {
      currency: String,
      side: String,
    },
    data() {
      const {swapSizes} = SwapSpecs[this.currency]
      return {
        swapSize: swapSizes[0],
        stellarAccount: null,
        cryptoAddress: null,
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
        const address = (await web3.eth.getAccounts())[0]
        if (address === undefined) {
          return this.$modal.show('dialog', {
            title: 'Metamask',
            text: 'Please unlock your Metamask to use your Ethereum account.',
          })
        }
        this.cryptoAddress = address
      },
      async startClicked() {
        this.requestingSwap = true
        const {side, currency, swapSize, stellarAccount, cryptoAddress} = this
        try {
          const query = {}
          const swapReqData = {
            swapSize,
            stellarAccount,
            cryptoAddress,
          }
          if (side === 'withdraw') {
            const {holdingKeys} = this.swapSpec.makeHoldingKeys()
            let {preimage} = this.swapSpec.makeHashlock()
            preimage = preimage.toString('hex')
            const holdingAccount = holdingKeys.publicKey()
            const holdingSecret = holdingKeys.secret()
            Object.assign(swapReqData, {holdingAccount})
            Object.assign(query, {holdingSecret, preimage})
          }
          const {data: {swapReqId}} = await this.$client.post(`swap/${currency}/${side}`, swapReqData)
          query.swapReqId = swapReqId
          this.$router.push({
            name: 'complete-swap',
            params: {side, currency},
            query,
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
