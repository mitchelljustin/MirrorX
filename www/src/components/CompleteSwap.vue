<template>
  <div class="full row-spaced">
    <v-dialog/>
    <sign-transaction-dialog modalName="commit-on-stellar" network="stellar">
      <span slot="title">
        COMMIT ON STELLAR
      </span>
      <div slot="description">
        <p>
          MirrorX needs your signature to commit your ETH tokens on Stellar.
        </p>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="commit-on-ethereum" network="ethereum">
      <span slot="title">
        COMMIT ON ETHEREUM
      </span>
      <div slot="description">
        <p>
          MirrorX wants to commit your Ether on Ethereum.
        </p>
      </div>
    </sign-transaction-dialog>
    <div class="half">
      <div class="big-info">
        <div class="big-info__header">
          {{ side.toUpperCase() }}
        </div>
        <div v-if="reqInfo" class="big-info__swap-size">
          {{ swapSize || '..' }} {{ currency }}
        </div>
        <div class="big-info__label">
          {{ this.side === 'withdrawer' ? 'TO' : 'FROM' }}
        </div>
        <div class="big-info__account">
          <span v-if="reqInfo">
            {{ reqInfo.cryptoAddress }}
          </span>
          <span v-else>
            ..
          </span>
        </div>
        <div class="big-info__label">
          {{ this.side === 'withdrawer' ? 'FROM' : 'TO' }}
        </div>
        <div class="big-info__account">
          <span v-if="reqInfo">
            {{myStellarAccountTrunc}}
          </span>
          <span v-else>
            ..
          </span>
        </div>
      </div>
    </div>
    <div class="half">
      <h3>Progress</h3>
      <swap-progress-log :status="status" :side="side"/>
    </div>
  </div>
</template>

