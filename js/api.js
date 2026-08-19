/**
 * ICE Jail Tax - Address & Property Valuation API Client
 * Primary: Hagerstown Rapid Response Address Checker REST API (with CORS support)
 * Fallback: U.S. Census Geocoder + Maryland iMAP Property Data ArcGIS REST API
 */

const FACILITY_CONFIG = {
  id: 'washington',
  name: 'Proposed Washington County ICE Jail',
  address: '10900 Hopewell Road / 16220 Wright Road, Williamsport, MD 21795',
  latitude: 39.616220,
  longitude: -77.802920,
  maxRadius: 2.49,
  studyRadii: [
    {
      radius: 1.24,
      rate: 0.034,
      percent: 3.4,
      strength: 'Strong',
      significance: 'Statistically significant (p < 0.01)',
      description: 'Strongest distance-based result in the MIT Press study.'
    },
    {
      radius: 1.86,
      rate: 0.020,
      percent: 2.0,
      strength: 'Weaker',
      significance: 'Weaker statistical evidence (p < 0.10)',
      description: 'Statistically significant at the 10% level.'
    },
    {
      radius: 2.49,
      rate: 0.018,
      percent: 1.8,
      strength: 'Weaker',
      significance: 'Weaker statistical evidence (p < 0.10)',
      description: 'Statistically significant at the 10% level.'
    }
  ],
  studyUrl: 'https://direct.mit.edu/rest/article/106/6/1442/113773/The-Local-Economic-Impacts-of-Prisons',
  propertyDataUrl: 'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_PropertyData/MapServer/0',
  actionUrl: 'https://NoKingsNoCamps.com/',
  actionLabel: 'Submit a Public Comment',
  actionPrompt: 'Submit a public comment opposing the ICE jail and include these figures so DHS and local leaders understand what this facility could cost you.'
};

/**
 * Calculates Haversine distance in miles between two coordinates
 */
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determines the applicable study estimate based on distance in miles
 */
function getStudyEstimate(distanceMiles) {
  if (distanceMiles <= 1.24) {
    return {
      radiusMiles: 1.24,
      reductionRate: 0.034,
      reductionPercent: 3.4,
      statisticalStrength: 'Strong',
      significanceText: 'Statistically significant (p < 0.01)',
      isStatisticallySignificant: true
    };
  } else if (distanceMiles <= 1.86) {
    return {
      radiusMiles: 1.86,
      reductionRate: 0.020,
      reductionPercent: 2.0,
      statisticalStrength: 'Weaker',
      significanceText: 'Weaker statistical evidence (p < 0.10)',
      isStatisticallySignificant: true
    };
  } else if (distanceMiles <= 2.49) {
    return {
      radiusMiles: 2.49,
      reductionRate: 0.018,
      reductionPercent: 1.8,
      statisticalStrength: 'Weaker',
      significanceText: 'Weaker statistical evidence (p < 0.10)',
      isStatisticallySignificant: true
    };
  }
  return null;
}

/**
 * Primary check function
 */
async function checkAddress(address) {
  const trimmed = (address || '').trim();
  if (!trimmed) {
    throw new Error('Please enter a valid street address.');
  }

  // Attempt primary API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch('https://hagerstownrapidresponse.com/wp-json/hrr-address-checker/v1/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ address: trimmed }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return data;
    }

    // If 404 or specific error returned by server
    const errData = await res.json().catch(() => ({}));
    if (res.status === 404 && errData.code === 'hrr_address_not_found') {
      // Try fallback direct geocoding before failing
      return await fallbackCheckAddress(trimmed, errData.message);
    }

    throw new Error(errData.message || 'Lookup failed.');
  } catch (err) {
    console.warn('Primary API unavailable or failed, falling back to Census + iMAP...', err);
    return await fallbackCheckAddress(trimmed, err.message);
  }
}

/**
 * Fallback address lookup using US Census Bureau Geocoder and MD iMAP
 */
