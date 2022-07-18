# SpaceCoin ERC20 Token

An ICO contract for `SpaceCoin`, an ERC20 token that implements a toggleable token transfer tax. The ICO aims to raise 30,000ETH through the sale of SpaceCoin over three phases:

1. `Seed Phase`: 1.5k individual contribution max. 15k total.
1. `General Phase`: 1k indidivual contribution max. 30k total.
1. `Open Phase`: No individual contribution limits. 30k total.

## SpaceCoin

- 500k max supply
- 2% toggable (default off) tx fee that goes to treasury.

# Project Notes

- Run all tests using `npx hardhat test`
- The contract is deployed on `Goerli Testnet` at `0x3C681Ca14A58a054513786BF91b5C112684D50c1` and verified on [etherscan.io](https://goerli.etherscan.io/address/0x3C681Ca14A58a054513786BF91b5C112684D50c1#code).
- My design is as follows:
  - Two contracts `SpaceCoin` and `SpaceCoinICO`, both of which are "Ownable" by an address provided in the ICO constructor. The ICO will instantiate a new instance of the token contract, at which point the entire supply is minted. 150k for the ICO contract, 350k for the treasury.
  - `SpaceCoin` extends to OZ's `ERC20` contract and is kept as minimal as possible.
    - It overrides the ERC20 `transfer()` function to allow for transfer tax collection (if active).
    - The manager of contract toggles the tax on or off.
    - It uses default ERC20 values with 18 decimal places.
  - `SpaceCoinICO` encapsulates the rest of the features of the project.
    - Tokens are purchased through the `buyTokens()` function, which is either called directly or indirectly through the `receive()`, when investors directly send money to the contract.
    - All token sales are recorded in the `contributions` mapping, as well as `tokensToCollect` mapping. The latter is used for contributions that happen pre-Open phase.
    - Once ICO reaches Open phase, investors can use `redeemTokens()` to collect any tokens that have been purchased pre-Open phase. Investors who buy tokens in Open phase will automatically receive SPC.
    - `currentPhase` enum tracks the ICO progress, which can only be adjusted by the manager manually.
    - Whitelist feature implemented with the `whitelist` mapping. The manager can only add addresses to the whitelist.

## Other Deliverables

### Frontend

I've implemented a frontend using `parcel`. On my system, the server instance is at http://localhost:5000.

```
cd frontend
npx parcel src/index.html --no-cache
```
