pragma solidity 0.4.19;

contract XMirrorSwap {
    bytes32 public _hashlock;
    uint256 public _expiryTimestamp;
    address public _owner;
    address public _recipient;

    function XMirrorSwap(bytes32 hashlock, uint256 timelimit, address recipient) public payable {
        require(msg.value > 0);
        _owner = msg.sender;
        _recipient = recipient;
        _hashlock = hashlock;
        _expiryTimestamp = block.timestamp + timelimit;
        // Check integer overflow
        require(_expiryTimestamp >= block.timestamp);
    }

    function fulfill(bytes32 preimage) public {
        bytes32 hashlock = sha256(preimage);
        require(hashlock == _hashlock);
        require(msg.sender == _recipient);
        require(block.timestamp < _expiryTimestamp);
        selfdestruct(msg.sender);
    }

    function refund() public {
        require(msg.sender == _owner);
        require(block.timestamp >= _expiryTimestamp);
        selfdestruct(msg.sender);
    }
}