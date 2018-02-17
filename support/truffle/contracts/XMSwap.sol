pragma solidity 0.4.19;

contract XMSwap {
    struct Swap {
        bool exists;
        bool pending;
        address sender;
        address recipient;
        uint256 value;
        uint256 expiry;
    }

    mapping(bytes32 => Swap) public _swaps;

    function prepareSwap(
        address recipient,
        bytes32 hashlock,
        uint256 refundDelay
    ) public payable {
        require(msg.value > 0);
        require(refundDelay > 0);
        require(!_swaps[hashlock].exists);
        uint256 expiry = block.timestamp + refundDelay;
        // Integer overflow
        require(expiry > block.timestamp);
        _swaps[hashlock] = Swap({
            exists : true,
            pending : true,
            sender : msg.sender,
            recipient : recipient,
            value : msg.value,
            expiry : expiry
            });
        SwapPrepared(
            hashlock,
            msg.sender,
            recipient,
            msg.value,
            expiry
        );
    }

    function fulfillSwap(
        bytes32 preimage
    ) public {
        bytes32 hashlock = sha256(preimage);
        Swap storage swap = _swaps[hashlock];
        require(swap.exists && swap.pending);
        require(msg.sender == swap.recipient);
        require(block.timestamp < swap.expiry);
        msg.sender.transfer(swap.value);
        swap.pending = false;
        SwapFulfilled(hashlock, preimage);
    }

    function refundSwap(
        bytes32 hashlock
    ) public {
        Swap storage swap = _swaps[hashlock];
        require(swap.exists && swap.pending);
        require(msg.sender == swap.sender);
        require(block.timestamp >= swap.expiry);
        msg.sender.transfer(swap.value);
        swap.pending = false;
        SwapRefunded(hashlock);
    }

    event SwapPrepared(
        bytes32 indexed hashlock,
        address sender,
        address recipient,
        uint256 value,
        uint256 expiry
    );

    event SwapFulfilled(
        bytes32 indexed hashlock,
        bytes32 preimage
    );

    event SwapRefunded(
        bytes32 indexed hashlock
    );
}