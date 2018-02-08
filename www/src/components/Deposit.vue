<template>
  <div>
    <h2>
      <spinner
        :message="statusMessage"
        speed="1.4"
        size="large"
      />
    </h2>
  </div>
</template>

<script>
  export default {
    name: 'Deposit',
    data() {
      let data = {
        currency: this.$route.params.currency,
        amount: this.$route.query.amount,
        hashlock: this.$route.query.hashlock,
      }
      data.statusMessage = `Depositing ${data.amount} ${data.currency}..`
      return data
    },
  }
</script>
