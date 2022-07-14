## **ICO Audit Report**

These contracts aims to create ICO for SpaceCoin that aims to raise 30,000 of ETH in total. There are 3 phases (SEED, GENERAL and OPEN). SEED phase only allows whitelisted addresses to deposit with max individual contribution capped at 1,500 ETH and total phase contribution capped at 15,000 ETH. GENERAL phase allows anyone to contribute with a max individual cap of 1,000 ETH (including the whitelisted address contribution from SEED phase). OPEN phase removes the individual contribution cap however the total amount to raise cap still exists. At any point in time the owner can pause the fundraise resulting in no contribution allowed and can also forward phase (SEED -> GENERAL -> OPEN).

This micro audit was conducted by Lily Johnson (lilyjjo) student of block 6 of the Macro Solidity bootcamp.

## **[L-0]** Tax can be evaded by using the `transferFrom()` method on ERC20

See below lines 158-167 for `transferFrom()` from OZ's ERC20 contract:

```
function transferFrom(
	address from,
	address to,
	uint256 amount
) public virtual override returns (bool) {
	address spender = _msgSender();
	_spendAllowance(from, spender, amount);
	_transfer(from, to, amount);
	return true;
}
```

If users of SPC use this method to trade SPC they can avoid paying tax to the treasury.

Consider: modifying ERC20's `transferFrom()` also, or, modifying ERC20's  `_transfer()` function instead. `_trasnfer()` is what both `transfer()` and `transferFrom()` use under the hood to make the transfer.


## **[L-1]** Extra feature of transferring ICO sales to treasury account.

In lines 204-207 the function `movesSalesToTreasury()` moves the sales for the SpaceCoin outside of the SpaceCoinICO contract. This is problematic because, while it makes complete sense to have, it was not a part of the spec.

```
function moveSalesToTreasury() private {
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Unable to transfer sales to treasury");
    }
```

Consider: removing the `moveSalesToTreasury()` function and keeping the funds locked in the ICO contract.


## **[C-0]** `isWhitelisted()`  is redundant 
Function `isWhiteListed()` on 145-153 of SpaceCoinICO.sol is the same as the auto-generated getter `whitelist()`.

```
    function isWhitelisted(address _account) public view returns (bool) {
        require(_account != address(0), "Invalid account");
        return whitelist[_account];
    }
```

Consider: removing `isWhileListed()`  and just using `whitelist()` instead.

## **[C-1]** (possible, unsure) Paused used on many functions, including phase shifts.
In SpaceCoinICO.sol, the following functions have the `activeICO()` modifier on them:
- Line 114 `beginGeneralPhase()`
- Line 124 `beginOpenPhase()`
- Line 102 `redeemTokens()`

Only the manager can control the phase shift functions. It might make more sense to allow the manager to still change the phase when a pause is in effect. I'm only commenting because I don't see a reason why to have this restriction. 

Consider: removing the `activeICO()` modifier from the phase shift functions.

The `redeemTokens()` pause restriction is also potentially problematic, depending on your definition of fundraising. I thought the pause would only affect contributing, but ohno non-techincal clients, they are fun aren't they?

Consider: us asking more clarifying questions in the discord chat during project development :) 