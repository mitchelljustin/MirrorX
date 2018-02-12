<template>
  <div>
    <v-dialog />
    <div class="row">
      <div class="major col align-left">
        <h1>
          DEPOSIT {{currency}}
        </h1>
        <div class="form-label">
          <label for="depositorAccount">
            Stellar Account
          </label>
          <input type="text"
                 placeholder="GCQNGBNTMHDVKFY3KQ5CXBPICFUAWYLMDRCBEWWAJRWYC6VEEMEQ6NIQ"
                 :disabled="swapStarted"
                 v-model="depositorAccount"
                 id="depositorAccount"
          >
        </div>
        <div class="form-label">
          <label for="ethAddress">
            ETH Address
          </label>
          <input type="text"
                 :disabled="swapStarted"
                 placeholder="0x80022bf9c71bdcded7600c23df37eb55996d613356688d05edb2db71817a19dd"
                 v-model="ethAddress"
                 id="ethAddress"
          >
        </div>
        <div class="form-label">
          <label>
            Amount
          </label>
        </div>
        <div class="full row">
          <div class="major">
            <div class="row justify-left">
              <div class="col swapSize" v-for="(size, i) in swapSpec.swapSizes" :key="i">
                <input :checked="i === 0"
                       :id='`swapSize-${size}`'
                       :value="size"
                       :disabled="swapStarted"
                       v-model="swapSize"
                       name='swapSize'
                       type='radio'
                >
                <label :for='`swapSize-${size}`'>
                  {{ size }} {{ currency }}
                </label>
              </div>
            </div>
          </div>
          <div class="minor">
            <div class="col">
              <button class="big" @click="startClicked" :disabled="swapStarted">
                START
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="minor">
        <div class="full col">
          <h2>STATUS</h2>
          <progress-log
            :currentStatus="swapStatusIndex"
            :statusDescriptions="swapStatusDescriptions"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import SwapSpecs from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'prepare-deposit',
    data() {
      const {swapSizes} = SwapSpecs[this.$route.params.currency]
      return {
        currency: this.$route.params.currency,
        swapSize: swapSizes[0],
        depositorAccount: '',
        ethAddress: '',
        swapStatus: 'notStarted',
        swapReqId: null,
      }
    },
    beforeRouteEnter(to, from, next) {
      if (SwapSpecs[to.params.currency] === undefined) {
        return next(false)
      }
      next()
    },
    computed: {
      swapSpec() {
        return SwapSpecs[this.currency]
      },
      swapStarted() {
        return this.swapStatus !== 'notStarted'
      },
      swapStatusIndex() {
        return {
          'notStarted': -1,
          'requestingSwap': 0,
          'waitingForMatch': 1,
          'matched': 2,
        }[this.swapStatus]
      },
      swapStatusDescriptions() {
        return [
          'Sending swap request..',
          'Matching..',
          'Waiting for withdrawer..',
        ]
      },
      swapStatusMessage() {
        return {
          'requestingSwap': 'Sending swap request..',
          'waitingForMatch': 'Matching..',
          'matched': 'Waiting for withdrawer..',
        }[this.swapStatus]
      },
    },
    methods: {
      async startClicked() {
        this.swapStatus = 'requestingSwap'
        const {currency, swapSize, depositorAccount} = this
        try {
          const swapReqData = {
            swapSize,
            depositorAccount,
          }
          const {data} = await this.$client.post(`swap/${currency}/deposit`, swapReqData)
          const {swapReqId} = data
          console.log(`Posted swap request: ${swapReqId}`)
          this.swapReqId = swapReqId
        } catch (err) {
          this.swapStatus = 'notStarted'
          const {response} = err
          this.$modal.show('dialog', {
            title: `HTTP ${response.status} Error`,
            text: response.data,
            buttons: [{title: 'OK'}],
          })
          return
        }
        this.swapStatus = 'waitingForMatch'
        this._startPollingForMatch()
      },
      _startPollingForMatch() {
        setInterval(async() => {
          const {currency, swapReqId} = this
          const {data} = await this.$client.get(`swap/${currency}/match/${swapReqId}`)
          const {status} = data
          if (status === 'matched') {
            this.swapStatus = 'matched'
          }
        }, 2500)
      },
    },
  }
</script>
