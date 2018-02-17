<template>
  <ul class="progress-log">
    <li v-for="(_, i) in incompleteStatusDescriptions"
        :key="i"
        class="progress-log__item"
        :class="{'progress-log__item--inactive': i > status}">
      <span class="progress-log__icon">
        <icon name="check"
              class="progress-log__icon--happy"
              v-if="i < status || isDone"/>
        <icon name="spinner" v-else-if="i == status" pulse/>
      </span>
      <span class="progress-log__description">
        <span v-if="i < status">
          {{completedStatusDescriptions[i]}}
        </span>
        <span v-if="i == status">
          {{ongoingStatusDescriptions[i]}}
        </span>
        <span v-if="i > status">
          {{incompleteStatusDescriptions[i]}}
        </span>
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
    computed: {
      counterparty() {
        if (this.side === 'withdraw') {
          return 'depositor'
        } else {
          return 'withdrawer'
        }
      },
      depositStep() {
        if (this.side === 'deposit') {
          return '(You)'
        }
        return '(Depositor)'
      },
      withdrawStep() {
        if (this.side === 'withdraw') {
          return '(You)'
        }
        return '(Withdrawer)'
      },
      incompleteStatusDescriptions() {
        return {
          [Status.RequestingSwapInfo]: '1. Request swap info',
          [Status.WaitingForMatch]: `2. Match with ${this.counterparty}`,
          [Status.CommitOnStellar]: `3. Commit ETH tokens on Stellar ${this.withdrawStep}`,
          [Status.CommitOnEthereum]: `4. Commit ETH on Ethereum ${this.depositStep}`,
          [Status.ClaimOnEthereum]: `5. Claim ETH on Ethereum ${this.withdrawStep}`,
          [Status.ClaimOnStellar]: `6. Claim ETH tokens on Stellar ${this.depositStep}`,
          [Status.Done]: '7. Done',
        }
      },
      ongoingStatusDescriptions() {
        return {
          [Status.RequestingSwapInfo]: '1. Requesting swap info',
          [Status.WaitingForMatch]: `2. Matching with ${this.counterparty}`,
          [Status.CommitOnStellar]: `3. Committing ETH tokens on Stellar ${this.withdrawStep}`,
          [Status.CommitOnEthereum]: `4. Committing ETH on Ethereum ${this.depositStep}`,
          [Status.ClaimOnEthereum]: `5. Claiming ETH on Ethereum ${this.withdrawStep}`,
          [Status.ClaimOnStellar]: `6. Claiming ETH tokens on Stellar ${this.depositStep}`,
          [Status.Done]: '7. Done',
        }
      },
      completedStatusDescriptions() {
        return {
          [Status.RequestingSwapInfo]: '1. Requested swap info',
          [Status.WaitingForMatch]: `2. Matched with ${this.counterparty}`,
          [Status.CommitOnStellar]: `3. Committed ETH tokens on Stellar ${this.withdrawStep}`,
          [Status.CommitOnEthereum]: `4. Committed ETH on Ethereum ${this.depositStep}`,
          [Status.ClaimOnEthereum]: `5. Claimed ETH on Ethereum ${this.withdrawStep}`,
          [Status.ClaimOnStellar]: `6. Claimed ETH tokens on Stellar ${this.depositStep}`,
          [Status.Done]: '7. Done',
        }
      },
      isDone() {
        return this.status === Status.Done
      }
    },
  }
</script>
