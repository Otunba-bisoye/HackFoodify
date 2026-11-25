import { prisma } from '../config/db.js';
import { parseAddressString, parseZoneShorthand } from '../utils/addressParser.js';

export async function getOrCreateLandmarkFromAddress(fullAddress) {
  const parsed = parseAddressString(fullAddress);

  let landmark = await prisma.landmarkNode.findFirst({
    where: {
      searchAliases: {
        hasSome: [
          parsed.primarySearchToken,
          parsed.shorthandSearchToken,
          parsed.targetName.toLowerCase(),
        ],
      },
    },
  });

  if (landmark) {
    return landmark;
  }

  landmark = await prisma.landmarkNode.create({
    data: {
      canonicalName: parsed.targetName,
      parentArea: parsed.parentArea || undefined,
      majorCorridor: parsed.majorCorridor || undefined,
      district: parsed.districtName || undefined,
      city: parsed.cityName || undefined,
      searchAliases: parsed.searchAliases,
      verificationScore: 0,
      isVerified: false,
    },
  });

  return landmark;
}

export async function searchLandmarkNodes(query) {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  let targetToken = cleanQuery;
  let parsedAliases = [];

  // 1. Leverage parseAddressString to strip house numbers & resolve shorthand
  try {
    const parsed = parseAddressString(query);
    targetToken = parsed.targetName.toLowerCase(); // Resolves "6, Zone C" -> "zone c" or "c6" -> "zone c"
    parsedAliases = [
      parsed.targetName,
      parsed.targetName.toLowerCase(),
      parsed.primarySearchToken,
      parsed.shorthandSearchToken,
      ...parsed.searchAliases,
    ];
  } catch (err) {
    // Fallback if address parsing fails (e.g. input is purely numbers)
    targetToken = cleanQuery;
  }

  // 2. Also check shorthand directly for single-token entries ("c6")
  const shorthand = parseZoneShorthand(cleanQuery);

  // 3. Build comprehensive token list for array matching
  const aliasTokens = Array.from(
    new Set(
      [
        cleanQuery,
        cleanQuery.toUpperCase(),
        targetToken,
        targetToken.toUpperCase(),
        shorthand?.canonicalName,
        shorthand?.letterAlias,
        shorthand?.letterAlias?.toUpperCase(),
        ...parsedAliases,
      ].filter(Boolean)
    )
  );

  // 4. Query Prisma with parsed target name and generated aliases
  const landmarks = await prisma.landmarkNode.findMany({
    where: {
      OR: [
        { canonicalName: { contains: targetToken, mode: 'insensitive' } },
        { canonicalName: { contains: cleanQuery, mode: 'insensitive' } },
        { parentArea: { contains: cleanQuery, mode: 'insensitive' } },
        { district: { contains: cleanQuery, mode: 'insensitive' } },
        { searchAliases: { hasSome: aliasTokens } },
      ],
    },
    take: 10,
    orderBy: [
      { verificationScore: 'desc' },
      { isVerified: 'desc' },
      { canonicalName: 'asc' },
    ],
  });

  return landmarks;
}

export async function recordRiderDropoffPing(
  landmarkId,
  riderLat,
  riderLng
) {
  const landmark = await prisma.landmarkNode.findUnique({
    where: { id: landmarkId },
  });

  if (!landmark) {
    throw new Error('Landmark Node not found.');
  }

  let updatedLat
  let updatedLng
  const currentScore = landmark.verificationScore;

  // 1. Calculate new weighted average coordinates if coordinates already exist
  if (landmark.latitude !== null && landmark.longitude !== null && currentScore > 0) {
    updatedLat = (landmark.latitude * currentScore + riderLat) / (currentScore + 1);
    updatedLng = (landmark.longitude * currentScore + riderLng) / (currentScore + 1);
  } else {
    // First valid ping recorded
    updatedLat = riderLat;
    updatedLng = riderLng;
  }

  // 2. Increment score (cap at 5)
  const newScore = Math.min(currentScore + 1, 5);

  // 3. Persist update in Prisma
  const updatedLandmark = await prisma.landmarkNode.update({
    where: { id: landmarkId },
    data: {
      latitude: Number(updatedLat.toFixed(6)),
      longitude: Number(updatedLng.toFixed(6)),
      verificationScore: newScore,
      isVerified: newScore >= 3, // Automatically verifies at 3+ pings
    },
  });

  return updatedLandmark;
}