<template>
  <ul class="progress-log">
    <li v-for="(_, i) in numStatuses"
        :key="i"
        class="progress-log__item"
        :class="{'progress-log__item--inactive': i > status}">
      <span class="progress-log__icon">
        <icon name="check"
              class="progress-log__icon--happy"
              v-if="i < status || isDone"/>
        <icon name="spinner" v-else-if="i === status" pulse/>
      </span>
      <span class="progress-log__description">
        {{statusDescriptionForStatus(i)}}
      </span>
    </li>
  </ul>
</template>

<script>
  import Status from '../util/swapStatus'

  export default {
    name: 'progress-log',
    props: {
      status: Number,
      side: String,
    },
    data() {
      const numStatuses = Status.Count
      return {
        numStatuses,
      }
    },
    methods: {
      textForStatus(targetStatus, incomplete, ongoing, completed) {
        if (this.status < targetStatus) {
          return incomplete
        }
        if (this.status === targetStatus) {
          return ongoing
        }
        if (this.status > targetStatus) {
          return completed
        }
      },
      statusDescriptionForStatus(status) {
        if (status === Status.RequestingSwapInfo) {
          const textRequest = this.textForStatus(status, 'Request', 'Requesting', 'Requested')
          return `1. ${textRequest} swap info`
        }
        if (status === Status.WaitingForMatch) {
          const textMatch = this.textForStatus(status, 'Match', 'Matching', 'Matched')
          return `2. ${textMatch} with counterparty`
        }
        const textCommit = this.textForStatus(status, 'Commit', 'Committing', 'Commit')
        if (status === Status.CommitOnStellar) {
          return `3. ${textCommit} XLM on Stellar ${this.withdrawerStep}`
        }
        if (status === Status.CommitOnEthereum) {
          return `4. ${textCommit} ETH on Ethereum ${this.depositorStep}`
        }
        const textClaim = this.textForStatus(status, 'Claim', 'Claiming', 'Claimed')
        if (status === Status.ClaimOnEthereum) {
          return `5. ${textClaim} ETH on Ethereum ${this.withdrawerStep}`
        }
        if (status === Status.ClaimOnStellar) {
          return `6. ${textClaim} XLM on Stellar ${this.depositorStep}`
        }
        if (status === Status.Done) {
          return `Done!`
        }
      },
    },
    computed: {
      depositorStep() {
        if (this.side === 'deposit') {
          return '(You)'
        }
        return ''
      },
      withdrawerStep() {
        if (this.side === 'withdraw') {
          return '(You)'
        }
        return ''
      },

      isDone() {
        return this.status === Status.Done
      }
    },
  }
</script>
