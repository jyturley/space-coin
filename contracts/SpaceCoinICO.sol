//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./SpaceCoin.sol";

contract SpaceCoinICO {
    uint256 public constant ICO_GOAL = 30000 ether;
    uint256 public constant RATE = 5; // 5 SPC tokens for 1 ETH
    uint256 public constant SEED_PHASE_CONTRIB_MAX = 15000 ether;
    uint256 public constant SEED_INDIVDUAL_CONTRIB_MAX = 1500 ether;
    uint256 public constant GENERAL_PHASE_CONTRIB_MAX = 30000 ether;
    uint256 public constant GENERAL_INDIVDUAL_CONTRIB_MAX = 1000 ether;

    SpaceCoin public tokenContract;
    address public immutable manager;
    address payable public treasury;

    bool public isPaused = false;
    uint256 public weiRaised = 0;

    mapping(address => bool) public whitelist;
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public tokensToCollect;

    enum Phase {
        Seed,
        General,
        Open
    }
    Phase public currentPhase = Phase.Seed;

    event SpaceCoinDeployedAndMinted(
        address tokenContract,
        uint256 totalSupply
    );
    event ICOPhaseChanged(Phase newPhase, uint256 totalRaisedSoFar);
    event ICONowPaused();
    event ICONowActive();
    event TokensPurchased(
        address indexed buyer,
        address indexed beneficiary,
        uint256 valueInWei,
        uint256 number
    );
    event TokensRedeemed(address indexed account, uint256 numTokens);
    event WhitelistAdded(address indexed account);

    modifier onlyManager() {
        require(msg.sender == manager, "Invalid permissions");
        _;
    }

    modifier activeICO() {
        require(!isPaused, "ICO must be active");
        _;
    }

    constructor(address _manager, address payable _treasuryAddress) {
        manager = _manager;
        treasury = _treasuryAddress;
        tokenContract = new SpaceCoin(
            _manager,
            _treasuryAddress,
            payable(address(this))
        );

        emit SpaceCoinDeployedAndMinted(
            address(tokenContract),
            tokenContract.totalSupply()
        );
    }

    receive() external payable {
        buyTokens(msg.sender);
    }

    function buyTokens(address _beneficiary) public payable activeICO {
        require(_beneficiary != address(0), "Invalid address");
        require(
            (weiRaised + msg.value) <= ICO_GOAL,
            "Contribution exceeds ICO goal"
        );
        if (currentPhase == Phase.Seed) {
            return buyTokensForSeedPhase(_beneficiary);
        }

        if (currentPhase == Phase.General) {
            return buyTokensForGeneralPhase(_beneficiary);
        }

        // Phase Open
        uint256 numTokens = weiToTokens(msg.value);
        weiRaised += msg.value;
        contributions[_beneficiary] += msg.value;
        bool success = tokenContract.transfer(_beneficiary, numTokens);
        require(success, "Unable to transfer tokens");

        moveSalesToTreasury();
        emit TokensPurchased(msg.sender, _beneficiary, msg.value, numTokens);
    }

    function redeemTokens() external payable activeICO {
        require(
            currentPhase == Phase.Open,
            "Must be Open Phase to redeem tokens"
        );
        require(tokensToCollect[msg.sender] > 0, "No tokens to collect");
        uint256 numTokens = tokensToCollect[msg.sender];
        tokensToCollect[msg.sender] = 0;
        bool success = tokenContract.transfer(msg.sender, numTokens);
        require(success, "Unable to transfer tokens");
        emit TokensRedeemed(msg.sender, numTokens);
    }

    function beginGeneralPhase() external onlyManager activeICO {
        require(
            currentPhase == Phase.Seed,
            "Project must be in Seed Phase to advance to General"
        );
        currentPhase = Phase.General;
        emit ICOPhaseChanged(Phase.General, weiRaised);
    }

    function beginOpenPhase() external onlyManager activeICO {
        require(
            currentPhase == Phase.General,
            "Project must be in General Phase to advance to Open"
        );
        currentPhase = Phase.Open;
        emit ICOPhaseChanged(Phase.Open, weiRaised);
    }

    function pauseICO() external onlyManager {
        require(!isPaused, "ICO is already paused");
        isPaused = true;
        emit ICONowPaused();
    }

    function resumeICO() external onlyManager {
        require(isPaused, "ICO is already active");
        isPaused = false;
        emit ICONowActive();
    }

    function addToWhitelist(address _account) external onlyManager {
        require(
            currentPhase == Phase.Seed,
            "Whitelist is for seed phase investors"
        );
        require(_account != address(0), "Invalid account for whitelist");
        whitelist[_account] = true;
        emit WhitelistAdded(_account);
    }

    function isWhitelisted(address _account) public view returns (bool) {
        require(_account != address(0), "Invalid account");
        return whitelist[_account];
    }

    function weiToTokens(uint256 _weiAmount) internal pure returns (uint256) {
        return _weiAmount * RATE;
    }

    function buyTokensForSeedPhase(address _beneficiary) private {
        require(
            isWhitelisted(_beneficiary),
            "Only whitelisted addresses can buy tokens at this phase"
        );
        require(
            (contributions[_beneficiary] + msg.value) <=
                SEED_INDIVDUAL_CONTRIB_MAX,
            "Contribution exceeds Seed Phase individual limit"
        );
        require(
            (weiRaised + msg.value) <= SEED_PHASE_CONTRIB_MAX,
            "Contribution exceeds Seed Phase total contribution limit"
        );
        uint256 numTokens = weiToTokens(msg.value);
        weiRaised += msg.value;
        contributions[_beneficiary] += msg.value;
        tokensToCollect[_beneficiary] += numTokens;
        moveSalesToTreasury();
        emit TokensPurchased(msg.sender, _beneficiary, msg.value, numTokens);
    }

    function buyTokensForGeneralPhase(address _beneficiary) private {
        require(
            (contributions[_beneficiary] + msg.value) <=
                GENERAL_INDIVDUAL_CONTRIB_MAX,
            "Contribution exceeds Seed General individual limits"
        );
        require(
            (weiRaised + msg.value) <= GENERAL_PHASE_CONTRIB_MAX,
            "Contribution exceeds Seed General total contribution limit"
        );
        uint256 numTokens = weiToTokens(msg.value);
        weiRaised += msg.value;
        contributions[_beneficiary] += msg.value;
        tokensToCollect[_beneficiary] += numTokens;
        moveSalesToTreasury();
        emit TokensPurchased(msg.sender, _beneficiary, msg.value, numTokens);
    }

    function moveSalesToTreasury() private {
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Unable to transfer sales to treasury");
    }
}
