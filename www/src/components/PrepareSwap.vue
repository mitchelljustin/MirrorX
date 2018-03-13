<template>
  <div class="row justify-center">
    <div class="full col form">
      <h1 class="row align-center">
        CONVERT
        {{leftCurrency}}
        <icon class="form__header__icon" name="long-arrow-right" scale="2"/>
        {{rightCurrency}}
      </h1>
      <p>
        MirrorX will match you with a Peer that wants to do the opposite conversion
        <span class="inline-row align-center">
          ({{rightCurrency}}
          <icon class="form__header__icon" name="long-arrow-right" />
          {{leftCurrency}}).
        </span>
      </p>
      <p>
        Enter your Stellar Account ID and Ethereum address so your Peer knows who to transact with.
      </p>
      <div class="form__group">
        <label class="form__label" for="stellarAccount">
          Stellar Account ID (Public Key)
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
          Ethereum Address
          <button class="button button--link" @click="loadFromMetamaskClicked">
            Load from Metamask
          </button>
        </label>
        <input type="text"
               class="text-input"
               v-model="cryptoAddress"
               id="cryptoAddress"
               name="cryptoAddress"
        >
      </div>
      <div class="form__group">
        <label class="form__label">
          Amount
          <small v-if="xlmPerUnit">
            (Price: {{xlmPerUnit.toFixed(2)}} XLM per 1 {{currency}})
          </small>
        </label>
        <swap-size-select
          :currency="currency"
          :disabled="requestingSwap"
          :xlmPerUnit="xlmPerUnit"
          :selectedSize.sync="swapSize"
        />
        <p>
          The price may fluctuate slightly between now and when coins are exchanged.
        </p>
      </div>
      <div class="form__submit">
        <button class="button button--big button--normal" @click="startClicked" :disabled="requestingSwap">
          START
        </button>
      </div>
    </div>
  </div>
</template>

<script>
  import web3 from '../util/web3'
  import {allSwapSizes, currencySupported, swapSpecs} from '../../../lib/swapSpecs.mjs'
  import {loadEthXlmPrice} from '../util/prices.mjs'

  export default {
    name: 'prepare-deposit',
    props: {
      currency: String,
      side: String,
    },
    data() {
      return {
        swapSize: allSwapSizes[0],
        stellarAccount: null,
        cryptoAddress: null,
        requestingSwap: false,
        xlmPerUnit: null,
      }
    },
    mounted() {
      if (this.currency === 'ETH') {
        this.loadEthPrice()
        this.loadAddressFromMetamask()
      }
    },
    beforeRouteEnter(to, from, next) {
      if (!currencySupported(to.params.currency)) {
        return next(false)
      }
      next()
    },
    computed: {
      swapSpec() {
        return swapSpecs[this.currency]
      },
      leftCurrency() {
        const {side, currency} = this
        return side === 'depositor' ? 'XLM' : currency
      },
      rightCurrency() {
        const {side, currency} = this
        return side === 'depositor' ? currency : 'XLM'
      },
    },
    methods: {
      async loadAddressFromMetamask() {
        if (web3 === null) {
          this.$modal.show('dialog', {
            title: '<strong class="text--angry">Missing Metamask</strong>',
            text: `
              <p>
                  You need the Metamask Extension to interact with Ethereum.
                  <a class="button button--small button--light" href="https://metamask.io">Install Metamask</a>
              </p>
            `,
          })
          this.cryptoAddress = null
        }
        const address = (await web3.eth.getAccounts())[0]
        if (address === undefined) {
          this.$modal.show('dialog', {
            title: 'Metamask',
            text: 'Please unlock your Metamask to use your Ethereum account.',
          })
          this.cryptoAddress = null
        }
        this.cryptoAddress = address
      },
      async loadFromMetamaskClicked() {
        this.loadAddressFromMetamask()
      },
      async loadEthPrice() {
        this.xlmPerUnit = await loadEthXlmPrice()
      },
      async startSwap() {
        await this.loadAddressFromMetamask()
        const {side, currency, swapSize, stellarAccount, cryptoAddress} = this
        if (!cryptoAddress) {
          return
        }
        if (!await this.swapSpec.stellarAccountExists(stellarAccount)) {
          throw new Error(`Stellar account is not funded with Lumens.`)
        }
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
      },
      startClicked() {
        this.requestingSwap = true
        this.startSwap()
          .catch(this.$displayError.bind(this))
          .finally(() => {
            this.requestingSwap = false
          })
      },
    },
  }
</script>
