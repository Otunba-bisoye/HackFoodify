import {
  getOrCreateLandmarkFromAddress,
  searchLandmarkNodes,
  recordRiderDropoffPing,
} from '../services/landmarkService.js';

// POST /api/landmarks/resolve
export const resolveAddress = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ success: false, error: 'Address string is required.' });
    }

    const landmarkNode = await getOrCreateLandmarkFromAddress(address);

    return res.status(200).json({
      success: true,
      data: landmarkNode,
      hasCoordinates: !!(landmarkNode.latitude && landmarkNode.longitude),
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// GET /api/landmarks/search?q=zone+c
export const searchAutocomplete = async (req, res) => {
  try {
    const rawQuery = req.query.q;

    if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const results = await searchLandmarkNodes(rawQuery.trim());

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/landmarks/ping
export const recordRiderPing = async (req, res) => {
  try {
    const { landmarkId, lat, lng } = req.body;

    if (!landmarkId || typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'landmarkId, lat, and lng are required.',
      });
    }

    const updatedLandmark = await recordRiderDropoffPing(landmarkId, lat, lng);

    return res.status(200).json({
      success: true,
      message: 'Location coordinates verified successfully.',
      data: updatedLandmark,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};