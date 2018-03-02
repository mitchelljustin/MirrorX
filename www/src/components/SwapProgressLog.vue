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
        <expiry-view :expiryTimestamp='expiryTimestamps.stellar' />
      </div>
    </progress-item>
    <progress-item :status="Status.CommitOnEthereum" :currentState="currentState">
      <div slot="body">
        <p>
          {{this.textForStatus(Status.CommitOnEthereum, 'Commit', 'Committing', 'Committed')}}
          ETH on Ethereum
          {{depositorStep}}
        </p>
        <expiry-view :expiryTimestamp='expiryTimestamps.ethereum' />
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
  import BigNumber from 'bignumber.js'

  import Status from '../util/swapStatus'

  export default {
    name: 'progress-log',
    props: {
      status: Number,
      side: String,
      failed: Boolean,
      expiryTimestamps: Object,
    },
    data() {
      const now = new Date()
      return {
        now,
      }
    },
    mounted() {
      setInterval(() => {
        this.now = new Date()
      }, 1000)
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
              class="progress-log__item row align-start"
              :class="{'progress-log__item--inactive': status > currentStatus}">
            <span class="progress-log__icon row align-center justify-center">
              <icon name="check"
                    class="progress-log__icon--happy"
                    v-if="status < currentStatus || isDone"/>
              <icon name="close" class="text--angry" v-else-if="status === currentStatus && failed"/>
              <icon name="spinner" v-else-if="status === currentStatus" pulse/>
            </span>
            <div class="row">
              <p class="progress-log__rank">{{status+1}}.</p>
              <slot name="body">
              </slot>
            </div>
          </li>
        `,
      },
      'expiry-view': {
        props: ['expiryTimestamp'],
        data() {
          return {
            now: new Date(),
          }
        },
        mounted() {
          setInterval(() => {
            this.now = new Date()
          }, 1000)
        },
        template: `
          <p v-if="expiryTimestamp">
            <span class="text text--subdued" v-if="expiryTimestamp === 'refunded'">
              Refunded
            </span>
            <span class="text text--subdued" v-else-if="expiryTimestampSecondsLeft.gt(0)">
              Expires in {{expiryTimestampSecondsLeft | timeRemaining}}
            </span>
            <span class="text text--angry" v-else>
              Expired
            </span>
          </p>
        `,
        computed: {
          expiryTimestampSecondsLeft() {
            const {expiryTimestamp} = this
            if (!expiryTimestamp) {
              throw new Error(`No expiry timestamp`)
            }
            const nowSeconds = Math.round(this.now.getTime() / 1000)
            return BigNumber(expiryTimestamp).minus(nowSeconds)
          },
        },
        filters: {
          timeRemaining(totalSeconds) {
            const totalSecondsLeft = BigNumber(totalSeconds)
            const minutesLeft = totalSecondsLeft.idiv(60)
            const secondsLeft = totalSecondsLeft.mod(60)
            return `${minutesLeft}m${secondsLeft}s`
          },
        },
      },
    },
  }
</script>
