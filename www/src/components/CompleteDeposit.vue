<template>
  <div class="row">
    <div class="col full">
      <img src="../assets/MirrorX.png" alt="" class="logo">
      <h2>DEPOSITING</h2>
      <h1>{{ swapSize || '..' }} {{ currency }}</h1>
      <progress-log :currentStatus="status"
                    :statusDescriptions="statusDescriptions"
      />
    </div>
  </div>
</template>

<script>
  const WAITING_FOR_MATCH = 0
  const FUND_HOLDING = 1
  const COMMIT_ETH = 2
  const CLAIM_ETH = 3
  const CLAIM_HOLDING = 4

  export default {
    name: 'complete-deposit',
    data() {
      return {
        swapReqId: this.$route.query.swapReqId,
        currency: this.$route.params.currency,
        swapSize: null,
        status: WAITING_FOR_MATCH,
      }
    },
    mounted() {
      const checkMatch = async() => {
        const {currency, swapReqId} = this
        const {data} = await this.$client.get(`/swap/${currency}/match/${swapReqId}`)
        const {status, swapInfo, reqInfo} = data
        if (this.swapSize === null) {
          this.swapSize = reqInfo.swapSize
        }
        if (status === 'matched') {
          clearInterval(this.checkMatchInterval)
          this.swapInfo = swapInfo
          this.status = FUND_HOLDING
          setInterval(() => this.status += 1, 3000 + Math.random() * 4000)
        }
      }
      this.checkMatchInterval = setInterval(checkMatch, 10000)
      checkMatch()
    },
    computed: {
      statusDescriptions() {
        return [
          'Match with counterparty',
          'Commit XETH on Stellar',
          'Commit ETH on Ethereum',
          'Claim ETH on Ethereum',
          'Claim XETH on Stellar',
          'Done!'
        ]
      },
    },
  }
</script>
