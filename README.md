# ICO Project

```
- 500k max supply
- 2% toggable (default off) tx fee that goes to treasury.
The smart contract aims to raise 30,000 Ether by performing an ICO.
The ICO should only be available to whitelisted private investors starting in Phase Seed
with a maximum total private contribution limit of 15,000 Ether and an individual contribution limit of 1,500 Ether.
The ICO should become available to the general public during Phase General, with a total contribution limit equal to 30,000 Ether, inclusive of funds raised from the private phase.
During this phase, the individual contribution limit should be 1,000 Ether, until Phase Open, at which point the individual contribution limit should be removed.
At that point, the ICO contract should immediately release ERC20-compatible tokens for all contributors at an exchange rate of 5 tokens to 1 Ether.
The owner of the contract should have the ability to pause and resume fundraising at any time, as well as move a phase forwards (but not backwards) at will.
```

## Project Notes

- All tests pass are passing. I believe I've implemented all features.
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

I've implemented an extremely elementary frontend using `parcel`, in the way I believe the staff advised. On my system, the server instance is at http://localhost:5000.

```
cd frontend
npx parcel src/index.html --no-cache
```

### Design Exercise

```
The base requirements give contributors their SPC tokens immediately.
How would you design your contract to vest the awarded tokens instead,
i.e. award tokens to users over time, linearly?
```

It's possible to design a contract that maintains 1. a `mapping` of who gets how much and 2. another `mapping` that maps the same addresses to two timestamps: `start` and the fully vested timestamp `end`. We can then have a `redeem()` function that checks the vesting schedule before allowing to transfer. A linear vesting schedule can be represented something like this:

`(totalTokensYouWillEverGet * timeElapsedSinceStart) / totalDuration`

We will always be able to take out an increasing ratio of the `totalTokensYouWillEverGet` as time goes on. The contract would need to have custody of the SPC tokens. Better yet, it would probably best to spin up a separate contract, maybe called `SpaceVault`, for modularity and extensibility. This would allow for the ability to do more complex logic in determining the vesting schedules.
