# Monsters (for Adventurers)

**Slay Monsters with Loot.** [Learn more](https://monstersforadventurers.com/).

- You can only slay Monsters with Loot of a specific type. Each Monster is weak to a single weapon type (either Long Swords, Quarterstaffs, or another weapon type.) It is immune to all other weapon types and cannot be slain otherwise!

- Monster slayers gets exclusive naming rights for the slain monster. Did you slay a run-of-the-mill griffin or 'Emperor Frostfeather III O.B.E'? Here's a chance to exercise your creative muscle!

- Once a monster is slain, the slaying weapon is displayed on the Monster card. Both the slayer and the slaying weapon are recorded on-chain, forever. Earn fame for your Loot by vanquishing many Monsters!

## Setup

```sh
$ yarn install
```

Create a `.env` following the `.env.example`:

```
MNEMONIC=here is where your twelve words mnemonic should be put my friend
ETHERSCAN_API_KEY=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
MAINNET_RPC_URL=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
RINKEBY_RPC_URL=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### TypeChain

Compile the smart contracts and generate TypeChain artifacts:

```sh
$ yarn typechain
```

### Lint Solidity

Lint the Solidity code:

```sh
$ yarn lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
$ yarn lint:ts
```

### Format files

```sh
$ yarn prettier
```

### Test

Run unit tests:

```sh
$ yarn test

$ yarn coverage
```

## Tooling

- [Hardhat](https://github.com/nomiclabs/hardhat): compile and run the smart contracts on a local development network
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript types for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Waffle](https://github.com/EthWorks/Waffle): tooling for writing comprehensive smart contract tests
- [Solhint](https://github.com/protofire/solhint): linter
- [Solcover](https://github.com/sc-forks/solidity-coverage) code coverage
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter
