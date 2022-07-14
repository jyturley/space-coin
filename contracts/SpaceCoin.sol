//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpaceCoin is ERC20 {
    uint256 public constant TOTAL_SUPPLY = 500000 * (10**18);
    uint256 public constant SUPPLY_FOR_INVESTORS = 150000 * (10**18);
    uint256 public constant FEE_PERCENT = 2;
    uint256 public constant PERCENT_DENOMINATOR = 100;

    address public immutable manager;
    bool public transferTaxActive = false;
    address payable public immutable treasury;

    event TransferTaxEnabled();
    event TransferTaxDisabled();

    constructor(
        address _manager,
        address payable _treasuryAddress,
        address payable _icoTreasury
    ) ERC20("SpaceCoin", "SPC") {
        require(_manager != address(0), "Cannot use zero address");
        require(_treasuryAddress != address(0), "Cannot use zero address");
        require(_icoTreasury != address(0), "Cannot use zero address");
        manager = _manager;
        treasury = _treasuryAddress;
        _mint(_icoTreasury, SUPPLY_FOR_INVESTORS);
        _mint(treasury, TOTAL_SUPPLY - SUPPLY_FOR_INVESTORS);
    }

    function enableTransferTax() external {
        require(msg.sender == manager, "Invalid permissions");
        require(!transferTaxActive, "Transfer tax already active");
        transferTaxActive = true;
        emit TransferTaxEnabled();
    }

    function disableTransferTax() external {
        require(msg.sender == manager, "Invalid permissions");
        require(transferTaxActive, "Transfer tax already inactive");
        transferTaxActive = false;
        emit TransferTaxDisabled();
    }

    // Overrides the ERC20 contract to include fee collection (if active)
    function transfer(address to, uint256 amount)
        public
        virtual
        override
        returns (bool)
    {
        require(amount > 0, "Must transfer more than 0");
        if (transferTaxActive) {
            uint256 fee = (amount * FEE_PERCENT) / PERCENT_DENOMINATOR;
            amount -= fee;
            bool success = super.transfer(treasury, fee);
            require(success, "Unable to transfer to treasury");
        }
        return super.transfer(to, amount);
    }
}
