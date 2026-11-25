export function parseZoneShorthand(token) {
  const match = token.trim().match(/^([a-z])(\d+)$/i); // Matches C6, A12, B3
  if (match) {
    const letter = match[1].toUpperCase();
    const houseNumber = match[2];
    return {
      canonicalName: `Zone ${letter}`,
      shorthandToken: `${letter.toLowerCase()}${houseNumber}`,
      letterAlias: letter.toLowerCase(),
      houseNumber,
    };
  }
  return null;
}

export function parseAddressString(fullAddress) {
  const rawParts = fullAddress.split(',').map((part) => part.trim()).filter(Boolean);

  const cleanParts = rawParts.filter(
    (part) => !/^(no\.?\s*)?\d+[a-z]?$/i.test(part) && !/^flat\s*\d+[a-z]?$/i.test(part)
  );

  if (cleanParts.length === 0) {
    throw new Error('Invalid address format provided.');
  }

  const firstPart = cleanParts[0];
  const shorthand = parseZoneShorthand(firstPart);

  const targetName = shorthand ? shorthand.canonicalName : firstPart;
  const cityName = cleanParts.length > 1 ? cleanParts[cleanParts.length - 1] : 'Abeokuta';
  const districtName = cleanParts.length > 2 ? cleanParts[cleanParts.length - 2] : cityName;
  const parentArea = cleanParts.length > 3 ? cleanParts[1] : districtName;
  const majorCorridor = cleanParts.length > 4 ? cleanParts[2] : null;

  const primarySearchToken = `${targetName} ${parentArea}`.toLowerCase().trim();
  const shorthandSearchToken = shorthand
    ? `${shorthand.shorthandToken} ${parentArea}`.toLowerCase().trim()
    : primarySearchToken;

  const searchAliases = [
    primarySearchToken,
    `${targetName} ${districtName}`.toLowerCase().trim(),
    targetName.toLowerCase().trim(),
  ];

  if (shorthand) {
    searchAliases.push(
      shorthandSearchToken,
      `${shorthand.letterAlias} ${parentArea}`.toLowerCase(),
      `${shorthand.shorthandToken}`
    );
  }

  return {
    targetName,
    parentArea,
    majorCorridor,
    districtName,
    cityName,
    primarySearchToken,
    shorthandSearchToken,
    searchAliases: Array.from(new Set(searchAliases)),
  };
}