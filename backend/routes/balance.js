const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Devnet Connection
const connection = new Connection('https://devnet.helius-rpc.com/?api-key=cd40d90d-d828-40c6-b9b4-db165f97a01f');

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let onChainBalance = 0;

    // Fetch balance from Solana Devnet if deposit address exists
    if (user.depositAddress) {
        try {
            const pubKey = new PublicKey(user.depositAddress);
            const balance = await connection.getBalance(pubKey);
            onChainBalance = balance / LAMPORTS_PER_SOL;
        } catch (err) {
            console.error("Error fetching on-chain balance:", err.message);
            // Fallback to DB balance or 0 if RPC fails
            onChainBalance = user.privateBalance || 0;
        }
    }

    // Update DB with latest balance (Optional, but good for sync)
    if (user.privateBalance !== onChainBalance) {
        user.privateBalance = onChainBalance;
        await user.save();
    }

    res.json({ 
        privateBalance: onChainBalance,
        depositAddress: user.depositAddress 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
