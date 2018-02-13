<template>
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
        <div class="big-info__stellar-account">
          <span v-if="withdrawerAccount !== null">
            {{ withdrawerAccount.slice(0, 8) }}...{{withdrawerAccount.slice(withdrawerAccount.length - 8)}}
          </span>
        </div>
      </div>
    </div>
    <div class="half">
      <h3>Progress</h3>
      <progress-log :currentStatus="status"
                    :statusDescriptions="statusDescriptions"
      />
    </div>
  </div>
</template>

<script>
  const {Stellar} = require('../../../lib/stellar.mjs')

  const WAITING_FOR_MATCH = 0
  const FUND_HOLDING = 1
  // const COMMIT_ETH = 2
  // const CLAIM_ETH = 3
  // const CLAIM_HOLDING = 4

  export default {
    name: 'complete-deposit',
    data() {
      return {
        swapReqId: this.$route.query.swapReqId,
        currency: this.$route.params.currency,
        holdingKeys: Stellar.Keypair.fromSecret(this.$route.query.holdingSecret),
        status: WAITING_FOR_MATCH,
        swapSize: null,
        withdrawerAccount: null,
        checkMatchInterval: null,
      }
    },
    mounted() {
      const checkMatch = async() => {
        const {currency, swapReqId} = this
        const {data} = await this.$client.get(`/swap/${currency}/match/${swapReqId}`)
        const {status, swapInfo, reqInfo} = data
        const {swapSize, withdrawerAccount} = reqInfo
        this.swapSize = swapSize
        this.withdrawerAccount = withdrawerAccount
        if (status === 'matched') {
          clearInterval(this.checkMatchInterval)
          this.swapInfo = swapInfo
          this.status = FUND_HOLDING
        }
      }
      this.checkMatchInterval = setInterval(checkMatch, 10000)
      checkMatch()
    },
    beforeRouteLeave(to, from, next) {
      if (this.checkMatchInterval !== null) {
        clearInterval(this.checkMatchInterval)
      }
      next()
    },
    computed: {
      statusDescriptions() {
        return [
          'Match with counterparty',
          'Commit XETH on Stellar (You)',
          'Commit ETH on Ethereum',
          'Claim ETH on Ethereum (You)',
          'Claim XETH on Stellar',
          'Done!',
        ]
      },
    },
  }
</script>
