pragma solidity 0.4.19;


contract XMirrorSwap {
    struct Swap {
        uint256 value;
        address targetAddress;
        address refundAddress;
        uint256 expiryTimestamp;
    }

    mapping(bytes32 => Swap) _pendingSwaps;

    function prepareSwap(address targetAddress, bytes32 hashlock, uint256 timelimit) public payable {
        uint256 value = msg.value;
        require(value > 0);
        require(timelimit <= 30 * 24 * 60 * 60);
        address refundAddress = msg.sender;
        uint256 expiryTimestamp = block.timestamp + timelimit;
        _pendingSwaps[hashlock] = Swap({
            value : value,
            targetAddress : targetAddress,
            refundAddress : refundAddress,
            expiryTimestamp : expiryTimestamp
        });
        SwapInitiated(
            value,
            targetAddress,
            refundAddress,
            expiryTimestamp,
            hashlock
        );
    }

    function fulfillSwap(bytes32 preimage) public {
        bytes32 hashlock = sha256(preimage);
        Swap storage swap = _pendingSwaps[hashlock];
        require(swap.value > 0);
        // Check existence
        require(block.timestamp < swap.expiryTimestamp);
        // Check not expired
        require(msg.sender == swap.targetAddress);
        msg.sender.transfer(swap.value);
        SwapCompleted(
                swap.value,
                msg.sender,
                hashlock,
                preimage
        );
        delete _pendingSwaps[hashlock];

    }

    function refundSwap(bytes32 hashlock) public {
        Swap storage swap = _pendingSwaps[hashlock];
        // Check existence
        require(swap.value > 0);
        // Check expired
        require(block.timestamp >= swap.expiryTimestamp);
        require(msg.sender == swap.refundAddress);
        msg.sender.transfer(swap.value);
        SwapRefunded(
            swap.value,
            msg.sender,
            hashlock
        );
        delete _pendingSwaps[hashlock];
    }

    event SwapInitiated(
        uint256 value,
        address targetAddress,
        address refundAddress,
        uint256 expiryTimestamp,
        bytes32 hashlock
    );

    event SwapFulfilled(
        uint256 value,
        address targetAddress,
        bytes32 hashlock,
        bytes32 preimage
    );

    event SwapRefunded(
        uint256 value,
        address refundAddress,
        bytes32 hashlock
    );
}