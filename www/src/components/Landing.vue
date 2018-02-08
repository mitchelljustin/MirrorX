<template>
  <div>
    <div class="row content">
      <div class="landing-action">
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
        <button @click="goClicked">
          GO
        </button>
      </div>
    </div>
    <div class="row adbox-container">
      <div class="col adbox">
        <icon name="exchange" scale="2"/>
        <p>
          Stellar is a secure, production-grade Decentralized Exchange.
        </p>
        <p>
          That means that it looks and feels just like a normal exchange,
          but no one except you ever holds your money.
        </p>
      </div>
      <div class="col adbox">
        <icon name="lock" scale="2"/>
        <p>
          MirrorX uses a technology called Atomic Swaps to ensure maximum security.
        </p>
        <p>
          This allows for fast, trustless, peer-to-peer deposits & withdrawals.
        </p>
      </div>
      <div class="col adbox">
        <icon name="magic" scale="2"/>
        <p>
          MirrorX was built to make deposits and withdrawals feel like a breeze.
        </p>
        <p>

        </p>
      </div>
    </div>
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
    },
  }
</script>
