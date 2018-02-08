<template>
  <div>
    <h2>
      <span>I want to</span>
      <span>
        <label for="action"></label>
        <select name="action" id="action" v-model="action">
          <option value="Deposit">Deposit</option>
          <option value="Withdraw">Withdraw</option>
        </select>
        <label>
          <input type="number" step="0.25" disabled v-model="amount">
        </label>
        <label for="currency"></label>
        <select name="currency" id="currency" v-model="currency">
          <option v-for="supportedCur in supportedCurrencies" :key="supportedCur" :value="supportedCur">
            {{supportedCur}}
          </option>
        </select>
      </span>
      <span>{{actionPreposition}} the Stellar DEX</span>
      <button @click="goClicked">
        GO
      </button>
    </h2>
  </div>
</template>

<script>
  import SupportedSwaps from '../../../lib/supportedSwaps.mjs'

  export default {
    name: 'Landing',
    data() {
      return {
        action: 'Deposit',
        amount: '0.25',
        supportedCurrencies: Object.keys(SupportedSwaps),
        currency: 'ETH',
      }
    },
    methods: {
      goClicked() {
        const {action, amount, currency} = this
        console.log(`Go clicked: ${JSON.stringify({action, amount, currency})}`)
        this.$router.push({
          name: action,
          params: {currency},
          query: {amount},
        })
      },
    },
    computed: {
      actionPreposition() {
        if (this.action === 'Deposit') {
          return 'on'
        }
        if (this.action === 'Withdraw') {
          return 'from'
        }
        return ''
      },
    },
  }
</script>