async function fallbackCheckAddress(address, previousErrorMessage) {
  // 1. Geocode with US Census Geocoder
  const censusUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  
  let coords = null;
  let matchedAddress = address;

  try {
    const geoRes = await fetch(censusUrl);
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const matches = geoData?.result?.addressMatches || [];
      if (matches.length > 0) {
        coords = {
          lat: matches[0].coordinates.y,
          lon: matches[0].coordinates.x
        };
        matchedAddress = matches[0].matchedAddress;
      }
    }
  } catch (e) {
    console.warn('Census Geocoder failed:', e);
  }

  if (!coords) {
    throw new Error(
      previousErrorMessage ||
      'We could not locate that address. Please check the street number, name, city, and ZIP code (e.g. 16715 Buford Dr, Williamsport, MD 21795) and try again.'
    );
  }

  // 2. Calculate straight-line distance to facility
  const distanceMiles = haversineMiles(coords.lat, coords.lon, FACILITY_CONFIG.latitude, FACILITY_CONFIG.longitude);
  const withinRadius = distanceMiles <= FACILITY_CONFIG.maxRadius;
  const studyEstimate = getStudyEstimate(distanceMiles);

  // 3. Attempt to fetch Maryland SDAT Valuation from MD iMAP ArcGIS
  let valuation = null;
  let propertyMatched = false;

  try {
    const imapQueryUrl = `https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_PropertyData/MapServer/0/query?geometry=${coords.lon},${coords.lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&distance=40&units=esriSRUnit_Meter&outFields=OBJECTID,ADDRESS,NFMTTLVL,SDATDATE,ZIPCODE,CITY,LU&returnGeometry=false&f=pjson`;
    
    const imapRes = await fetch(imapQueryUrl);
    if (imapRes.ok) {
      const imapData = await imapRes.json();
      const features = imapData?.features || [];
      if (features.length > 0) {
        const attr = features[0].attributes;
        const appraisedValue = Number(attr.NFMTTLVL) || 0;
        if (appraisedValue > 0 && studyEstimate) {
          const potentialReduction = Math.round(appraisedValue * studyEstimate.reductionRate);
          const reducedValue = appraisedValue - potentialReduction;
          valuation = {
            appraisedValue,
            potentialReduction,
            reducedValue,
            reductionRate: studyEstimate.reductionRate,
            reductionPercent: studyEstimate.reductionPercent,
            propertyAddress: attr.ADDRESS || matchedAddress,
            propertyRecordUrl: `https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_PropertyData/MapServer/0/query?where=OBJECTID=${attr.OBJECTID}&outFields=ADDRESS,NFMTTLVL,SDATDATE&returnGeometry=false&f=pjson`,
            dataUpdated: attr.SDATDATE ? `${attr.SDATDATE.slice(4)} ${attr.SDATDATE.slice(0, 4)}` : 'May 2026'
          };
          propertyMatched = true;
        }
      }
    }
  } catch (e) {
    console.warn('iMAP valuation lookup skipped/failed:', e);
  }

  return {
    facilityId: 'washington',
    withinRadius: withinRadius,
    withinStudyArea: withinRadius,
    distanceMiles: Number(distanceMiles.toFixed(4)),
    radiusMiles: FACILITY_CONFIG.maxRadius,
    studyEstimate: studyEstimate,
    matchedAddress: matchedAddress,
    latitude: coords.lat,
    longitude: coords.lon,
    distanceSource: propertyMatched ? 'maryland_property' : 'census',
    propertyMatched: propertyMatched,
    valuation: valuation
  };
}

/**
 * Calculates manual impact for custom valuation and custom distance/rate
 */
function calculateManualValuation(homeValue, reductionPercent) {
  const value = Math.max(0, Number(homeValue) || 0);
  const rate = (Number(reductionPercent) || 0) / 100;
  const potentialReduction = Math.round(value * rate);
  const reducedValue = Math.max(0, value - potentialReduction);
  return {
    appraisedValue: value,
    reductionPercent: Number(reductionPercent),
    reductionRate: rate,
    potentialReduction,
    reducedValue
  };
}

window.IceJailTaxAPI = {
  FACILITY_CONFIG,
  checkAddress,
  haversineMiles,
  getStudyEstimate,
  calculateManualValuation
};