<script>
  import SwapSpecs from '../../../lib/swapSpecs.mjs'
  import {Stellar} from '../../../lib/stellar.mjs'
  import {createHash} from 'crypto'

  import Status from '../util/swapStatus'

  export default {
    name: 'complete-swap',
    props: {
      currency: String,
      side: String,
      swapReqId: String,
      holdingSecret: String,
      preimage: String,
    },
    data() {
      let hashlock = null
      if (this.preimage !== undefined) {
        const h = createHash('sha256')
        h.update(this.preimage)
        hashlock = h.digest()
      }
      return {
        status: Status.RequestingSwapInfo,
        reqInfo: null,
        matchedInfo: null,
        hashlock,
      }
    },
    mounted() {
      this.checkMatch()
    },
    beforeRouteLeave(to, from, next) {
      if (this.checkMatchTimeout !== null) {
        clearInterval(this.checkMatchTimeout)
      }
      next()
    },
    methods: {
      transitionDepositor({newStatus, oldStatus}) {
        if (newStatus === Status.CommitOnStellar) {
          this.waitForHoldingTx()
        } else if (newStatus === Status.CommitOnEthereum) {
          this.findExistingEthereumCommit()
          this.signEthereumCommit()
          this.waitForEthereumCommit()
        } else if (newStatus === Status.ClaimOnEthereum) {
          this.$modal.hide('commit-on-ethereum')
        }
      },
      transitionWithdrawer({newStatus, oldStatus}) {
        if (newStatus === Status.CommitOnStellar) {
          this.signStellarCommit()
          this.waitForHoldingTx()
        } else if (newStatus === Status.CommitOnEthereum) {
          this.$modal.hide('commit-on-stellar')
          this.waitForEthereumCommit()
        } else if (newStatus === Status.ClaimOnEthereum) {

        }
      },
      async checkMatch() {
        const {currency, swapReqId} = this
        const {data: {status, matchedInfo, reqInfo}} =
          await this.$client.get(`/swap/${currency}/match/${swapReqId}`)
        this.status = Status.WaitingForMatch
        Object.assign(this, {reqInfo, matchedInfo})
        if (status !== 'matched') {
          this.checkMatchTimeout = setTimeout(this.checkMatch.bind(this), 5 * 1000)
          return
        }
        const {holdingAccount} = this.withdrawer
        Object.assign(this, {holdingAccount})
        this.checkHoldingTx()
      },
      async checkHoldingTx() {
        let holdingTxInfo
        const {stellarAccount: withdrawerAccount} = this.withdrawer
        const {stellarAccount: depositorAccount} = this.depositor
        const {
          holdingAccount,
          swapSize,
        } = this
        try {
          holdingTxInfo = await this.swapSpec.findHoldingTx({
            swapSize,
            withdrawerAccount,
            depositorAccount,
            holdingAccount,
            wait: false,
          })
        } catch (e) {
          this.$modal.show('dialog', {
            title: 'Error',
            text: JSON.stringify(e),
          })
          return
        }
        if (!holdingTxInfo) {
          this.status = Status.CommitOnStellar
        } else {
          const {hashlock} = holdingTxInfo
          Object.assign(this, {hashlock})
          this.findExistingEthereumCommit()
        }
      },
      async waitForHoldingTx() {
        const {
          holdingAccount,
          withdrawer: {stellarAccount: withdrawerAccount},
          depositor: {stellarAccount: depositorAccount},
          swapSize,
        } = this
        const {hashlock} = await this.swapSpec.findHoldingTx({
          withdrawerAccount, swapSize, holdingAccount, depositorAccount, wait: true,
        })
        console.log(`Hashlock: ${hashlock.toString('hex')}`)
        Object.assign(this, {hashlock})
        this.findExistingEthereumCommit()
      },
      async signStellarCommit() {
        const {
          hashlock,
          swapSize,
          holdingAccount,
          depositor: {stellarAccount: depositorAccount},
          withdrawer: {stellarAccount: withdrawerAccount},
        } = this
        const {holdingTx} = await this.swapSpec.genFundHoldingTx({
          hashlock,
          swapSize,
          holdingAccount,
          depositorAccount,
          withdrawerAccount,
        })
        holdingTx.sign(this.holdingKeys)
        const envelope = holdingTx.toEnvelope()
        const envelopeXdr = envelope.toXDR('base64')
        this.$modal.show('commit-on-stellar', {envelopeXdr})
      },
      signEthereumCommit() {
        const {
          hashlock,
          swapSize,
          withdrawer: {cryptoAddress: withdrawerEthAddress},
          depositor: {cryptoAddress: depositorEthAddress},
        } = this

        const {funcName, params} = this.swapSpec.commitEthereumParams({
          swapSize, hashlock, withdrawerEthAddress, depositorEthAddress,
        })
        this.$modal.show('commit-on-ethereum', {funcName, params})
      },
      async findExistingEthereumCommit() {
        const {
          hashlock,
          swapSize,
          withdrawer: {cryptoAddress: withdrawerEthAddress},
        } = this
        const eventLog = await this.swapSpec.findEtherCommitment({
          hashlock, swapSize, withdrawerEthAddress, wait: false,
        })
        if (eventLog === null) {
          this.status = Status.CommitOnEthereum
        } else {
          this.status = Status.ClaimOnEthereum
        }
      },
      async waitForEthereumCommit() {
        const {
          hashlock,
          swapSize,
          withdrawer: {cryptoAddress: withdrawerEthAddress},
        } = this
        await this.swapSpec.findEtherCommitment({
          hashlock, swapSize, withdrawerEthAddress, wait: true,
        })
        this.status = Status.ClaimOnEthereum
      },
    },
    computed: {
      swapSpec() {
        return SwapSpecs[this.currency]
      },
      swapSize() {
        return (this.reqInfo || {}).swapSize
      },
      myStellarAccountTrunc() {
        const {reqInfo: {stellarAccount: account}} = this
        return `${account.slice(0, 12)}...${account.slice(account.length - 12)}`
      },
      depositor() {
        if (this.side === 'withdraw') {
          return this.matchedInfo || {}
        } else {
          return this.reqInfo || {}
        }
      },
      withdrawer() {
        if (this.side === 'withdraw') {
          return this.reqInfo || {}
        } else {
          return this.matchedInfo || {}
        }
      },
      holdingKeys() {
        if (this.holdingSecret !== undefined) {
          return Stellar.Keypair.fromSecret(this.holdingSecret)
        }
        return Stellar.Keypair.fromPublicKey(this.holdingAccount)
      },
    },
    watch: {
      status(newStatus, oldStatus) {
        if (newStatus === oldStatus) {
          return
        }
        console.log(`${this.side} status: ${oldStatus} -> ${newStatus}`)
        if (this.side === 'withdraw') {
          this.transitionWithdrawer({newStatus, oldStatus})
        } else {
          this.transitionDepositor({newStatus, oldStatus})
        }
      },
    },
  }
</script>
