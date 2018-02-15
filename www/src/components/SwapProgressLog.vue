<template>
  <ul class="progress-log">
    <li v-for="(desc, i) in statusDescriptions"
        :key="i"
        class="progress-log__item"
        :class="{'progress-log__item--inactive': i > status}">
      <span class="progress-log__icon">
        <icon name="check" class="progress-log__icon--happy" v-if="i < status"/>
        <icon name="spinner" v-if="i === status" pulse/>
      </span>
      <span class="progress-log__description">
        {{desc}}
      </span>
    </li>
  </ul>
</template>

<script>
  export default {
    name: 'progress-log',
    props: {
      status: Number,
      side: String,
    },
    computed: {
      counterparty() {
        if (this.side === 'withdraw') {
          return 'depositor'
        } else {
          return 'withdrawer'
        }
      },
      depositStep() {
        if (this.side === 'deposit') {
          return '(You)'
        }
        return '(Depositor)'
      },
      withdrawStep() {
        if (this.side === 'withdraw') {
          return '(You)'
        }
        return '(Withdrawer)'
      },
      statusDescriptions() {
        return [
          `1. Match with ${this.counterparty}`,
          `2. Commit XETH tokens on Stellar ${this.withdrawStep}`,
          `3. Commit ETH on Ethereum ${this.depositStep}`,
          `4. Claim ETH on Ethereum ${this.withdrawStep}`,
          `5. Claim XETH tokens on Stellar ${this.depositStep}`,
          'Done!',
        ]
      },
    },
  }
</script>
