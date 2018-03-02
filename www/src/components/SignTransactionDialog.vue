<template>
  <modal :name="modalName"
         :clickToClose="false"
         @before-open='beforeModalOpen'
         height="auto"
  >
    <div class="modal">
      <div class="sign-dialog">
        <div class="sign-dialog__header">
          <icon v-if="submitting" name="spinner" pulse/>
          <slot name="title"/>
        </div>
        <div class="sign-dialog__body">
          <div class="sign-dialog__description">
            <slot name="description"/>
          </div>
          <div class="sign-dialog__stellar row align-center" v-if="network === 'stellar'">
            <p>
              You can sign on-site using this dialog, or off-site using your own wallet.
            </p>
            <label class="sign-dialog__line" for="envelopeXdr">
              Raw Transaction
              <a target="_blank"
                 :href="`https://www.stellar.org/laboratory/#xdr-viewer?input=${encodeURIComponent(envelopeXdr)}&type=TransactionEnvelope&network=test`">
                Inspect
              </a>
            </label>
            <input type="text"
                   class="sign-dialog__input text-input"
                   v-model="envelopeXdr"
                   id="envelopeXdr"
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
            <button class="button button--normal" @click="stellarSignClicked">
              SIGN
            </button>
            <span class="sign-dialog__line">
              <a
                :href="`https://www.stellar.org/laboratory/#txsigner?xdr=${encodeURIComponent(envelopeXdr)}&network=test`">
                Sign on Stellar.org
              </a>
            </span>
            <label class="sign-dialog__line" for="stellarSignedTx">
              Signed Transaction
            </label>
            <input type="text"
                   v-model="stellarSignedXdr"
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
          <div v-if="network === 'ethereum'">
            <button class="button button--normal"
                    @click="callContractButtonClicked">
              CALL
            </button>
          </div>
          <pre class="text--angry" v-if="errorText">{{ errorText }}</pre>
          <div class="sign-dialog__footer">
            <p>
              Dialog will disappear once transaction is confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  </modal>
</template>

<script>
  import {stellar, Stellar} from '../../../lib/stellar.mjs'
  import EthSwapContract from '../../../lib/ethSwapContract.mjs'

  export default {
    name: 'sign-transaction-dialog',
    props: {
      network: String,
      modalName: String,
    },
    data() {
      return {
        stellarPrivateKey: null,
        stellarSignedXdr: null,
        envelopeXdr: null,
        refundXdr: null,
        stellarSignedTxValid: null,
        errorText: null,
        submitting: false,
      }
    },
    methods: {
      async beforeModalOpen(event) {
        if (this.network === 'stellar') {
          const {envelopeXdr} = event.params
          if (!envelopeXdr) {
            return event.stop()
          }
          Object.assign(this, {envelopeXdr})
          await this.waitForStellarTx()
          this.$modal.hide(this.modalName)
        }

        if (this.network === 'ethereum') {
          const {funcName, params} = event.params
          if (!funcName || !params) {
            return event.stop()
          }
          Object.assign(this, {funcName, params})
          await this.callEthereumContract()
        }
      },
      stellarSignClicked() {
        const {stellarTx} = this
        const keypair = Stellar.Keypair.fromSecret(this.stellarPrivateKey)
        stellarTx.sign(keypair)
        this.stellarSignedXdr = stellarTx.toEnvelope().toXDR('base64')
      },
      async stellarSubmitClicked() {
        if (!this.stellarSignedTxValid) {
          this.stellarSignedTxValid = false
          return
        }
        this.submitting = true
        const tx = new Stellar.Transaction(this.stellarSignedXdr)
        try {
          await stellar.submitTransaction(tx)
        } catch (e) {
          this.errorText = JSON.stringify(e.data.extras.result_codes, null, 2)
          this.submitting = false
        }
      },
      callContractButtonClicked() {
        this.callEthereumContract()
      },
      async callEthereumContract() {
        const {funcName, params} = this
        const contract = await EthSwapContract.deployed()
        const contractFunc = contract[funcName]
        this.submitting = true
        await contractFunc(...params)
        this.submitting = false
        this.$modal.hide(this.modalName)
      },
      async waitForStellarTx() {
        const {stellarTx} = this
        const transactionId = stellarTx.hash().toString('hex')
        return new Promise((resolve, reject) => {
          const checkTransaction = async() => {
            try {
              const txs = await stellar.transactions()
                .transaction(transactionId)
                .call()
              const tx = txs[0]
              return resolve(tx)
            } catch (e) {
              if (e.name !== 'NotFoundError') {
                return reject(e)
              }
            }
            setTimeout(checkTransaction, 1000)
          }
          checkTransaction()
        })
      },
    },
    computed: {
      stellarTx() {
        return new Stellar.Transaction(this.envelopeXdr)
      },
    },
    watch: {
      stellarSignedXdr(xdr) {
        if (xdr === '') {
          this.stellarSignedTxValid = null
          return
        }
        try {
          /* eslint-disable no-new */
          new Stellar.Transaction(xdr)
          this.stellarSignedTxValid = true
        } catch (e) {
          this.stellarSignedTxValid = false
        }
      },
    },
  }
</script>
