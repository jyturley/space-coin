https://github.com/0xMacro/student.jyturley/tree/ac65013eccb0c8db751baba84e14dd46f221ae5d/ico

Audited By: Vince

# General Comments

The code is well written and well tested, loved the ascii art on the frontend page :D
There is just a small issue with the tax as overriding `transfer` won't cover transfers for `transferFrom` calls. In this case, you can either override `transfer` and `transferFrom` or override the internal `_transfer` and there you have it. One other consideration is code on the blockchain is gas consuming, so the less lines the better. Finding good ways to condense the code applying DRY principles can save a whole lot of Ether. Nice work!


# Design Exercise

The idea of having mappings to account for address, start, end and total is solid and would work well for a vesting schedule. One question that I have is: "What role do already redeemed tokens play in your design proposal?"
The external contract also works great! It is best to compose contracts rather than bloating one with too many functions. Good stuff!


# Issues

**[M-1]** Transfer tax can be avoided.

The tax deduction is performed in an override of the `transfer()` 
function, but this will not catch all transfers. ERC-20's `transferFrom()` 
can still be used to transfer tokens and avoid the tax logic. Putting the 
same logic into the `_transfer(address,address,uint)` function would catch 
all transfers as the inherited ERC20 implementation always uses this internally.

Consider overriding both `transfer()` and `transferFrom()` and applying tax
logic, or override the `_transfer()` function, which is called from both of
ERC-20's `transfer()` and `transferFrom()`.

---

**[Technical Mistake]** Not needed `payable` functions lock ETH
	function redeemTokens() external payable activeICO

Although, the function doesn't do anything with the sent ETH.
In cases like this, users can mistakenly send ETH to a contract, which will become lost.

Consider removing `payable` to the function.

**[Technical Mistake]** forbidding 0 value ERC20 transfers

In line 55 of SpaceCoin.sol you have the check:

`require(amount > 0, "Must transfer more than 0");`

However, the ERC20 standard explicitly says to allow 0 value transfers. See [the eips page](https://eips.ethereum.org/EIPS/eip-20) where it says "Note Transfers of 0 values MUST be treated as normal transfers and fire the Transfer event."

Consider removing that `require`.

---

**[Q-1]** redeem functionality is pauseable by owner

Pausing the ability for contributors to withdraw their funds is not part
of the spec, but it makes sense to prevent potentially malicious addresses
from being able to withdraw more funds than their owed, so we won't add
points for this.

---

**[Q-2]** Immutable `treasury` value is using contract storage

If you have values which are set in your contract constructor and then never changed, as `treasury` in `SpaceCoinICO`, then you can declare them with the `immutable` keyword. This will save gas as the compiler will not reserve storage for them and instead inline the values where they are used. You have correctly used it elsewhere, just this one was missing.

---

**[Q-3]** `buyTokens` is `public`, should be `external`

Consider using `external` instead to reduce contract size a little and make the intended usage clearer.

---

**[Q-4]** Use NatSpec format for comments

Solidity contracts can use a special form of comments to provide rich 
documentation for functions, return variables and more. This special form is 
named the Ethereum Natural Language Specification Format (NatSpec).

It is recommended that Solidity contracts are fully annotated using NatSpec 
for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others audit, as well
as making your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Regardless, the code was very clean and easy to follow even without comments!

Consider annotating your contract code via the NatSpec comment standard.

---

**[Q-5]** Long Error Messages

Long error messages cost you. Generally, try to keep error messages 
[below 32 ASCII characters](https://medium.com/@chebyk.in/how-big-is-solidity-custom-error-messages-overhead-1e915724b450).

If you feel you need longer error messages, it's best practice to store them
within your client/front end.

Instead of:

`require(
    currentPhase == Phase.Open,
    "Must be Open Phase to redeem tokens"
);`

Consider:

`require(
    currentPhase == Phase.Open,
    "E_NOT_OPEN"
);`

**[Q-6]** Adding whitelisted addresses 1 by 1 is very gas inefficient

Each Ethereum transaction has an initial fixed cost of 21_000 gas, which
is in addition to the cost of executing computation and storing variables
in the contract. By only allowing a single whitelisted address to be added
per function call, this is going to waste a lot of gas compared to a function
which takes in an array of whitelisted addresses and adds them in a single
transaction.

Consider changing the function to accept an `address[]` as an argument, where the function loops through these addresses adding them all in a single function call.


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | 2 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | 2 |

Total: 4

Great Job!
