const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Mainnet Connection
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=9b5e747a-f1c2-4c67-8294-537ad41e92b6');

router.get('/:walletAddress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Return balance from DB (Source of Truth)
    // Deposit wallet is swept to Relayer, so we don't check on-chain balance of deposit address anymore.
    
    res.json({ 
        privateBalance: user.privateBalance || 0,
        depositAddress: user.depositAddress 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
