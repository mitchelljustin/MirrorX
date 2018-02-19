# MirrorX - Atomic Swaps between Stellar and Ethereum

Table of contents
=================

<!--ts-->
   * [Table of contents](#table-of-contents)
   * [Explanation](#explanation)
   * [Motivation](#motivation)
   * [Setup](#setup)
   * [Usage](#usage)
<!--te-->

Explanation
===========


Motivation
============

I plan to build a frontend Web application that enables atomic swaps between Ethereum and Stellar. The first version will be really simple, only supporting ETH and swaps of size exactly 0.25ETH. If this works out, I plan to add many more swaps for other currencies such as ZEC, ERC20s, BTC. 

For those that don't know, an atomic swap is an exchange of money between two different cryptocurrency networks that happens atomically i.e. either it all happens or none of it happens. This enables currency exchange without a trusted third party such as an exchange or a broker.

I've already successfully been able to execute an atomic swap of 0.001 ETH and 0.001 XETH (an asset on Stellar). This was done on testnet for both currencies. Transactions:

cc8e25fb3fbd972324cb8f78cac55feccf83b951855cad85af5554009c9c070b (Prepare Swap on Stellar)
0x9846b509847d6aab95c3da78ec1d7968d28106647b1c1e907bce04a98d3d8a1f (Prepare Swap on Ethereum)
0x0da72412f39a6abc3c9c7a63c3935bc93ca01c09264fe7284eafee1704cf1ed8 (Fulfill Swap on Ethereum)
da57ee93eada9e8738c76cd1709222d3cf229a6ed3c6a2ce8aa1ec0e683cd5b2 (Fulfill Swap on Stellar)

Screenshot: https://www.dropbox.com/s/p1mfpzrnt47uayg/first-atomic-swap-stellar-eth.png?dl=0

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

Additionally, both parties can refund their part of the swap after a certain (long) time period. This prevents malicious actors from stealing money, and other errors that would cause swaps to fail. For security reasons, the swap initiator (Bob) will have to wait longer to claim their refund than the swap fulfiller. Read more here: https://blog.lightning.engineering/announcement/2017/11/16/ln-swap.html

Please let me know if I have overlooked anything, or if you have suggestions. Thanks!


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

# Start docker container
docker-compose up -d

# Start MirrorX API
./api.js

# Start matching engine
./match.mjs 0.01 ETH

cd www

# Start client
yarn run dev
```

Example Swap
===============

In this example, Alice and Bob will swap 0.01 ETH.  