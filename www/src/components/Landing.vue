<template>
  <div>
    <div class="row-centered">
      <div class="landing-cta">
        <div class="landing-cta__submit">
          <router-link :to="{name: 'prepare-swap', params: {currency, side: 'deposit'}}"
                       class="button button--long button--happy">
            DEPOSIT ETH
          </router-link>
          <router-link :to="{name: 'prepare-swap', params: {currency, side: 'withdraw'}}"
                       class="button button--long">
            WITHDRAW ETH
          </router-link>
        </div>
      </div>
    </div>
    <div class="row-spaced">
      <div class="onethird pitch-box">
        <icon class="pitch-box__header" name="bar-chart" scale="2"/>
        <p class="pitch-box__text">
          Stellar is a secure, production-grade Decentralized Exchange for cryptocurrencies and fiat.
        </p>
        <p class="pitch-box__text">
          That means that it looks and feels just like a normal exchange,
          but no one except you ever holds your money.
        </p>
      </div>
      <div class="onethird pitch-box">
        <icon class="pitch-box__header" name="lock" scale="2"/>
        <p class="pitch-box__text">
          MirrorX uses a technology called Atomic Swaps to ensure maximum security.
        </p>
        <p class="pitch-box__text">
          This allows for fast, peer-to-peer deposits & withdrawals that don't require trust.
        </p>
      </div>
      <div class="onethird pitch-box">
        <icon class="pitch-box__header" name="magic" scale="2"/>
        <p class="pitch-box__text">
          MirrorX was built to make deposits and withdrawals feel like a breeze.
        </p>
        <p class="pitch-box__text">
          Combined with the power of Stellar, trading cryptocurrencies has never been easier & safer.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
  import SwapSpecs from '../../../lib/swapSpecs.mjs'

  export default {
    name: 'landing',
    data() {
      return {
        action: 'deposit',
        currency: 'ETH',
      }
    },
    methods: {
      withdrawClicked() {
        const {currency} = this
        this.$router.push({
          name: 'prepare-withdraw',
          params: {currency},
        })
      },
      depositClicked() {
        const {currency} = this
        this.$router.push({
          name: 'prepare-deposit',
          params: {currency},
        })
      },
    },
    computed: {
      supportedCurrencies() {
        return Object.keys(SwapSpecs)
      },
    },
  }
</script>
