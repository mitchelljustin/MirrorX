<template>
  <div class="full row-spaced">
    <v-dialog />
    <sign-transaction-dialog modalName="commit-eth">
      <span slot="title">
        COMMIT ETH
      </span>
      <div slot="description">
        <p>
          MirrorX needs your signature to commit your Ether on Ethereum.
        </p>
      </div>
    </sign-transaction-dialog>
    <div class="half">
      <div class="big-info">
        <div class="big-info__header">
          DEPOSIT
        </div>
        <div class="big-info__label">
          AMOUNT
        </div>
        <div class="big-info__swap-size">
          {{ swapSize || '..' }} {{ currency }}
        </div>
        <div class="big-info__label">
          FROM
        </div>
        <div v-if="depositorCryptoAddr !== null" class="big-info__account">
          {{ depositorCryptoAddr }}
        </div>
        <div class="big-info__label">
          TO
        </div>
        <div v-if="depositorAccount !== null" class="big-info__account">
          {{ depositorAccount.slice(0, 8) }}...{{depositorAccount.slice(depositorAccount.length - 8)}}
        </div>
      </div>
    </div>
    <div class="half">
      <h3>Progress</h3>
      <swap-progress-log :status="status" side="deposit"/>
    </div>
  </div>
</template>

<script>
  /* eslint-disable no-unused-vars */
  import {COMMIT_STELLAR, WAITING_FOR_MATCH, CLAIM_ETH, CLAIM_STELLAR, COMMIT_ETH} from '../util/swapState'

  import SwapSpecs from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'complete-deposit',
    data() {
      return {
        swapReqId: this.$route.query.swapReqId,
        currency: this.$route.params.currency,
        status: WAITING_FOR_MATCH,
        swapSize: null,
        depositorAccount: null,
        holdingAccount: null,
        withdrawerAccount: null,
        withdrawerCryptoAddr: null,
        depositorCryptoAddr: null,
        checkMatchTimeout: null,
      }
    },
    mounted() {
      const checkMatch = async() => {
        const {currency, swapReqId} = this
        const {data} = await this.$client.get(`/swap/${currency}/match/${swapReqId}`)
        const {status, swapInfo, reqInfo} = data
        const {swapSize, depositorAccount, depositorCryptoAddr} = reqInfo
        Object.assign(this, {swapSize, depositorAccount, depositorCryptoAddr})
        if (status === 'matched') {
          clearInterval(this.checkMatchTimeout)
          const {withdrawerAccount, holdingAccount, withdrawerCryptoAddr} = swapInfo
          Object.assign(this, {withdrawerAccount, holdingAccount, withdrawerCryptoAddr})
          this.status = COMMIT_STELLAR
        }
      }
      this.checkMatchTimeout = setInterval(checkMatch, 10000)
      checkMatch()
    },
    beforeRouteLeave(to, from, next) {
      if (this.checkMatchTimeout !== null) {
        clearInterval(this.checkMatchTimeout)
      }
      next()
    },
    methods: {
      async waitForHoldingTx() {
        const {holdingAccount, withdrawerAccount, depositorAccount, swapSize} = this
        const {hashlock} = await this.swapSpec.findHoldingTx({
          withdrawerAccount, swapSize, holdingAccount, depositorAccount, wait: true,
        })
        Object.assign(this, {hashlock})
        this.status = COMMIT_ETH
      },
    },
    computed: {
      swapSpec() {
        return SwapSpecs[this.currency]
      },
    },
    watch: {
      status(newStatus, oldStatus) {
        if (oldStatus === newStatus) {
          return
        }
        if (oldStatus === WAITING_FOR_MATCH && newStatus === COMMIT_STELLAR) {
          this.waitForHoldingTx()
        } else if (oldStatus === COMMIT_STELLAR && newStatus === COMMIT_ETH) {
          const {hashlock, withdrawerCryptoAddr} = this
          this.$modal.show('commit-eth', {
            hashlock, withdrawerCryptoAddr,
          })
        }
      },
    },
  }
</script>
