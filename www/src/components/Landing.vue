<template>
  <div>
    <div class="full row justify-center">
      <div class="landing-cta col align-center justify-around">
        <div class="landing-cta__text col justify-around">
          <h1>
            Peer-to-peer cryptocurrency exchange.
          </h1>
          <small class="landing-cta__subtitle">
            Exchange Stellar Lumens and Ethereum for free. No sign-up required.
          </small>
        </div>
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
          <div class="text--subdued">
            <small>
              More coins coming soon.
              <a href="#">
                Which?
              </a>
            </small>
          </div>
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
          Using Atomic Swaps, MirrorX allows you to exchange coins without sign-up.
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
          Free
        </p>
        <p class="pitch-box__text">
          Because MirrorX is peer-to-peer, there are no transaction fees.
        </p>
        <p class="pitch-box__footer">
          <a href="#fees">
            Fees
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
          All your keys stay with you, so no one can steal your money.
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
          <h2 id="anonymous">
            Anonymous
          </h2>
          <p class="article__content">
            We don't require your personal information, and we don't impose trading limits.
            We achieve this by levaraging Atomic Swaps: peer-to-peer cryptocurrency swaps without an intermediary.
          </p>
          <p class="article__content">
            Let's say Alice wants to convert Stellar to Ethereum. She agrees to swap with Bob, who wants to exchange his Ethereum for Stellar.
            Atomic Swaps work in two phases: the commitment phase and the claim phase.
          </p>
          <p class="article__content">
            In the commitment phase, Alice commits her Stellar Lumens to a cryptographically locked escrow account on Stellar.
            Bob does the same but on Ethereum for his Ether.
            In the claim phase, Alice claims the funds committed by Bob on Ethereum.
            She does this by using a secret number originally used to set up both escrow accounts.
            By doing this, she automatically allows Bob to claim the funds she committed on Stellar using the same secret.
          </p>
          <p class="article__content">
            <a target="_blank" href="https://github.com/mvanderh/MirrorX">Learn more..</a>
          </p>
        </div>
        <div class="article">
          <h2 id="fees">
            Fees
          </h2>
          <p class="article__content">
            MirrorX does not take transaction fees or spread fees.
            Exchanging coins is completely free.
          </p>
        </div>
        <div class="article">
          <h2 id="security">
            Secure
          </h2>
          <p class="article__content">
            By enabling all the signing to be done in the browser, MirrorX never holds your private keys or your funds.
            This means your money can't stolen.
          </p>
          <p class="article__content">
            MirrorX is <a target="_blank" href="http://github.com/mvanderh/MirrorX">open source</a>.
            Anyone can audit the code and determine that it is secure.
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
