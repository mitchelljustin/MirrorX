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
      <div slot="body">
        <p>
          {{this.textForStatus(Status.CommitOnStellar, 'Commit', 'Committing', 'Committed')}}
          XLM on Stellar
          {{withdrawerStep}}
        </p>
        <p>
          <a class="button button--light button--small" href="">Refund XLM</a>
        </p>
      </div>
    </progress-item>
    <progress-item :status="Status.CommitOnEthereum" :currentState="currentState">
      <div slot="body">
        <p>
          {{this.textForStatus(Status.CommitOnEthereum, 'Commit', 'Committing', 'Committed')}}
          ETH on Ethereum
          {{depositorStep}}
        </p>
        <p>
          <a class="button button--light button--small" href="">Refund ETH</a>
        </p>
      </div>
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
              <span class="progress-log__rank">{{status+1}}.</span>
              <slot name="body">
              </slot>
            </div>
          </li>
        `,
      },
    },
  }
</script>
