<template>
  <div class="row justify-center">
    <v-dialog/>
    <div class="full col form">
      <h1 class="form__header">
        CONVERT
        {{side === 'deposit' ? currency : 'XLM'}}
        <icon class="form__header__icon" name="long-arrow-right" scale="2"/>
        {{side === 'deposit' ? 'XLM' : currency}}
      </h1>
      <div class="form__group">
        <label class="form__label" for="stellarAccount">
          Stellar Account ID
          <a
            class="button button--link"
            v-if="side === 'deposit'"
            target="_blank"
            href="https://stellarterm.com/#signup">
              Don't have an account?
          </a>
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
          :xlmPerUnit="xlmPerUnit"
          :selectedSize.sync="swapSize"
        />
      </div>
      <div class="form__submit">
        <button class="button button--big button--normal" @click="startClicked" :disabled="requestingSwap">
          START
        </button>
        <p class="form__subtext">
          Pressing START does not yet move your funds.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
  import web3 from '../util/web3'
  import SwapSpecs from '../../../lib/swapSpecs.mjs'
  import {getAssetPrice} from '../util/prices.mjs'

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
        xlmPerUnit: null,
      }
    },
    mounted() {
      this.populateXlmPerUnit()
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
      async populateXlmPerUnit() {
        const {currency} = this
        this.xlmPerUnit = await getAssetPrice({currency})
      },
      async loadFromMetamaskClicked() {
        this.cryptoAddress = await this.loadEthAddressFromMetamask()
      },
      async loadEthAddressFromMetamask() {
        const address = (await web3.eth.getAccounts())[0]
        if (address === undefined) {
          this.$modal.show('dialog', {
            title: 'Metamask',
            text: 'Please unlock your Metamask to use your Ethereum account.',
          })
          return null
        }
        return address
      },
      async startClicked() {
        const addr = await this.loadEthAddressFromMetamask()
        if (addr === null) {
          return
        }
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
