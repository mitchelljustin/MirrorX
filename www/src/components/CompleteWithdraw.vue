<template>
  <div>
    <v-dialog />
    <sign-transaction-dialog modalName="commit-xeth" network="stellar">
      <span slot="title">
        COMMIT XETH
      </span>
      <div slot="description">
        <p>
          MirrorX needs your signature to commit your XETH on Stellar.
        </p>
      </div>
    </sign-transaction-dialog>
    <div class="full row-spaced">
      <div class="half">
        <div class="big-info">
          <div class="big-info__header">
            WITHDRAW
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
          <span v-if="withdrawerAccount !== null" class="big-info__account">
            {{ withdrawerAccount.slice(0, 8) }}...{{withdrawerAccount.slice(withdrawerAccount.length - 8)}}
          </span>
          <div class="big-info__label">
            TO
          </div>
          <div v-if="withdrawerCryptoAddr !== null" class="big-info__account">
            {{ withdrawerCryptoAddr }}
          </div>
          <div class="big-info__label">
            TRANSACTION IDS
          </div>
          <p>
            ---
          </p>
        </div>
      </div>
      <div class="half">
        <h3>Progress</h3>
        <swap-progress-log :status="status" side="withdraw"/>
      </div>
    </div>
  </div>
</template>

<script>
  /* eslint-disable no-unused-vars */
  import {COMMIT_STELLAR, WAITING_FOR_MATCH, CLAIM_ETH, CLAIM_STELLAR, COMMIT_ETH} from '../util/swapState'
  import {Stellar} from '../../../lib/stellar.mjs'
  import SwapSpecs from '../../../lib/swapSpecs.mjs'
  import Crypto from 'crypto'

  export default {
    name: 'complete-deposit',
    data() {
      return {
        swapReqId: this.$route.query.swapReqId,
        currency: this.$route.params.currency,
        holdingKeys: Stellar.Keypair.fromSecret(this.$route.query.holdingSecret),
        preimage: Buffer.from(this.$route.query.preimage, 'hex'),
        status: WAITING_FOR_MATCH,
        depositorAccount: null,
        withdrawerCryptoAddr: null,
        swapSize: null,
        withdrawerAccount: null,
        checkMatchTimeout: null,
      }
    },
    mounted() {
      this.checkMatch()
    },
    beforeRouteLeave(to, from, next) {
      if (this.checkMatchTimeout !== null) {
        clearTimeout(this.checkMatchTimeout)
      }
      next()
    },
    methods: {
      async checkMatch() {
        const {currency, swapReqId} = this
        const {data} = await this.$client.get(`/swap/${currency}/match/${swapReqId}`)
        const {status, swapInfo, reqInfo} = data
        const {swapSize, withdrawerAccount, withdrawerCryptoAddr} = reqInfo
        Object.assign(this, {swapSize, withdrawerAccount, withdrawerCryptoAddr})
        if (status === 'matched') {
          const {depositorAccount} = swapInfo
          const holdingAccount = this.holdingAccount
          Object.assign(this, {depositorAccount})
          let info
          try {
            info = await this.swapSpec.findHoldingTx({swapSize, withdrawerAccount, depositorAccount, holdingAccount, wait: false})
          } catch (e) {
            this.$modal.show('dialog', {
              title: 'Error',
              text: JSON.stringify(e),
            })
          }
          if (!info) {
            this.status = COMMIT_STELLAR
          } else {
            this.status = COMMIT_ETH
          }
        } else {
          this.checkMatchTimeout = setTimeout(this.checkMatch.bind(this), 5 * 1000)
        }
      },
      async promptCommitXethSignature() {
        const {
          hashlock,
          swapSize,
          holdingAccount,
          depositorAccount,
          withdrawerAccount,
          withdrawerCryptoAddr,
        } = this
        const {holdingTx} = await this.swapSpec.genFundHoldingTx({
          hashlock,
          swapSize,
          holdingAccount,
          depositorAccount,
          withdrawerAccount,
          withdrawerEthAddr: withdrawerCryptoAddr,
        })
        holdingTx.sign(this.holdingKeys)
        const envelope = holdingTx.toEnvelope()
        this.$modal.show('commit-xeth', {
          envelopeXdr: envelope.toXDR('base64'),
        })
        this.swapSpec.findHoldingTx({swapSize, withdrawerAccount, holdingAccount, depositorAccount, wait: true})
          .then(() => {
            this.status = COMMIT_ETH
          })
          .catch((e) => {
            this.$modal.show('dialog', {
              title: 'Error',
              text: JSON.stringify(e),
            })
          })
      },
    },
    computed: {
      swapSpec() {
        return SwapSpecs[this.currency]
      },
      holdingAccount() {
        return this.holdingKeys.publicKey()
      },
      hashlock() {
        const h = Crypto.createHash('sha256')
        h.update(this.preimage)
        return h.digest()
      },
    },
    watch: {
      status(newStatus, oldStatus) {
        console.log(`Withdraw status: ${oldStatus} -> ${newStatus}`)
        if (oldStatus === newStatus) {
          return
        }
        if (oldStatus === WAITING_FOR_MATCH && newStatus === COMMIT_STELLAR) {
          return this.promptCommitXethSignature()
        }
        if (oldStatus === COMMIT_STELLAR && newStatus === COMMIT_ETH) {
          this.$modal.hide('commit-xeth')
        }
      },
    },
  }
</script>
