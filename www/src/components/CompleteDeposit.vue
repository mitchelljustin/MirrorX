<template>
  <div class="full row-spaced">
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
          TO
        </div>
        <div class="big-info__stellar-account">
          {{ depositorAccount.slice(0, 8) }}...{{depositorAccount.slice(depositorAccount.length - 8)}}
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
        status: WAITING_FOR_MATCH,
        swapSize: null,
        depositorAccount: null,
        checkMatchInterval: null,
      }
    },
    mounted() {
      const checkMatch = async () => {
        const {currency, swapReqId} = this
        const {data} = await this.$client.get(`/swap/${currency}/match/${swapReqId}`)
        const {status, swapInfo, reqInfo} = data
        const {swapSize, depositorAccount} = reqInfo
        this.swapSize = swapSize
        this.depositorAccount = depositorAccount
        if (status === 'matched') {
          clearInterval(this.checkMatchInterval)
          this.swapInfo = swapInfo
          this.status = FUND_HOLDING
        }
      }
      this.checkMatchInterval = setInterval(checkMatch, 10000)
      checkMatch()
    },
    beforeRouteLeave() {
      if (this.checkMatchInterval !== null) {
        clearInterval(this.checkMatchInterval)
      }
    },
    computed: {
      statusDescriptions() {
        return [
          'Match with counterparty',
          'Commit XETH on Stellar',
          'Commit ETH on Ethereum (You)',
          'Claim ETH on Ethereum',
          'Claim XETH on Stellar (You)',
          'Done!',
        ]
      },
    },
  }
</script>
