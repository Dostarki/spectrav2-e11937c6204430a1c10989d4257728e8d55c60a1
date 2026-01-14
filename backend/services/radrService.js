
const { ShadowWireClient, initWASM, TokenUtils } = require('@radr/shadowwire');

let client = null;
let isInitialized = false;

class RadrService {
    
    static async init() {
        if (isInitialized) return;
        try {
            // Initialize WASM for ZK Proofs
            await initWASM();
            
            // Initialize Client
            // Debug mode enabled for logs
            client = new ShadowWireClient({ 
                debug: true 
            });
            
            isInitialized = true;
            console.log("? ShadowWire SDK Initialized");
        } catch (error) {
            console.error("? ShadowWire Init Failed:", error);
        }
    }

    // Generate Unsigned Deposit Transaction
    static async createDepositTx(walletAddress, amountSOL) {
        if (!isInitialized) await this.init();
        
        try {
            console.log(`Creating Deposit TX for ${walletAddress}, Amount: ${amountSOL}`);

            // Convert SOL to Lamports (Manual calculation to be safe)
            // SOL has 9 decimals. 1 SOL = 1,000,000,000 Lamports
            const amountLamports = Math.floor(Number(amountSOL) * 1_000_000_000);
            console.log(`Converted Amount: ${amountSOL} SOL -> ${amountLamports} Lamports`);

            if (isNaN(amountLamports) || amountLamports <= 0) {
                throw new Error("Invalid amount conversion");
            }
            
            // Call ShadowWire SDK
            const response = await client.deposit({
                wallet: walletAddress,
                amount: amountLamports, // Send as Integer
                token: 'SOL'
            });
            
            console.log("Deposit TX Response:", response);
            // Handle different response formats (SDK vs Raw API)
            return response.unsigned_tx_base64 || response.transaction;
        } catch (error) {
            console.error("ShadowWire Deposit Error:", error);
            throw error;
        }
    }

    // Generate Unsigned Withdraw Transaction
    static async createWithdrawTx(walletAddress, amountSOL, destinationAddress = null) {
        if (!isInitialized) await this.init();
        
        try {
            console.log(`Creating Withdraw TX for ${walletAddress}, Amount: ${amountSOL}, Dest: ${destinationAddress}`);
            
            // Convert SOL to Lamports (Manual calculation)
            const amountLamports = Math.floor(Number(amountSOL) * 1_000_000_000);
            console.log(`Converted Withdraw Amount: ${amountSOL} SOL -> ${amountLamports} Lamports`);

            if (isNaN(amountLamports) || amountLamports <= 0) {
                throw new Error("Invalid amount conversion");
            }

            // Call ShadowWire SDK
            // Trying to send 'recipient' or 'destination' to allow transfer to another wallet
            const payload = {
                wallet: walletAddress,
                amount: amountLamports, // Send as Integer
                token: 'SOL'
            };

            if (destinationAddress && destinationAddress !== walletAddress) {
                payload.recipient = destinationAddress; // Try 'recipient' field
                payload.destination = destinationAddress; // Try 'destination' field as fallback
            }

            const response = await client.withdraw(payload);
            
            console.log("Withdraw TX Response:", response);
            return response.unsigned_tx_base64 || response.transaction;
        } catch (error) {
            console.error("ShadowWire Withdraw Error:", error);
            throw error;
        }
    }

    // Internal Transfer (Shielded)
    // Sender -> Recipient (Both hidden)
    static async createTransferTx(senderWallet, recipientWallet, amountSOL) {
        if (!isInitialized) await this.init();

        try {
            // SDK's transfer method handles everything
            const result = await client.transfer({
                sender: senderWallet,
                recipient: recipientWallet,
                amount: amountSOL, // Transfer method takes SOL amount, not lamports (according to docs)
                token: 'SOL',
                type: 'internal'
            });

            return result;
        } catch (error) {
            console.error("ShadowWire Transfer Error:", error);
            throw error;
        }
    }

    // Get Shielded Balance
    static async getBalance(walletAddress) {
        if (!isInitialized) await this.init();
        try {
            const balance = await client.getBalance(walletAddress, 'SOL');
            return balance; // { available, pool_address }
        } catch (error) {
            console.error("ShadowWire Balance Error:", error);
            return { available: 0 };
        }
    }
}

module.exports = RadrService;
