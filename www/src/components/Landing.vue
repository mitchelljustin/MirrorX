<template>
  <div>
    <div class="full row justify-center">
      <div class="landing-cta col align-center">
        <h1>MirrorX</h1>
        <img class="landing-cta__logo" src="../assets/MirrorX.png" alt="logo">
        <p class="landing-cta__text">
          Convert between cryptocurrencies without an intermediary
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
        <div class="landing-cta__footer">
          <p>
            <a href="#">
              Which coins should be added next?
            </a>
          </p>
        </div>
      </div>
    </div>
    <div class="pitch-box-container row justify-spaced">
      <div class="one-third pitch-box">
        <div class="pitch-box__header">
          <icon name="user-secret" scale="2"/>
        </div>
        <p class="pitch-box__title">
          Anonymous
        </p>
        <p class="pitch-box__text">
          No sign up required.
        </p>
        <p class="pitch-box__footer">
          <a href="#anonymous">
            How it works
          </a>
        </p>
      </div>
      <div class="one-third pitch-box">
        <div class="pitch-box__header">
          <icon name="dollar" scale="2"/>
        </div>
        <p class="pitch-box__title">
          Cheap
        </p>
        <p class="pitch-box__text">
          Zero transaction fees.
        </p>
        <p class="pitch-box__footer">
          <a href="#cheap">
            Fee Structure
          </a>
        </p>
      </div>
      <div class="one-third pitch-box">
        <div class="pitch-box__header">
          <icon name="lock" scale="2"/>
        </div>
        <p class="pitch-box__title">
          Secure
        </p>
        <p class="pitch-box__text">
          No one can steal your money.
        </p>
        <p class="pitch-box__footer">
          <a href="#security">
            How?
          </a>
        </p>
      </div>
    </div>
    <div class="full col align-center">
      <div class="full row">
        <h1>Why use MirrorX?</h1>
        <div class="article">
          <h2 class="article__heading" id="anonymous">
            Anonymous
          </h2>
          <p class="article__content">
            We don't require your personal information, and we don't impose trading limits.
            We achieve this by levaraging Atomic Swaps: peer-to-peer cryptocurrency swaps without an intermediary.
            <a target="_blank" href="https://github.com/mvanderh/MirrorX">Learn more..</a>
          </p>
        </div>
        <div class="article">
          <h2 class="article__heading" id="cheap">
            Cheap
          </h2>
          <p class="article__content">
            MirrorX does not take transaction fees and never will.
            There is only a small spread between swaps that is used to prevent market manipulation.
          </p>
        </div>
        <div class="article">
          <h2 class="article__heading" id="security">
            Secure
          </h2>
          <p class="article__content">
            By enabling all the signing to be done in the browser, MirrorX never holds your private keys or your funds.
            This means your money can never get stolen.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'landing',
  }
</script>
