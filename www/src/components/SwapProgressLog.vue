<template>
  <ul class="progress-log">
    <progress-item :status="Status.RequestingSwapInfo" :currentState="currentState">
      <p slot="body">
        {{this.textForStatus(Status.RequestingSwapInfo, 'Request', 'Requesting', 'Requested')}}
        Swap Info
      </p>
    </progress-item>
    <progress-item :status="Status.WaitingForMatch" :currentState="currentState">
      <p slot="body">
        {{this.textForStatus(Status.WaitingForMatch, 'Match', 'Matching', 'Matched')}}
        with Peer
      </p>
    </progress-item>
    <progress-item :status="Status.CommitOnStellar" :currentState="currentState">
      <p slot="body">
        {{this.textForStatus(Status.CommitOnStellar, 'Commit', 'Committing', 'Committed')}}
        XLM on Stellar
        {{withdrawerStep}}
      </p>
    </progress-item>
    <progress-item :status="Status.CommitOnEthereum" :currentState="currentState">
      <p slot="body">
        {{this.textForStatus(Status.CommitOnEthereum, 'Commit', 'Committing', 'Committed')}}
        ETH on Ethereum
        {{depositorStep}}
      </p>
    </progress-item>
    <progress-item :status="Status.ClaimOnEthereum" :currentState="currentState">
      <p slot="body">
        {{this.textForStatus(Status.ClaimOnEthereum, 'Claim', 'Claiming', 'Claimed')}}
        ETH on Ethereum
        {{withdrawerStep}}
      </p>
    </progress-item>
    <progress-item :status="Status.ClaimOnStellar" :currentState="currentState">
      <p slot="body">
        {{this.textForStatus(Status.ClaimOnStellar, 'Claim', 'Claiming', 'Claimed')}}
        XLM on Stellar
        {{depositorStep}}
      </p>
    </progress-item>
    <progress-item :status="Status.Done" :currentState="currentState">
      <p slot="body">
        Done!
      </p>
    </progress-item>
  </ul>
</template>

<script>
  import Status from '../util/swapStatus'

  export default {
    name: 'progress-log',
    props: {
      status: Number,
      side: String,
      failed: Boolean,
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
          return `2. ${textMatch} with peer`
        }
        const textCommit = this.textForStatus(status, 'Commit', 'Committing', 'Committed')
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
        return '(Peer)'
      },
      withdrawerStep() {
        if (this.side === 'withdraw') {
          return '(You)'
        }
        return '(Peer)'
      },
      currentState() {
        const {status, isDone, failed} = this
        return {status, isDone, failed}
      },
      isDone() {
        return this.status === Status.Done
      },
      Status() {
        return Status
      },
    },
    components: {
      'progress-item': {
        props: ['status', 'currentState'],
        computed: {
          currentStatus() {
            return this.currentState.status
          },
          failed() {
            return this.currentState.failed
          },
          isDone() {
            return this.currentState.isDone
          },
        },
        template: `
            <li
              class="progress-log__item"
              :class="{'progress-log__item--inactive': status > currentStatus}">
            <span class="progress-log__icon">
              <icon name="check"
                    class="progress-log__icon--happy"
                    v-if="status < currentStatus || isDone"/>
              <icon name="close" class="text--angry" v-else-if="status === currentStatus && failed"/>
              <icon name="spinner" v-else-if="status === currentStatus" pulse/>
            </span>
            <div class="progress-log__description">
              <slot name="body"></slot>
            </div>
          </li>
        `,
      },
    },
  }
</script>
