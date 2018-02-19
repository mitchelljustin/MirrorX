# MirrorX - Atomic Swaps for Stellar

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
MirrorX is an application that enables users to easily execute [Atomic Swaps](https://themerkle.com/what-is-an-atomic-swap/) between one another.
In particular, MirrorX enables swaps into and out of [Stellar](https://www.stellar.org/), a decentralized currency exchange and payment network.

Stellar enables users to create custom assets (e.g. AliceCoin) that can then be traded against any other asset (e.g. BobCoin).
MirrorX leverages this ability to swap "mirrored assets" with real assets on other networks (such as Bitcoin or Ethereum). 
If the user prefers, MirrorX can immediately sell this mirrored asset for another asset on Stellar such as Lumens, the native currency. 

I prepend the letter "X" to the name of a crypto-asset to mean the mirrored asset on Stellar. 
For instance, "XETH" is what I call the mirrored asset for ETH (Ethereum).

How it Works
============
MirrorX is a frontend Web application first and foremost. All the signing is done in the browser to preserve security of private keys.

The only interaction MirrorX needs to use a server application for is to match users who want to swap with one another. 
Once a swap is started between two users, the server application plays a minimal role. 

Example
============

Let's say Alice wants to swap 0.25 ETH into Stellar, and Bob wants to swap 0.25 XETH out of Stellar. They agree to an atomic swap. The mechanism is as follows:

1. Bob generates 32 random bytes and calls this the preimage. He then computes the SHA256 hash of this preimage which is called the hashlock. The preimage isn't shared by Bob until every required transaction has been set up. 
2. Bob generates a new Stellar keypair and calls this the Swap keys. This account acts as a cryptographic "escrow" that holds the funds until the swap setup is complete.
3. Bob submits a Stellar transaction that does three things: 
  a) creates the Swap account by sending the minimum XLM reserve balance to it; 
  b) moves the 0.25 XETH into the Swap account; and
  c) locks the Swap account with the hashlock and Alice's public key, while also removing the Swap account private key as a signer.
4. Alice is watching Bob's Stellar account for the aforementioned transaction, and sees the new Swap account. She inspects the transaction and extracts the hashlock from it.
5. Alice sends 0.25 ETH into an Ethereum contract which locks it with Bob's Ethereum address as well as the hashlock.
6. Bob sees this transaction, and confirms that Bob's Ethereum address, the ETH amount and the hashlock are valid. 
7. Bob claims his 0.25 ETH from the Ethereum using the preimage he generated in step 1. Note that the preimage is now public knowledge.
8. Alice watches the Ethereum contract and sees that Bob has claimed the ETH using the preimage. She can now use the preimage to claim her own XETH.
9. Alice submits a Stellar transaction that claims the XETH funds in the Swap account using the preimage that is know public knowledge.

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

# Install yarn dependencies
yarn install

# Install client dependencies
cd www
yarn install
```

Usage
============

```bash
cd MirrorX

# Start Redis in docker
docker-compose up -d

# Start MirrorX API
./api.js

# Start matching engine
./match.mjs 0.01 ETH

cd www

# Start client
yarn run dev
```

Then navigate to `http://localhost:8080` to see MirrorX running locally.

Running Example
===============


Alice wants to convert 0.01 XETH into 0.01 ETH on Ethereum, and Bob wants to convert 0.01 ETH into 0.01 XETH on Stellar.

1. Run `./scripts/createTestAccounts.mjs` to create Stellar accounts for Alice, Bob and the Asset Issuer.
1. Download & run [Ganache](truffleframework.com/ganache/) to simulate the Ethereum network.
1. Install [Metamask](metamask.io). Once installed, point it at Ganache by selecting "Custom RPC" from the Network dropdown and 
entering `http://localhost:7545`. Add the top two accounts in Ganache to Metamask.
1. Follow the instructions in the [Usage](#usage) section to run MirrorX locally.
1. Navigate to `http://localhost:8080` and initiate two swaps: one deposit and one withdrawal.
 Use the secret keys from config/keys.json. Remember to switch the Metamask account you're using between swaps.
1. Follow the instructions in the swap.
