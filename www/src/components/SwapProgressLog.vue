<template>
  <ul class="progress-log">
    <progress-item :status="Status.RequestingSwapInfo" :currentState="currentState">
      <div slot="title">
        {{this.textForStatus(Status.RequestingSwapInfo, 'Load', 'Loading', 'Loaded')}}
        Details
      </div>
    </progress-item>
    <progress-item :status="Status.WaitingForMatch" :currentState="currentState">
      <div slot="title">
        {{this.textForStatus(Status.WaitingForMatch, 'Match', 'Matching', 'Matched')}}
        with Peer
      </div>
      <div slot="description">
        Finding Peer to swap with.
        Note that this might take a while depending on how many people are using MirrorX right now.
      </div>
    </progress-item>
    <progress-item :status="Status.CommitOnStellar" :currentState="currentState">
      <div slot="title">
        {{this.textForStatus(Status.CommitOnStellar, 'Commit', 'Committing', 'Committed')}}
        XLM on Stellar
        ({{textForSide('Peer', 'You')}})
      </div>
      <div slot="description">
        {{textForSide('Peer is moving', 'Publish')}}
        XLM to a holding account and
        {{textForSide('locking', 'lock')}}
        it with a secret.
      </div>
      <div slot="details">
        <expiry-view :isDone="isDone"
                     :isInitiator="side === 'withdraw'"
                     :expiryTimestamp='expiryTimestamps.stellar'/>
        <transaction-link :links="transactionLinks"
                          :status="Status.CommitOnStellar"
        />
      </div>
    </progress-item>
    <progress-item :status="Status.CommitOnEthereum" :currentState="currentState">
      <div slot="title">
        {{this.textForStatus(Status.CommitOnEthereum, 'Commit', 'Committing', 'Committed')}}
        ETH on Ethereum
        ({{textForSide('You', 'Peer')}})
      </div>
      <div slot="description">
        {{textForSide('Move', 'Peer is moving')}}
        ETH funds to a smart contract and
        {{textForSide('lock', 'locking')}}
        it with the secret.
      </div>
      <div slot="details">
        <expiry-view :isDone="isDone"
                     :isInitiator="side === 'deposit'"
                     :expiryTimestamp='expiryTimestamps.ethereum'/>
        <transaction-link :links="transactionLinks"
                          :status="Status.CommitOnEthereum"
        />
      </div>
    </progress-item>
    <progress-item :status="Status.ClaimOnEthereum" :currentState="currentState">
      <div slot="title">
        {{this.textForStatus(Status.ClaimOnEthereum, 'Claim', 'Claiming', 'Claimed')}}
        ETH on Ethereum
        ({{textForSide('Peer', 'You')}})
      </div>
      <div slot="description">
        {{textForSide('Peer is publishing', 'Publish')}}
        the secret to unlock the ETH funds in the smart contract.
      </div>
      <div slot="details">
        <transaction-link :links="transactionLinks"
                          :status="Status.ClaimOnEthereum"
        />
      </div>
    </progress-item>
    <progress-item :status="Status.ClaimOnStellar" :currentState="currentState">
      <div slot="title">
        <p>
          {{this.textForStatus(Status.ClaimOnStellar, 'Claim', 'Claiming', 'Claimed')}}
          XLM on Stellar
          ({{textForSide('You', 'Peer')}})
        </p>
      </div>
      <div slot="details">
        <transaction-link :links="transactionLinks"
                          :status="Status.ClaimOnStellar"
        />
      </div>
      <div slot="description">
        {{textForSide('Use', 'Peer is using')}}
        the published secret to unlock the XLM funds in the holding account.
      </div>
    </progress-item>
    <progress-item :status="Status.Done" :currentState="currentState">
      <div slot="title">
        Done!
      </div>
      <div slot="description">
        <p>
          Check your {{rightCurrency}} wallet to see your coins.
        </p>
        <p class="ver-space">
          <router-link :to="{name: 'prepare-swap', params: {currency, side}}"
                       class="button button--light">
            Convert more {{leftCurrency}}
          </router-link>
          <a target="_blank"
             :href="COIN_VOTE_URL"
             class="button button--normal">
            Vote for Coins
          </a>
        </p>
      </div>
    </progress-item>
  </ul>
</template>

<script>
  import BigNumber from 'bignumber.js'

  import Status from '../util/swapStatus'
  import {COIN_VOTE_URL} from '../util/constants'

  export default {
    name: 'progress-log',
    props: {
      status: Number,
      side: String,
      currency: String,
      failed: Boolean,
      expiryTimestamps: Object,
      transactionLinks: Object,
    },
    data() {
      const now = new Date()
      return {
        now,
        COIN_VOTE_URL,
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
      textForSide(depositor, withdrawer) {
        return (this.side === 'deposit') ? depositor : withdrawer
      }
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
      leftCurrency() {
        const {side, currency} = this
        return side === 'withdraw' ? 'XLM' : currency
      },
      rightCurrency() {
        const {side, currency} = this
        return side === 'deposit' ? 'XLM' : currency
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
            <a target="_blank" class="button button--small button--light" :href="transactionLink">
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
              <p class="progress-log__rank">{{status+1}}.</p>
              <div class="col three-quarters">
                <p class="progress-log__title"><slot name="title" /></p>
                <p v-if="currentStatus === status"><slot name="description" /></p>
                <p v-if="currentStatus > status"><slot name="details" /></p>
              </div>
            </li>
        `,
      },
      'expiry-view': {
        props: ['expiryTimestamp', 'isDone', 'isInitiator'],
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
            <span class="text--subdued" v-if="expiryTimestamp === 'refunded'">
              Refunded
            </span>
            <span class="text--subdued" v-else-if="expiryTimestampSecondsLeft.gt(0)">
              Waiting for {{isInitiator ? 'Peer' : 'you'}}, {{expiryTimestampSecondsLeft | timeRemaining}} until refund
            </span>
            <span class="text--angry" v-else>
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
