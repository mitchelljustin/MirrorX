<template>
  <modal :name="modalName"
         :clickToClose="false"
         :draggable="true"
         @before-open='beforeModalOpen'
         height="auto"
  >
    <div class="modal">
      <div class="sign-dialog">
        <div class="sign-dialog__header">
          <slot name="title"/>
        </div>
        <div class="sign-dialog__body">
          <slot name="description"/>
          <div class="sign-dialog__stellar" v-if="network === 'stellar'">
            <label class="sign-dialog__line" for="transactionXdr">
              Raw Transaction
            </label>
            <input type="text"
                   class="sign-dialog__input text-input"
                   v-model="transactionXdr"
                   id="transactionXdr"
                   disabled
            >
            <label for="stellarPrivateKey" class="sign-dialog__line">
              Private Key
            </label>
            <input
              class="text-input sign-dialog__input"
              type="text"
              id="stellarPrivateKey"
              v-model="stellarPrivateKey">
            <button class="button" @click="stellarSignClicked">
              SIGN
            </button>
            <span class="sign-dialog__line">
              <a
                :href="`https://www.stellar.org/laboratory/#txsigner?xdr=${encodeURIComponent(transactionXdr)}&network=test`">
                Sign on Stellar.org
              </a>
            </span>
            <label class="sign-dialog__line" for="stellarSignedTx">
              Signed Transaction
            </label>
            <input type="text"
                   v-model="stellarSignedTx"
                   id="stellarSignedTx"
                   :class="{
                    'sign-dialog__input': true,
                    'text-input': true,
                    'text-input--angry': stellarSignedTxValid === false,
                    'text-input--happy': stellarSignedTxValid,
                   }"
                   :disabled="submitting"
            >
            <button class="button button--happy" :disabled="submitting" @click="stellarSubmitClicked">
              SUBMIT
            </button>
          </div>
          <pre class="text--angry" v-if="errorText">{{ errorText }}</pre>
        </div>
      </div>
    </div>
  </modal>
</template>

<script>
  import {stellar, Stellar} from '../../../lib/stellar.mjs'

  export default {
    name: 'sign-transaction-dialog',
    props: {
      network: String,
      modalName: String,
    },
    data() {
      return {
        stellarPrivateKey: null,
        stellarSignedTx: null,
        transactionXdr: null,
        stellarSignedTxValid: null,
        errorText: null,
        submitting: false,
      }
    },
    methods: {
      beforeModalOpen(event) {
        const {transactionXdr} = event.params
        if (!transactionXdr && this.network === 'stellar') {
          return this.$router.back()
        }
        this.transactionXdr = transactionXdr
      },
      stellarSignClicked() {
        const tx = new Stellar.Transaction(this.transactionXdr)
        const keypair = Stellar.Keypair.fromSecret(this.stellarPrivateKey)
        tx.sign(keypair)
        this.stellarSignedTx = tx.toEnvelope().toXDR('base64')
      },
      async stellarSubmitClicked() {
        if (!this.stellarSignedTxValid) {
          this.stellarSignedTxValid = false
          return
        }
        this.submitting = true
        const tx = new Stellar.Transaction(this.stellarSignedTx)
        try {
          const stellarRes = await stellar.submitTransaction(tx)
          console.log(stellarRes)
        } catch (e) {
          this.errorText = JSON.stringify(e.data.extras.result_codes, null, 2)
        }
      },
    },
    watch: {
      stellarSignedTx(xdr) {
        if (xdr === '') {
          this.stellarSignedTxValid = null
          return
        }
        try {
          const tx = new Stellar.Transaction(xdr)
          if (tx.signatures.length !== 2) {
            this.stellarSignedTxValid = false
            return
          }
          this.stellarSignedTxValid = true
        } catch (e) {
          this.stellarSignedTxValid = false
        }
      },
    },
  }
</script>
