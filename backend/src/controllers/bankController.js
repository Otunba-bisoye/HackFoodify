import { squadClient } from '../config/squad.js';


/**
 * 1. Resolve & Verify Vendor Account Name
 * POST /api/vendor/resolve-account
 */
export const resolveAccount = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        success: false,
        message: 'Account number and bank code are required.',
      });
    }

    const response = await squadClient.post('/payout/account/lookup', {
      bank_code: bankCode,
      account_number: accountNumber,
    });

    const lookupData = response.data?.data;

    if (!lookupData || !lookupData.account_name) {
      return res.status(400).json({
        success: false,
        message: 'Account could not be resolved with the selected bank.',
      });
    }

    return res.status(200).json({
      success: true,
      accountName: lookupData.account_name,
      accountNumber: lookupData.account_number,
    });
  } catch (error) {
    console.error('Squad Account Resolution Error:', error.response?.data || error.message);
    return res.status(400).json({
      success: false,
      message: error.response?.data?.message || 'Invalid or unresolvable bank account details.',
    });
  }
};


