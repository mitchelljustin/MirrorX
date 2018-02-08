<template>
  <div id="app">
    <h1>
      <router-link to="/">MirrorX</router-link>
    </h1>
    <h4>
      Secure Deposits & Withdrawals on the Stellar DEX
    </h4>
    <hr>
    <div>
      <router-view/>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'App',
  }
</script>
