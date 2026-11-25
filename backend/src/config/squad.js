import axios from 'axios'
import "dotenv/config"

// Pre-configured Axios instance for Squad API (Sandbox)
// Switch to 'https://api-d.squadco.com' when going live
export const squadClient = axios.create({
  baseURL: 'https://sandbox-api-d.squadco.com',
  headers: {
    Authorization: `Bearer ${process.env.SQUAD_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});


/**
 * ==========================================
 * PART 2: VENDOR PAYOUTS & WITHDRAWALS
 * ==========================================
 */

/**
 * 1. Get Supported Nigerian Banks List (For vendor bank dropdowns)
 */
export const getBanks = async () => {
  try {
    const response = await squadClient.get('/payout/bank-list');
    return response.data; // Returns list of banks with codes
  } catch (error) {
    console.error("Squad Get Banks Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to fetch bank list from Squad");
  }
};

/**
 * 2. Resolve Vendor Bank Account Details (Verify NUBAN Name before withdrawal)
 */
export const resolveBankAccount = async (accountNumber, bankCode) => {
  try {
    const response = await squadClient.post('/payout/account/lookup', {
      bank_code: bankCode,
      account_number: accountNumber,
    });
    return response.data; // Returns account_name and account_number
  } catch (error) {
    console.error("Squad Bank Resolution Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Invalid or unresolvable bank account details");
  }
};

/**
 * 3. Initiate Vendor Payout / Withdrawal from Squad Ledger to Bank
 * @param {Object} params
 * @param {number} params.amount Amount in Naira to withdraw
 * @param {string} params.bankCode Vendor bank code
 * @param {string} params.accountNumber Vendor 10-digit NUBAN
 * @param {string} params.accountName Verified account name of the vendor
 * @param {string} params.remark Narration/Description for the transfer
 */
export const initiateVendorPayout = async ({
  amount,
  bankCode,
  accountNumber,
  accountName,
  remark = "Vendor Payout Withdrawal",
}) => {
  try {
    const response = await squadClient.post('/payout/transfer', {
      amount: Math.round(amount * 100), // Amount in Kobo
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
      currency: 'NGN',
      remark: remark,
    });
    return response.data; // Returns transfer status, transaction reference, etc.
  } catch (error) {
    console.error("Squad Vendor Payout Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to process vendor withdrawal");
  }
};