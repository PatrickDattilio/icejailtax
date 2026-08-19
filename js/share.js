/**
 * ICE Jail Tax - Public Comment & Social Sharing Coordinator
 */

function generatePublicCommentText(data) {
  if (!data) {
    return `I am writing to express my strong opposition to the proposed ICE detention facility in Washington County, Maryland (10900 Hopewell Rd / 16220 Wright Rd). According to peer-reviewed economic research published by MIT Press in The Review of Economics and Statistics ("The Local Impacts of Prisons"), nearby residential property values decline significantly when a new correctional facility opens. I urge DHS and local leadership to halt this project and protect our community's property values, safety, and local economy.`;
  }

  const distance = Number(data.distanceMiles || 0).toFixed(2);
  const matchedAddress = data.matchedAddress || 'my residential property';
  const val = data.valuation;

  if (data.withinStudyArea && val && val.potentialReduction > 0) {
    const lossFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val.potentialReduction);
    const appraisedFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val.appraisedValue);
    const reducedFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val.reducedValue);
    const pct = val.reductionPercent || (val.reductionRate * 100);

    return `I am a Washington County property owner writing to formally oppose the proposed ICE detention facility at 10900 Hopewell Road / 16220 Wright Road in Williamsport, Maryland.

According to peer-reviewed research published by MIT Press in The Review of Economics and Statistics ("The Local Impacts of Prisons", Nov 2024), new correctional facilities cause residential property values within 2.49 miles to drop by 1.8% to 3.4%.

My property located at ${matchedAddress} is approximately ${distance} miles from the proposed facility site.
- Current Official SDAT Appraised Value: ${appraisedFmt}
- Estimated Property Value Loss (${pct}%): −${lossFmt}
- Estimated Diminished Value: ${reducedFmt}

This proposed ICE jail imposes an uncompensated financial loss on local families and homeowners totaling an estimated $22.3M across our county. The Department of Homeland Security has conducted no comprehensive local economic or environmental review of these impacts.

I urge you to reject this facility and protect Washington County taxpayers, homeowners, and neighborhoods.`;
  }

  return `I am writing to formally oppose the proposed Department of Homeland Security / ICE detention facility at 10900 Hopewell Road in Williamsport, MD. Research published by MIT Press demonstrates severe, multi-million dollar property value declines for surrounding Washington County communities. I urge our elected officials and DHS to reject this proposed detention facility.`;
}

/**
 * Copies text to clipboard with UI feedback
 */
async function copyToClipboard(text, triggerButton) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    if (triggerButton) {
      const origHtml = triggerButton.innerHTML;
      triggerButton.innerHTML = '✓ Copied to Clipboard!';
      triggerButton.classList.add('btn--copied');
      setTimeout(() => {
        triggerButton.innerHTML = origHtml;
        triggerButton.classList.remove('btn--copied');
      }, 2500);
    }
    return true;
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

/**
 * Setup social share links
 */
function setupSocialSharing(customUrl, customTitle) {
  const url = encodeURIComponent(customUrl || 'https://www.icejailtax.com/');
  const text = encodeURIComponent(customTitle || 'See how much the proposed Williamsport ICE jail could cost your home in lost property value. Calculate your address:');

  const twitterBtn = document.getElementById('share-twitter');
  if (twitterBtn) {
    twitterBtn.href = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
  }

  const fbBtn = document.getElementById('share-facebook');
  if (fbBtn) {
    fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  }

  const bskyBtn = document.getElementById('share-bluesky');
  if (bskyBtn) {
    bskyBtn.href = `https://bsky.app/intent/compose?text=${text}%20${url}`;
  }

  const emailBtn = document.getElementById('share-email');
  if (emailBtn) {
    emailBtn.href = `mailto:?subject=${encodeURIComponent('Calculate the ICE Jail Tax on your home')}&body=${text}%0A%0A${url}`;
  }
}

window.IceJailTaxShare = {
  generatePublicCommentText,
  copyToClipboard,
  setupSocialSharing
};
