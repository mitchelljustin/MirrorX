<template>
  <div class="full row">
    <v-dialog/>
    <sign-transaction-dialog modalName="commit-on-stellar" network="stellar">
      <span slot="title">
        COMMIT XLM
      </span>
      <div slot="description">
        <p>
          Please sign this transaction to commit your Stellar Lumens.
        </p>
        <strong>
          NOTE: Beyond this point you are committed to the swap.
          It cannot be reversed unless it expires before your Peer claims your Stellar Lumens.
        </strong>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="commit-on-ethereum" network="ethereum">
      <span slot="title">
        COMMIT ETH
      </span>
      <div slot="description">
        <p>
          Please approve the contract call in Metamask to commit your Ether.
        </p>
        <strong>
          NOTE: Beyond this point you are committed to the swap.
          It cannot be reversed unless it expires before your Peer claims your Ether.
        </strong>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="claim-on-ethereum" network="ethereum">
      <span slot="title">
        CLAIM ETH
      </span>
      <div slot="description">
        <p>
          Please approve the contract call in Metamask to claim your Ether.
        </p>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="claim-on-stellar" network="stellar">
      <span slot="title">
        CLAIM XLM
      </span>
      <div slot="description">
        <p>
          Please sign this transaction to claim your Stellar Lumens.
        </p>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="refund-on-stellar" network="stellar">
      <span slot="title">
        REFUND XLM
      </span>
      <div slot="description">
        <p>
          The swap has been cancelled: either you or your Peer took too long and the commitments expired.
          Please sign this transaction to refund your Stellar Lumens.
        </p>
      </div>
    </sign-transaction-dialog>
    <div class="big-info half row">
      <div class="big-info__header">
        SWAPPING
      </div>
      <span v-if="reqInfo" class="big-info__subheader">
          <span v-if="isWithdrawer">
            <price :size="swapSize" :xlmPerUnit="xlmPerUnit"/> XLM FOR
          </span>
          <span>
            {{ swapSize || '..' }} {{ currency }}
          </span>
          <span v-if="isDepositor">
            FOR <price :size="swapSize" :xlmPerUnit="xlmPerUnit"/> XLM
          </span>
        </span>
      <h3 class="big-info__section">
        {{ this.isWithdrawer ? 'TO' : 'FROM' }}:
      </h3>
      <div class="big-info__data">
          <span v-if="reqInfo">
            {{ reqInfo.cryptoAddress }}
          </span>
        <span v-else>
            ..
          </span>
      </div>
      <h3 class="big-info__section">
        {{ this.isWithdrawer ? 'FROM' : 'TO' }}:
      </h3>
      <div class="big-info__data">
          <span v-if="reqInfo">
            {{myStellarAccountTrunc}}
          </span>
        <span v-else>
            ..
          </span>
      </div>
    </div>
    <div class="half col">
      <h3>Progress</h3>
      <swap-progress-log
        :refundExpiry="refundExpiry"
        :failed="failed"
        :status="status"
        :side="side"/>
    </div>
  </div>
</template>

