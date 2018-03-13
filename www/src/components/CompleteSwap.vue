<template>
  <div class="full row">
    <v-dialog/>
    <sign-transaction-dialog modalName="commit-on-stellar" network="stellar">
      <span slot="title">
        Commit Stellar Lumens
      </span>
      <div slot="description">
        <p>
          This transaction moves your Stellar Lumens in a holding account and locks it with a secret.
        </p>
        <p>
          You can still get your Lumens back if the exchange does not complete.
        </p>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="commit-on-ethereum" network="ethereum">
      <span slot="title">
        Commit Ether
      </span>
      <div slot="description">
        <p>
          This contract call locks your Ether in the smart contract with the secret.
          Approve it in Metamask.
        </p>
        <strong>
          Beyond this point you are committed to the exchange.
          It cannot be reversed unless the Peer does not claim the Ether in time.
        </strong>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="claim-on-ethereum" network="ethereum">
      <span slot="title">
        Claim Ether
      </span>
      <div slot="description">
        <p>
          This contract call claims the Ether in the smart contract by publishing the secret.
          Approve it in Metamask.
        </p>
        <strong>
          Beyond this point you are committed to the exchange,. It cannot be reversed.
        </strong>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="claim-on-stellar" network="stellar">
      <span slot="title">
        Claim Stellar Lumens
      </span>
      <div slot="description">
        <p>
          Please sign this transaction to claim your Stellar Lumens.
        </p>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="refund-on-stellar" network="stellar">
      <span slot="title">
        Refund Stellar Lumens
      </span>
      <div slot="description">
        <p>
          The swap has been cancelled: either you or your Peer took too long and the commitments expired.
        </p>
        <p>
          Please sign this transaction to refund your Stellar Lumens back to your account.
        </p>
      </div>
    </sign-transaction-dialog>
    <sign-transaction-dialog modalName="refund-on-ethereum" network="ethereum">
      <span slot="title">
        Refund Ether
      </span>
      <div slot="description">
        <p>
          The swap has been cancelled: either you or your Peer took too long and the commitments expired.
        </p>
        <p>
          Please approve the contract call in Metamask to refund your Ether back to your address.
        </p>
      </div>
    </sign-transaction-dialog>
    <div class="big-info full col" v-if="swapExists">
      <div class="big-info__header full col align-center">
        <h2>CONVERTING</h2>
        <h1 v-if="reqInfo" class="row align-center">
          <span :style="{order: isWithdrawer ? -1 : 1}">
            {{swapSize}} XLM
          </span>
          <span class="row align-center hor-space">
            <icon class="" name="long-arrow-right" scale="2"/>
          </span>
          <span :style="{order: isWithdrawer ? 1 : -1}">
            {{(xlmPerUnit && swapSize) ? xlmPerUnit.pow(-1).times(swapSize).toFixed(4) : '..'}} {{ currency }}
          </span>
        </h1>
      </div>
      <div class="full row">
        <div class="half col">
          <h3>
            SOURCE
          </h3>
          <div class="big-info__data">
            <account-address :addressSource="reqInfo"
                             :side="side"
                             withdrawCurrency="XLM"
                             :depositCurrency="currency"
            />
          </div>
        </div>
        <div class="half col align-right">
          <h3>
            DESTINATION
          </h3>
          <div class="big-info__data">
            <account-address :addressSource="reqInfo"
                             :side="side"
                             :withdrawCurrency="currency"
                             depositCurrency="XLM"
            />
          </div>
        </div>
      </div>
    </div>
    <hr>
    <div class="full col align-center" v-if="swapExists">
      <div class="two-thirds">
        <swap-progress-log
          :currency="currency"
          :transactionLinks="transactionLinks"
          :expiryTimestamps="expiryTimestamps"
          :failed="failed"
          :status="status"
          :side="side"/>
      </div>
    </div>
    <div class="full col align-center" v-if="!swapExists">
        <div class="col two-thirds align-center">
          <h1 class="text--angry">
            Not Found
          </h1>
          <p class="text-center">
            Possibly you entered the URL wrong, or the swap existed in the past but has been completed since.
          </p>
        </div>
    </div>
  </div>
</template>

