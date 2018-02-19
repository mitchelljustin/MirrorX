<template>
  <div>
    <div class="row-centered">
      <div class="landing-cta">
        <p class="landing-cta__text">
          Stellar is a decentralized currency exchange and payment network.
          MirrorX is your gateway to it.
        </p>
        <div class="landing-cta__actions">
          <router-link :to="{name: 'prepare-swap', params: {currency: 'ETH', side: 'deposit'}}"
                       class="button button--big button--long button--happy">
            <span class="button--long__item">ETH</span>
            <icon class="button--long__item" name="arrow-circle-right" scale="1.5"/>
            <span class="button--long__item">XLM</span>
          </router-link>
          <router-link :to="{name: 'prepare-swap', params: {currency: 'ETH', side: 'withdraw'}}"
                       class="button button--big button--normal button--long">
            <span class="button--long__item">XLM</span>
            <icon class="button--long__item" name="arrow-circle-right" scale="1.5"/>
            <span class="button--long__item">ETH</span>
          </router-link>
        </div>
        <p class="landing-cta__footer">
          More currency pairs coming soon
        </p>
      </div>
    </div>
    <div class="row-spaced">
      <div class="one-third pitch-box">
        <icon class="pitch-box__header" name="bar-chart" scale="2"/>
        <p class="pitch-box__text">
          Stellar is a Decentralized Exchange for cryptocurrencies and fiat, with Lumens (XLM) as the native currency.
        </p>
        <p class="pitch-box__text">
          MirrorX allows you to trade on Stellar using currencies you already own, such as Ether.
        </p>
        <p class="pitch-box__footer">
          <a target="_blank" href="https://stellar.org">
            More about Stellar
          </a>
        </p>
      </div>
      <div class="one-third pitch-box">
        <icon class="pitch-box__header" name="exchange" scale="2"/>
        <p class="pitch-box__text">
          MirrorX uses Atomic Swaps to enable currency conversions without an intermediary.
        </p>
        <p class="pitch-box__text">
          No third party ever holds your funds. This means no risk of getting hacked and no limits.
        </p>
        <p class="pitch-box__footer">
          <router-link target="_blank" :to="{name: 'about'}">
            Learn More
          </router-link>
        </p>
      </div>
      <div class="one-third pitch-box">
        <icon class="pitch-box__header" name="magic" scale="2"/>
        <p class="pitch-box__text">
          MirrorX was built to make trustless currency conversions as easy & safe as possible.
          However, please be aware it is still very much a work in progress.
        </p>
        <p class="pitch-box__text">
          If you have suggestions or would like to contribute, please reach out on GitHub.
        </p>
        <p class="pitch-box__footer">
          <a target="_blank" href="https://github.com/mvanderh/MirrorX">
            Source on GitHub
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'landing',
  }
</script>
