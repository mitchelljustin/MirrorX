# MirrorX - Peer-to-peer cryptocurrency conversions

Table of contents
=================

<!--ts-->
   * [Table of contents](#table-of-contents)
   * [Explanation](#explanation)
   * [How it Works](#how-it-works)
   * [Example](#example)
   * [Setup](#setup)
   * [Usage](#usage)
   * [Running Example](#running-example)
<!--te-->

Explanation
===========
MirrorX is an application that enables users to find each other & execute [Atomic Swaps](https://themerkle.com/what-is-an-atomic-swap/).
In particular, MirrorX enables swaps into and out of [Stellar](https://www.stellar.org/), a decentralized currency exchange and payment network.

How it Works
============
MirrorX is mostly a frontend Web application written with VueJS and Webpack. 
It has only two small server processes: one to match users, and one to perform some other tasks (e.g. store refund transaction).

All the signing is done in the browser to preserve security of users' private keys.

Currently these currencies are supported:
1. Stellar Lumens
1. Ethereum

I plan to add more coins in the future. [Vote on the next currency to add](https://goo.gl/forms/gBmhcNLQ48S5pHyt1). 

Example
============

Let's say Alice wants to convert 0.004 ETH into 10 XLM, and Bob wants to convert 10 XLM into 0.004 ETH. They agree to an atomic swap. The mechanism is as follows:

1. Bob generates 32 random bytes and calls this the preimage. He then computes the SHA256 hash of this preimage which is called the hashlock. The preimage isn't shared by Bob until every required transaction has been set up. 
2. Bob generates a new Stellar keypair and calls this the Swap keys. This account acts as a cryptographic "escrow" that holds the funds until the swap setup is complete.
3. Bob submits a Stellar transaction that does three things: 
  a) creates the Swap account by sending 10 XLM to it; and
  b) locks the Swap account with the hashlock and Alice's public key, while also removing the Swap account private key as a signer.
4. Alice is watching Bob's Stellar account for the aforementioned transaction, and sees the new Swap account. She inspects the transaction and extracts the hashlock from it.
5. Alice sends 0.004 ETH into an Ethereum contract which locks it with Bob's Ethereum address as well as the hashlock.
6. Bob sees this transaction, and confirms that Bob's Ethereum address, the ETH amount and the hashlock are valid. 
7. Bob claims his 0.004 ETH from the Ethereum using the preimage he generated in step 1. Note that the preimage is now public knowledge.
8. Alice watches the Ethereum contract and sees that Bob has claimed the ETH using the preimage. She can now use the preimage to claim her own XLM.
9. Alice submits a Stellar transaction that claims the XLM funds in the Swap account using the preimage that is know public knowledge.

Additionally, both parties can refund their part of the swap after a certain (long) time period. This prevents malicious actors from stealing money, and other errors that would cause swaps to fail. For security reasons, the swap initiator (Bob) will have to wait longer to claim their refund than the swap fulfiller. [Read more here](https://blog.lightning.engineering/announcement/2017/11/16/ln-swap.html).

Setup
============

## Prerequisites
* `Docker`
* `docker-compose`
* `yarn`
* `npm`
* `node >= 9.3.x`


## Environment Setup
```bash
# Clone the project
git clone https://github.com/mvanderh/MirrorX.git
cd MirrorX

# Install server/library dependencies
yarn install

# Install client dependencies
cd www
yarn install
```

Usage
============

```bash
cd MirrorX

# Start Redis, API and Matching Engine in docker
docker-compose -f docker-compose.dev.yml up -d

cd www

# Start building client
yarn run dev
```

Then navigate to `http://localhost:8080` to see MirrorX running locally.

Running Example
===============

1. Run `./scripts/createTestAccounts.mjs` to create Stellar accounts for Alice and Bob.
1. Install [Metamask](metamask.io). Once installed, point it at Rinkeby by selecting "Rinkeby" from the Network dropdown.
1. Copy your Metamask Ethereum address and use it to get Rinkeby test Ethereum [HERE](https://www.rinkeby.io/#faucet). 
1. Follow the instructions in the [Usage](#usage) section to run MirrorX locally.
1. Navigate to `http://localhost:8080` and initiate two simultaneous swaps: one XLM->ETH and one ETH->XLM. Use the Stellar secret keys from config/keys.json. 
1. Follow the instructions in the swap.