<script>
  import BigNumber from 'bignumber.js'
  import Web3 from '../util/web3'
  import SwapSpecs from '../../../lib/swapSpecs.mjs'
  import {Stellar} from '../../../lib/stellar.mjs'
  import {createHash} from 'crypto'

  import Status from '../util/swapStatus'
  import {getAssetPrice} from '../util/prices.mjs'

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
      if (this.preimage) {
        const h = createHash('sha256')
        h.update(Buffer.from(this.preimage, 'hex'))
        hashlock = h.digest()
        console.log(`Hashlock=${hashlock.toString('hex')}, preimage=${this.preimage} `)
      }
      return {
        status: null,
        reqInfo: null,
        matchedInfo: null,
        preimageBuf: this.preimage || null,
        xlmPerUnit: null,
        failed: false,
        refundTx: null,
        refundExpiry: {},
        checkExpiryInterval: null,
        hashlock,
      }
    },
    mounted() {
      this.populateXlmPerUnit()
      this.status = Status.RequestingSwapInfo
      this.checkExpiryInterval = setInterval(this.checkExpiry.bind(this), 1000)
    },
    beforeRouteLeave(to, from, next) {
      if (this.checkMatchTimeout !== null) {
        clearInterval(this.checkMatchTimeout)
      }
      if (this.checkExpiryInterval !== null) {
        clearInterval(this.checkExpiryInterval)
      }
      next()
    },
    methods: {
      async populateXlmPerUnit() {
        const {side, currency} = this
        this.xlmPerUnit = await getAssetPrice({side, currency})
      },
      async requestSwapInfo() {
        const {currency, swapReqId} = this
        const {data: {status, matchedInfo, reqInfo}} =
          await this.$client.get(`/swap/${currency}/match/${swapReqId}`)
        Object.assign(this, {reqInfo, matchedInfo})
        if (status !== 'matched') {
          this.status = Status.WaitingForMatch
          this.checkMatchTimeout = setTimeout(this.requestSwapInfo.bind(this), 5 * 1000)
          return
        }
        const {holdingAccount} = this.withdrawer
        Object.assign(this, {holdingAccount})
        this.status = Status.CommitOnStellar
      },
      displayError(e) {
        this.$modal.hide('commit-on-stellar')
        this.$modal.hide('commit-on-ethereum')
        this.$modal.hide('claim-on-stellar')
        this.$modal.hide('claim-on-ethereum')
        this.$modal.show('dialog', {
          title: e.title || 'Error',
          text: e.message || JSON.stringify(e),
        })
      },
      async findHoldingTx({wait}) {
        const {
          swapSize,
          holdingAccount,
          withdrawer: {stellarAccount: withdrawerAccount},
          depositor: {stellarAccount: depositorAccount},
        } = this
        try {
          return await this.swapSpec.findStellarHoldingTx({
            swapSize,
            withdrawerAccount,
            depositorAccount,
            holdingAccount,
            wait,
          })
        } catch (e) {
          this.displayError(e)
          throw e
        }
      },
      async findStellarCommitment() {
        let holdingTxInfo = await this.findHoldingTx({wait: false})
        if (!holdingTxInfo) {
          if (this.isWithdrawer) {
            await this.signStellarCommitment()
          }
          holdingTxInfo = await this.findHoldingTx({wait: true})
        }
        const {hashlock, refundTxHash} = holdingTxInfo
        if (!this.hashlock) {
          Object.assign(this, {hashlock})
          console.log(`Found hashlock: ${hashlock.toString('hex')}`)
        }
        const refundTx = await this.verifyRefundTx({refundTxHash})
        if (!refundTx) {
          this.displayError({message: 'Invalid refund transaction, cannot continue swap. '})
          this.failed = true
          return
        }
        this.refundTx = refundTx
        this.refundExpiry.stellar = BigNumber(refundTx.timeBounds.minTime)
        await this.checkExpiry()
        if (!this.failed) {
          this.status = Status.CommitOnEthereum
        }
      },
      async verifyRefundTx({refundTxHash}) {
        const hash = refundTxHash.toString('hex')
        const {data: {xdr}} = await this.$client.get(`refundTx/${hash}`)
        if (xdr === null) {
          return null
        }
        return this.swapSpec.verifyStellarRefundTx({xdr, hash})
      },
      async signStellarCommitment() {
        const {
          hashlock,
          swapSize,
          holdingAccount,
          holdingKeys,
          depositor: {stellarAccount: depositorAccount},
          withdrawer: {stellarAccount: withdrawerAccount},
        } = this
        const {refundTx, holdingTx} = await this.swapSpec.genStellarCommitmentTxs({
          hashlock,
          swapSize,
          holdingAccount,
          depositorAccount,
          withdrawerAccount,
        })
        holdingTx.sign(holdingKeys)
        this.refundTx = refundTx
        await this.uploadRefundXdr()
        const envelopeXdr = holdingTx.toEnvelope().toXDR('base64')
        this.$modal.show('commit-on-stellar', {envelopeXdr})
      },
      async uploadRefundXdr() {
        const {refundTx} = this
        const xdr = refundTx.toEnvelope().toXDR('base64')
        const {data: {hash}} = await this.$client.post('refundTx', {xdr})
        console.log(`Uploaded refund xdr: ${hash}`)
      },
      async findEthereumCommitment() {
        this.$modal.hide('commit-on-stellar')
        let eventLog = await this.findPrepareSwapCall({wait: false})
        if (!eventLog) {
          if (this.isDepositor) {
            this.signEthereumCommit()
          }
          eventLog = await this.findPrepareSwapCall({wait: true})
        }
        const {expiry} = eventLog
        this.refundExpiry.ethereum = BigNumber(expiry)
        this.status = Status.ClaimOnEthereum
      },
      async checkMetamaskNetworkId() {
        const networkId = await Web3.eth.net.getId()
        const expectedNetworkId = process.env.ETHEREUM_NETWORK_ID
        if (String(expectedNetworkId) !== String(networkId)) {
          console.log(`Metamask network mismatch: ${networkId} != ${expectedNetworkId}`)
          const expectedNetwork = {1: 'Main', 4: 'Rinkeby'}[expectedNetworkId] || 'different'
          this.displayError({
            title: 'Metamask Error',
            message: `Your metamask is using the wrong network. Please switch to ${expectedNetwork} network and reload this page.`,
          })
          return false
        }
        return true
      },
      async signEthereumCommit() {
        if (!(await this.checkMetamaskNetworkId())) {
          return
        }
        const {
          hashlock,
          swapSize,
          withdrawer: {cryptoAddress: withdrawerEthAddress},
          depositor: {cryptoAddress: depositorEthAddress},
        } = this
        const {funcName, params} = this.swapSpec.prepareSwapParams({
          swapSize, hashlock, withdrawerEthAddress, depositorEthAddress,
        })
        this.$modal.show('commit-on-ethereum', {funcName, params})
      },
      async findPrepareSwapCall({wait}) {
        const {
          hashlock,
          swapSize,
          withdrawer: {cryptoAddress: withdrawerEthAddress},
        } = this
        try {
          return await this.swapSpec.findPrepareSwap({
            hashlock, swapSize, withdrawerEthAddress, wait,
          })
        } catch (e) {
          this.displayError(e)
          throw e
        }
      },
      async findEthereumClaim() {
        this.$modal.hide('commit-on-ethereum')
        let eventLog = await this.findFulfillSwapCall({wait: false})
        if (!eventLog) {
          if (this.isWithdrawer) {
            this.signEthereumClaim()
          }
          eventLog = await this.findFulfillSwapCall({wait: true})
        }
        if (!this.preimageBuf) {
          let {preimage} = eventLog
          preimage = Buffer.from(preimage.slice(2), 'hex')
          this.preimageBuf = preimage
          console.log(`Found preimage: ${preimage.toString('hex')}`)
        }
        this.status = Status.ClaimOnStellar
      },
      async findFulfillSwapCall({wait}) {
        const {hashlock} = this
        try {
          return await this.swapSpec.findFulfillSwap({
            hashlock, wait,
          })
        } catch (e) {
          this.displayError(e)
          throw e
        }
      },
      async signEthereumClaim() {
        if (!(await this.checkMetamaskNetworkId())) {
          return
        }
        const {
          preimage,
          withdrawer: {cryptoAddress: withdrawerEthAddress},
        } = this
        const {funcName, params} = this.swapSpec.fulfillSwapParams({preimage, withdrawerEthAddress})
        this.$modal.show('claim-on-ethereum', {funcName, params})
      },
      async findStellarClaim() {
        this.$modal.hide('claim-on-ethereum')
        let claimTx = await this.findStellarClaimTx({wait: false})
        if (!claimTx) {
          if (this.isDepositor) {
            await this.signStellarClaim()
          }
          claimTx = await this.findStellarClaimTx({wait: true})
        }
        this.status = Status.Done
        this.$modal.hide('claim-on-stellar')
      },
      async findStellarClaimTx({wait}) {
        const {
          holdingAccount,
          preimage,
          depositor: {stellarAccount: depositorAccount},
        } = this
        try {
          return await this.swapSpec.findStellarClaimTx({depositorAccount, holdingAccount, preimage, wait})
        } catch (e) {
          this.displayError(e)
          throw e
        }
      },
      async signStellarClaim() {
        const {
          preimageBuf: preimage,
          depositor: {stellarAccount: depositorAccount},
          holdingAccount,
        } = this
        const {claimTx} = await this.swapSpec.genStellarClaimTx({preimage, depositorAccount, holdingAccount})
        const envelopeXdr = claimTx.toEnvelope().toXDR('base64')
        this.$modal.show('claim-on-stellar', {envelopeXdr})
      },
      async refundStellar() {
        const {refundTx} = this
        if (this.isWithdrawer) {
          try {
            await this.swapSpec.submitStellarTxIfNotExists(refundTx)
          } catch (e) {
            const message = JSON.stringify(e, null, 2)
            console.error(message)
            this.displayError({message})
            return
          }
          const {
            withdrawer: {stellarAccount: withdrawerAccount},
            holdingAccount,
          } = this
          const holdingAccountExists = await this.swapSpec.stellarAccountExists(holdingAccount)
          if (holdingAccountExists) {
            const {drainHoldingTx} = await this.swapSpec.genStellarDrainHoldingTx({
              holdingAccount,
              withdrawerAccount,
              refundTx,
            })
            const envelopeXdr = drainHoldingTx.toEnvelope().toXDR('base64')
            this.$modal.show('refund-on-stellar', {envelopeXdr})
          }
        } else {
          this.displayError({
            title: 'Swap Expired',
            message: 'Unfortunately, the Stellar commitment has expired and the swap has been cancelled. ' +
            'Either you or your Peer did not complete the swap in time.',
          })
        }
      },
      async checkExpiry() {
        const {refundExpiry} = this
        const now = Math.round(new Date().getTime() / 1000)
        let expired = false
        if (refundExpiry.stellar && refundExpiry.stellar.minus(now).lte(-5)) {
          expired = true
          await this.refundStellar()
        }
        if (expired) {
          this.failed = true
          clearInterval(this.checkExpiryInterval)
        }
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
        if (this.isWithdrawer) {
          return this.matchedInfo || {}
        } else {
          return this.reqInfo || {}
        }
      },
      withdrawer() {
        if (this.isWithdrawer) {
          return this.reqInfo || {}
        } else {
          return this.matchedInfo || {}
        }
      },
      isWithdrawer() {
        return this.side === 'withdraw'
      },
      isDepositor() {
        return this.side === 'deposit'
      },
      holdingKeys() {
        if (!this.holdingSecret) {
          throw new Error('No holding secret')
        }
        return Stellar.Keypair.fromSecret(this.holdingSecret)
      },
    },
    watch: {
      status(newStatus, oldStatus) {
        if (newStatus === oldStatus) {
          return
        }
        console.log(`${this.side} status: ${oldStatus} -> ${newStatus}`)
        if (newStatus === Status.RequestingSwapInfo) {
          this.requestSwapInfo()
        } else if (newStatus === Status.CommitOnStellar) {
          this.findStellarCommitment()
        } else if (newStatus === Status.CommitOnEthereum) {
          this.findEthereumCommitment()
        } else if (newStatus === Status.ClaimOnEthereum) {
          this.findEthereumClaim()
        } else if (newStatus === Status.ClaimOnStellar) {
          this.findStellarClaim()
        } else if (newStatus === Status.Done) {
          console.log('Done!')
        }
      },
    },
    components: {
      'price': {
        props: ['size', 'xlmPerUnit'],
        template: `
            <span>
                {{(xlmPerUnit && size) ? xlmPerUnit.times(size).toFixed(2) : '??'}}
            </span>
        `,
      },
    },
  }
</script>
