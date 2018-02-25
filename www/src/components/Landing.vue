<template>
  <div>
    <div class="row justify-center">
      <div class="landing-cta col align-center">
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
        <div class="landing-cta__footer">
          <p>
            More currency pairs coming soon.
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
          No KYC and no exchange limits.
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
          Zero transaction fees and a very small spread.
        </p>
        <p class="pitch-box__footer">
          <a href="#cheap">
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
          We never hold your funds or your private keys.
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
        <div class="article">
          <h2 class="article__heading" id="anonymous">
            Anonymous
          </h2>
          <p class="article__content">
            MirrorX does not require you to disclose personal information, and it doesn't enforce a trading limit.
            It achieves this by levaraging Atomic Swaps, which are peer-to-peer currency swaps without an intermediary.
          </p>
          <p class="article__content">
            Atomic swaps have two phases: the commitment phase and the claim phase.
            In the commitment phase, two parties commit funds to a cryptographically locked escrow account.
            In the claim phase, one party claims the funds intended for them and by doing so automatically
            releases the funds intended for the counterparty.
          </p>
          <p class="article__content">
            A more thorough explanation can be found <a target="_blank" href="https://github.com/mvanderh/MirrorX">here</a>.
          </p>
        </div>
        <div class="article">
          <h2 class="article__heading" id="cheap">
            Cheap
          </h2>
          <p class="article__content">
            MirrorX doesn't and will never take exchange transaction fees.
          </p>
          <p class="article__content">
            There is a small spread between swaps that is used to prevent market manipulation.
          </p>
        </div>
        <div class="article">
          <h2 class="article__heading" id="security">
            Secure
          </h2>
          <p class="article__content">
            MirrorX never holds your private keys or your funds.
            This is achieved by enabling all the signing to be done in the browser (you can even sign transactions off-site).
          </p>
          <p class="article__content">
            When you start a currency swap, MirrorX matches you on a First-In-First-Out basis
            with a peer who wants to the opposite swap. When a match is found, the rest of the swap
            is executed in the browser simply by reading from the respective public blockchains.
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
