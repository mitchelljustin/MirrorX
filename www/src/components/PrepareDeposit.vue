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
                 :disabled="requestingSwap"
                 v-model="depositorAccount"
                 id="depositorAccount"
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
                       :disabled="requestingSwap"
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
              <button class="big" @click="startClicked" :disabled="requestingSwap">
                START
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="minor">
        <div class="full col">
          <p>
            Atomic Swaps
          </p>
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
        requestingSwap: false,
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
    },
    methods: {
      async startClicked() {
        this.requestingSwap = true
        const {currency, swapSize, depositorAccount} = this
        try {
          const swapReqData = {
            swapSize,
            depositorAccount,
          }
          const {data} = await this.$client.post(`swap/${currency}/deposit`, swapReqData)
          const {swapReqId} = data
          this.$router.push({
            name: 'complete-deposit',
            query: {swapReqId},
          })
        } catch (err) {
          const {response} = err
          this.$modal.show('dialog', {
            title: `HTTP ${response.status} Error`,
            text: response.data,
            buttons: [{title: 'OK'}],
          })
        } finally {
          this.requestingSwap = false
        }
      },
    },
  }
</script>
