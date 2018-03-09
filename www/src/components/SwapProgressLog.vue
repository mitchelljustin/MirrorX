<template>
  <ul class="progress-log">
    <progress-item :status="Status.RequestingSwapInfo" :currentState="currentState">
      <p slot="body">
        {{this.textForStatus(Status.RequestingSwapInfo, 'Load', 'Loading', 'Loaded')}}
        Details
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
          <expiry-view :isDone="isDone" :expiryTimestamp='expiryTimestamps.stellar'/>
          <transaction-link :links="transactionLinks"
                            :status="Status.CommitOnStellar"
          />
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
          <expiry-view :isDone="isDone" :expiryTimestamp='expiryTimestamps.ethereum'/>
          <transaction-link :links="transactionLinks"
                            :status="Status.CommitOnEthereum"
          />
        </p>
      </div>
    </progress-item>
    <progress-item :status="Status.ClaimOnEthereum" :currentState="currentState">
      <div slot="body">
        <p>
          {{this.textForStatus(Status.ClaimOnEthereum, 'Claim', 'Claiming', 'Claimed')}}
          ETH on Ethereum
          {{withdrawerStep}}
        </p>
        <p>
          <transaction-link :links="transactionLinks"
                            :status="Status.ClaimOnEthereum"
          />
        </p>
      </div>
    </progress-item>
    <progress-item :status="Status.ClaimOnStellar" :currentState="currentState">
      <div slot="body">
        <p>
          {{this.textForStatus(Status.ClaimOnStellar, 'Claim', 'Claiming', 'Claimed')}}
          XLM on Stellar
          {{depositorStep}}
        </p>
        <p>
          <transaction-link :links="transactionLinks"
                            :status="Status.ClaimOnStellar"
          />
        </p>
      </div>
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
      transactionLinks: Object,
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
      'transaction-link': {
        props: ['links', 'status'],
        computed: {
          transactionLink() {
            return this.links[this.status]
          },
        },
        template: `
          <span v-if="transactionLink" class="hor-space">
            <a target="_blank" :href="transactionLink">
                Transaction
            </a>
          </span>
        `,
      },
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
        props: ['expiryTimestamp', 'isDone'],
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
          <span v-if="expiryTimestamp && !isDone">
            <span class="text text--subdued" v-if="expiryTimestamp === 'refunded'">
              Refunded
            </span>
            <span class="text text--subdued" v-else-if="expiryTimestampSecondsLeft.gt(0)">
              {{expiryTimestampSecondsLeft | timeRemaining}} remaining
            </span>
            <span class="text text--angry" v-else>
              Expired
            </span>
          </span>
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
            const secondsLeftStr = secondsLeft.lt(10) ? `0${secondsLeft.toString()}` : secondsLeft.toString()
            return `${minutesLeft}m${secondsLeftStr}s`
          },
        },
      },
    },
  }
</script>