<script>
  import BigNumber from 'bignumber.js'
  import Web3 from '../util/web3'
  import {swapSpecs} from '../../../lib/swapSpecs.mjs'
  import {Stellar} from '../../../lib/stellar.mjs'
  import {createHash} from 'crypto'

  import Status from '../util/swapStatus'
  import {loadEthXlmPrice} from '../util/prices.mjs'
  import {makeEthereumLink, makeStellarLink} from '../util/links.mjs'

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
      const transactionLinks = {}
      for (const status of Object.values(Status)) {
        transactionLinks[status] = null
      }
      return {
        status: null,
        reqInfo: null,
        matchedInfo: null,
        preimageBuf: this.preimage || null,
        xlmPerUnit: null,
        failed: false,
        refundTx: null,
        swapExists: true,
        expiryTimestamps: {},
        transactionLinks,
        hashlock,
      }
    },
    async mounted() {
      await this.loadEthXlmPrice()
      this.status = Status.RequestingSwapInfo
    },
    beforeRouteLeave(to, from, next) {
      if (this.checkMatchTimeout !== null) {
        clearInterval(this.checkMatchTimeout)
      }
      next()
    },
    methods: {
      async loadEthXlmPrice() {
        this.xlmPerUnit = await loadEthXlmPrice()
      },
      async requestSwapInfo() {
        const {currency, swapReqId} = this
        let response
        try {
          response = await this.$client.get(`/swap/${currency}/match/${swapReqId}`)
        } catch (e) {
          if (!e.response || e.response.status !== 404) {
            throw e
          }
          this.swapExists = false
          return
        }
        const {data: {status, matchedInfo, reqInfo}} = response
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
      async findHoldingTx({wait}) {
        const {
          swapSize,
          holdingAccount,
          withdrawer: {stellarAccount: withdrawerAccount},
          depositor: {stellarAccount: depositorAccount},
        } = this
        return this.swapSpec.findStellarHoldingTx({
          swapSize,
          withdrawerAccount,
          depositorAccount,
          holdingAccount,
          wait,
        })
      },
      addTransactionLink({link, status}) {
        this.transactionLinks[status] = link
      },
      async findStellarCommitment() {
        await this.loadEthXlmPrice()
        let info = await this.findHoldingTx({wait: false})
        if (!info) {
          if (this.isWithdrawer) {
            await this.signStellarCommitment()
          }
          info = await this.findHoldingTx({wait: true})
        }
        const {hashlock, refundTxHash, tx} = info
        if (!this.hashlock) {
          Object.assign(this, {hashlock})
          console.log(`Found hashlock: ${hashlock.toString('hex')}`)
        }
        const refundTx = await this.verifyRefundTx({refundTxHash, holdingTx: tx})
        if (!refundTx) {
          this.failed = true
          throw new Error('Invalid refund transaction, cannot continue swap.')
        }
        this.refundTx = refundTx
        const link = makeStellarLink({id: tx.id, type: 'tx'})
        this.addTransactionLink({link, status: Status.CommitOnStellar})
        const {holdingAccount} = this
        const holdingExists = await this.swapSpec.stellarAccountExists(holdingAccount)
        if (holdingExists) {
          this.expiryTimestamps.stellar = BigNumber(refundTx.timeBounds.minTime)
          await this.checkStellarExpiry()
        } else {
          this.expiryTimestamps.stellar = 'refunded'
        }
        if (!this.failed) {
          this.status = Status.CommitOnEthereum
        }
      },
      async verifyRefundTx({refundTxHash, holdingTx}) {
        const hash = refundTxHash.toString('hex')
        const {data: {xdr}} = await this.$client.get(`refundTx/${hash}`)
        if (xdr === null) {
          return null
        }
        return this.swapSpec.verifyStellarRefundTx({xdr, hash, holdingTx})
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
        let eventLog = await this.findPrepareSwapCall({wait: false})
        if (!eventLog) {
          if (this.isDepositor) {
            this.signEthereumCommit()
          }
          eventLog = await this.findPrepareSwapCall({wait: true})
        }
        const {transactionHash, args: {expiry}} = eventLog
        const link = makeEthereumLink({id: transactionHash, type: 'tx'})
        this.addTransactionLink({link, status: Status.CommitOnEthereum})
        const refundSwap = await this.findRefundSwapCall()
        if (refundSwap) {
          this.expiryTimestamps.ethereum = 'refunded'
          this.failed = true
        } else {
          this.expiryTimestamps.ethereum = BigNumber(expiry)
          await this.checkEthereumExpiry()
        }
        if (!this.failed) {
          this.status = Status.ClaimOnEthereum
        }
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
          xlmPerUnit,
        } = this
        const {funcName, params} = this.swapSpec.prepareSwapParams({
          swapSize, hashlock, withdrawerEthAddress, depositorEthAddress, xlmPerUnit,
        })
        this.$modal.show('commit-on-ethereum', {funcName, params})
      },
      async findPrepareSwapCall({wait}) {
        const {
          hashlock,
          swapSize,
          withdrawer: {cryptoAddress: withdrawerEthAddress},
          xlmPerUnit,
        } = this
        return this.swapSpec.findPrepareSwap({
          hashlock, swapSize, withdrawerEthAddress, xlmPerUnit, wait,
        })
      },
      async findEthereumClaim() {
        let eventLog = await this.findFulfillSwapCall({wait: false})
        if (!eventLog) {
          if (this.isWithdrawer) {
            this.signEthereumClaim()
          }
          eventLog = await this.findFulfillSwapCall({wait: true})
        }
        const {args: {preimage}, transactionHash} = eventLog
        if (!this.preimageBuf) {
          const preimageBuf = Buffer.from(preimage.slice(2), 'hex')
          this.preimageBuf = preimageBuf
          console.log(`Found preimage: ${preimageBuf.toString('hex')}`)
        }
        const link = makeEthereumLink({id: transactionHash, type: 'tx'})
        this.addTransactionLink({link, status: Status.ClaimOnEthereum})
        this.status = Status.ClaimOnStellar
      },
      async findFulfillSwapCall({wait}) {
        const {hashlock} = this
        return this.swapSpec.findFulfillSwap({
          hashlock, wait,
        })
      },
      async findRefundSwapCall() {
        const {hashlock} = this
        return this.swapSpec.findRefundSwap({
          hashlock,
          wait: false,
        })
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
        let claimTx = await this.findStellarClaimTx({wait: false})
        if (!claimTx) {
          if (this.isDepositor) {
            await this.signStellarClaim()
          }
          claimTx = await this.findStellarClaimTx({wait: true})
        }
        const {txId} = claimTx
        const link = makeStellarLink({id: txId, type: 'tx'})
        this.addTransactionLink({link, status: Status.ClaimOnStellar})
        this.status = Status.Done
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
          this.$displayError(e)
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
      displayExpiryError() {
        this.$modal.show('dialog', {
          title: 'Swap Expired',
          text: 'Unfortunately, the commitments have expired and the swap has to be cancelled. ' +
          'Either you or your Peer did not complete the swap in time.',
        })
      },
      async refundStellar() {
        const {refundTx} = this
        if (this.isWithdrawer) {
          const {
            holdingAccount,
          } = this
          const holdingAccountExists = await this.swapSpec.stellarAccountExists(holdingAccount)
          if (holdingAccountExists) {
            const envelopeXdr = refundTx.toEnvelope().toXDR('base64')
            this.$modal.show('refund-on-stellar', {envelopeXdr})
          }
        }
      },
      async refundEthereum() {
        if (this.isDepositor) {
          const refundSwap = await this.findRefundSwapCall()
          if (refundSwap) {
            return
          }
          const {
            hashlock,
            depositor: {cryptoAddress: depositorEthAddress},
          } = this
          const {funcName, params} = this.swapSpec.refundSwapParams({hashlock, depositorEthAddress})
          this.$modal.show('refund-on-ethereum', {funcName, params})
        }
      },
      async checkStellarExpiry() {
        const {
          status,
          expiryTimestamps: {stellar: expiry},
        } = this
        if (status === Status.Done) {
          return
        }
        const now = new Date().getTime() / 1000
        if (!expiry) {
          throw new Error('Stellar expiry timestamp is null')
        }
        if (expiry.minus(now).gte(0)) {
          setTimeout(this.checkStellarExpiry.bind(this), 1000)
          return
        }
        this.failed = true
        await this.refundStellar()
        this.displayExpiryError()
      },
      async checkEthereumExpiry() {
        const {
          status,
          expiryTimestamps: {ethereum: expiry},
        } = this
        if (status >= Status.ClaimOnStellar) {
          return
        }
        const now = new Date().getTime() / 1000
        if (!expiry) {
          throw new Error('Ethereum expiry timestamp is null')
        }
        if (expiry.minus(now).gt(-5)) {
          setTimeout(this.checkEthereumExpiry.bind(this), 1000)
          return
        }
        this.failed = true
        await this.refundEthereum()
        this.displayExpiryError()
      },
      async finishSwap() {
        const {currency, swapReqId} = this
        await this.$client.delete(`swap/${currency}/match/${swapReqId}`)
      },
    },
    computed: {
      swapSpec() {
        return swapSpecs[this.currency]
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
          this.finishSwap()
        }
      },
      failed(newVal) {
        if (newVal) {
          this.$modal.hide('commit-on-stellar')
          this.$modal.hide('commit-on-ethereum')
          this.$modal.hide('claim-on-ethereum')
          this.$modal.hide('claim-on-stellar')
        }
      },
    },
    components: {
      'account-address': {
        props: ['addressSource', 'side', 'withdrawCurrency', 'depositCurrency'],
        template: `
          <span class="text--monospace">
            <a target="_blank" :href="addressLink">
              {{addressTrunc}}
            </a>
          </span class="text--monospace">
        `,
        computed: {
          currency() {
            const {side, withdrawCurrency, depositCurrency} = this
            return (side === 'withdraw') ? withdrawCurrency : depositCurrency
          },
          address() {
            const {addressSource, currency} = this
            if (!addressSource) {
              return null
            }
            const propName = (currency === 'XLM') ? 'stellarAccount' : 'cryptoAddress'
            return addressSource[propName]
          },
          addressTrunc() {
            const {address} = this
            if (!address) {
              return null
            }
            const {length} = address
            if (length < 45) {
              return address
            }
            return address.slice(0, 21) + '...' + address.slice(length - 21)
          },
          addressLink() {
            const {address, currency} = this
            if (!address) {
              return null
            }
            if (currency === 'XLM') {
              return makeStellarLink({id: address, type: 'account'})
            }
            if (currency === 'ETH') {
              return makeEthereumLink({id: address, type: 'address'})
            }
            throw new Error(`Currency not supported: ${currency}`)
          },
        },
      },
    },
  }
</script>
