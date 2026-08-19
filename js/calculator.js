/**
 * ICE Jail Tax - Calculator UI & Interaction Controller
 */

(function () {
  'use strict';

  function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);
  }

  function formatPercent(val) {
    return (Number(val) || 0).toFixed(1) + '%';
  }

  function formatDistance(dist) {
    const num = Number(dist) || 0;
    return num.toFixed(2);
  }

  // DOM Elements
  const addressForm = document.getElementById('address-form');
  const addressInput = document.getElementById('address-input');
  const submitButton = document.getElementById('submit-btn');
  const resultsContainer = document.getElementById('results-section');
  const resultCard = document.getElementById('result-card');
  const exampleButtons = document.querySelectorAll('[data-example-address]');

  // Manual Calculator Elements
  const manualValueInput = document.getElementById('manual-home-value');
  const manualRadiusSelect = document.getElementById('manual-radius-select');
  const manualLossResult = document.getElementById('manual-loss-result');
  const manualAfterResult = document.getElementById('manual-after-result');
  const manualRateLabel = document.getElementById('manual-rate-label');

  // Active lookup state
  let currentResultData = null;

  // Initialize Example Address buttons
  exampleButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const addr = btn.getAttribute('data-example-address') || btn.textContent.trim();
      if (addressInput) {
        addressInput.value = addr;
        addressInput.focus();
        // Submit automatically when clicking example
        addressForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  });

  // Handle Form Submit
  if (addressForm && addressInput) {
    addressForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const address = addressInput.value.trim();
      if (!address) return;

      setLoadingState(true);

      try {
        const data = await window.IceJailTaxAPI.checkAddress(address);
        currentResultData = data;
        renderResult(data);
        renderPublicCommentBox(data);

        // Update interactive map
        if (window.IceJailTaxMap && data.latitude && data.longitude) {
          window.IceJailTaxMap.updateMapLocation(
            data.latitude,
            data.longitude,
            data.matchedAddress,
            data.distanceMiles,
            data.withinStudyArea
          );
        }

        // Scroll to result smoothly
        scrollToResults();
      } catch (err) {
        renderError(err.message || 'Unable to check this address. Please verify and try again.');
        scrollToResults();
      } finally {
        setLoadingState(false);
      }
    });
  }

  function setLoadingState(isLoading) {
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    if (isLoading) {
      submitButton.innerHTML = `
        <svg class="spinner" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none">
          <circle cx="12" cy="12" r="10" stroke-width="3" stroke-dasharray="32" stroke-linecap="round"></circle>
        </svg>
        <span>Checking Address...</span>
      `;
    } else {
      submitButton.innerHTML = `
        <span>Calculate My Impact</span>
        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
      `;
    }
  }

  function scrollToResults() {
    if (resultsContainer) {
      resultsContainer.hidden = false;
      window.requestAnimationFrame(() => {
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function renderResult(data) {
    if (!resultCard) return;
    resultsContainer.hidden = false;

    const within = Boolean(data.withinStudyArea);
    const distance = Number(data.distanceMiles || 0);
    const estimate = data.studyEstimate;
    const val = data.valuation;
    const hasValuation = Boolean(val && Number(val.appraisedValue) > 0);

    let badgeClass = within ? 'badge--impact' : 'badge--outside';
    let badgeText = within
      ? `WITHIN THE ${estimate ? estimate.radiusMiles.toFixed(2) : '2.49'}-MILE STUDY IMPACT ZONE`
      : 'OUTSIDE THE 2.49-MILE STUDY BOUNDARY';

    let cardModifierClass = within ? 'result-card--inside' : 'result-card--outside';

    let valuationHtml = '';
    if (within && estimate) {
      if (hasValuation) {
        valuationHtml = `
          <div class="result-valuation">
            <div class="result-valuation__heading">
              <h4>Estimated Home Value Loss (${formatPercent(estimate.reductionPercent)} Study Finding)</h4>
              <span class="source-tag">Source: Maryland SDAT Property Record</span>
            </div>
            <div class="metrics-grid">
              <div class="metric-box">
                <span class="metric-label">Current Official SDAT Appraised Value</span>
                <span class="metric-number">${formatCurrency(val.appraisedValue)}</span>
              </div>
              <div class="metric-box metric-box--loss">
                <span class="metric-label">Estimated Loss at ${formatPercent(estimate.reductionPercent)}</span>
                <span class="metric-number">−${formatCurrency(val.potentialReduction)}</span>
              </div>
              <div class="metric-box metric-box--after">
                <span class="metric-label">Estimated Diminished Value</span>
                <span class="metric-number">${formatCurrency(val.reducedValue)}</span>
              </div>
            </div>
            <div class="valuation-meta">
              <p><strong>Property Matched:</strong> ${val.propertyAddress} (${val.dataUpdated ? 'SDAT Data ' + val.dataUpdated : 'Official Record'})</p>
              ${val.propertyRecordUrl ? `<a href="${val.propertyRecordUrl}" target="_blank" rel="noopener noreferrer" class="link-external">Verify official Maryland property record &rarr;</a>` : ''}
              <p class="footnote">Note: SDAT appraised value is the official assessment for taxation and baseline valuation. Market sale prices may vary. The calculated loss applies the MIT Press study's empirical finding for this distance tier.</p>
            </div>
          </div>
        `;
      } else {
        valuationHtml = `
          <div class="result-valuation result-valuation--no-record">
            <h4>Address Inside Study Radius (${estimate.radiusMiles.toFixed(2)} Miles)</h4>
            <p>This property falls within the zone where the study found a <strong>${formatPercent(estimate.reductionPercent)} average loss</strong> in home values. However, an exact single residential assessment record could not be automatically verified in SDAT. You can use the custom calculator below to test with your estimated property value.</p>
          </div>
        `;
      }
    } else {
      valuationHtml = `
        <div class="result-valuation result-valuation--outside">
          <h4>Beyond the 2.49-Mile Primary Study Radius</h4>
          <p>This address is <strong>${formatDistance(distance)} miles</strong> from the proposed ICE facility site. The MIT Press study found statistically significant property value declines up to 2.49 miles from newly opened prisons. Beyond 2.49 miles, the study's estimates were not statistically significant at standard thresholds, so no direct dollar reduction is assigned by this calculator.</p>
        </div>
      `;
    }

    let studySummaryHtml = '';
    if (within && estimate) {
      studySummaryHtml = `
        <div class="study-details-card">
          <h4>Peer-Reviewed Study Estimate for This Distance</h4>
          <div class="study-grid">
            <div class="study-col">
              <span class="study-lbl">Cumulative Radius</span>
              <span class="study-val">&le; ${estimate.radiusMiles.toFixed(2)} Miles</span>
            </div>
            <div class="study-col">
              <span class="study-lbl">Estimated Value Impact</span>
              <span class="study-val study-val--red">−${formatPercent(estimate.reductionPercent)}</span>
            </div>
            <div class="study-col">
              <span class="study-lbl">Statistical Confidence</span>
              <span class="study-val">${estimate.statisticalStrength} (${estimate.significanceText})</span>
            </div>
          </div>
          <p class="study-caption">Based on <em>The Local Impacts of Prisons</em> published in MIT Press's <em>The Review of Economics and Statistics</em> (Nov 2024).</p>
        </div>
      `;
    }

    resultCard.className = `result-card ${cardModifierClass}`;
    resultCard.innerHTML = `
      <div class="result-card__header">
        <div class="badge ${badgeClass}">${badgeText}</div>
        <h3 class="result-title">
          ${within ? 'Your home is within the projected ICE jail impact area.' : 'Your home is outside the primary 2.49-mile study radius.'}
        </h3>
        <p class="result-distance">
          Straight-line distance to proposed facility (10900 Hopewell Rd): <strong>${formatDistance(distance)} miles</strong>
        </p>
        <p class="result-matched-address">
          <strong>Matched Address:</strong> ${data.matchedAddress || addressInput.value}
        </p>
      </div>

      ${valuationHtml}
      ${studySummaryHtml}

      <div class="result-footer-actions">
        <a href="#action-section" class="btn btn--primary">
          <span>Take Action / Submit Comment</span>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L13.586 12H3a1 1 0 110-2h10.586l-4.293-4.293a1 1 0 011.414-1.414l6 6z" clip-rule="evenodd"/></svg>
        </a>
        <a href="#interactive-map" class="btn btn--secondary">
          <span>View on Map</span>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    `;
  }

  function renderError(message) {
    if (!resultCard) return;
    resultsContainer.hidden = false;
    resultCard.className = 'result-card result-card--error';
    resultCard.innerHTML = `
      <div class="result-card__header">
        <div class="badge badge--error">ADDRESS NOT FOUND</div>
        <h3 class="result-title">We couldn't verify that address</h3>
        <p class="result-error-msg">${message}</p>
        <p class="result-error-hint">Tips: Ensure you include the house number, street name, city (Williamsport, Hagerstown, etc.), and MD ZIP code (e.g. <code>16715 Buford Dr, Williamsport, MD 21795</code>).</p>
      </div>
    `;
  }

  function renderPublicCommentBox(data) {
    const commentBox = document.getElementById('public-comment-text');
    const copyBtn = document.getElementById('copy-comment-btn');
    if (!commentBox) return;

    const text = window.IceJailTaxShare.generatePublicCommentText(data);
    commentBox.value = text;

    if (copyBtn) {
      copyBtn.onclick = () => window.IceJailTaxShare.copyToClipboard(text, copyBtn);
    }
  }

  // Setup Manual Custom Calculator
  function updateManualCalculator() {
    if (!manualValueInput || !manualRadiusSelect || !manualLossResult || !manualAfterResult) return;

    const rawVal = manualValueInput.value.replace(/[^0-9.]/g, '');
    const value = Number(rawVal) || 0;
    const rate = Number(manualRadiusSelect.value) || 0.034;
    const pct = (rate * 100).toFixed(1);

    const loss = Math.round(value * rate);
    const after = Math.max(0, value - loss);

    manualLossResult.textContent = '−' + formatCurrency(loss);
    manualAfterResult.textContent = formatCurrency(after);
    if (manualRateLabel) {
      manualRateLabel.textContent = `${pct}% estimated decline`;
    }
  }

  if (manualValueInput && manualRadiusSelect) {
    manualValueInput.addEventListener('input', updateManualCalculator);
    manualRadiusSelect.addEventListener('change', updateManualCalculator);
    updateManualCalculator();
  }

  // Initialize Map on page load
  window.addEventListener('DOMContentLoaded', () => {
    if (window.IceJailTaxMap) {
      window.IceJailTaxMap.initMap('interactive-map');
    }
    if (window.IceJailTaxShare) {
      window.IceJailTaxShare.setupSocialSharing();
    }
    renderPublicCommentBox(null);
  });
})();
