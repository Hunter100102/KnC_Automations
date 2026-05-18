// js/tracking.js
// KnC Automations / Mixpanel implementation
// Mode used: Quick Start-style implementation for a static marketing website.
// Platform: browser JavaScript. CDP scan: no Segment/Rudderstack/mParticle found in this codebase.
// Consent posture: conservative. Mixpanel is not initialized until visitor opts in.
(function () {
  'use strict';

  var MIXPANEL_PROD_TOKEN = '9e4e9343af8600105e273610f36d1860';
  var MIXPANEL_DEV_TOKEN = ''; // Add a separate Mixpanel development project token here before local/staging QA.
  var CONSENT_KEY = 'knc_mixpanel_consent';
  var SDK_SRC = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
  var initialized = false;
  var pendingEvents = [];

  function isProductionHost() {
    var host = window.location.hostname || '';
    return host.indexOf('automatingsolutions.com') !== -1 || host.indexOf('knc') !== -1 || host.indexOf('github.io') !== -1;
  }

  function getToken() {
    if (isProductionHost()) return MIXPANEL_PROD_TOKEN;
    return MIXPANEL_DEV_TOKEN;
  }

  function getConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (_) { return null; }
  }

  function setConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120).toLowerCase();
  }

  function pageName() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace('.html', '') || 'home';
  }

  function currentPageProps(extra) {
    var props = {
      page_name: pageName(),
      page_path: window.location.pathname,
      page_title: document.title,
      platform: 'web',
      site_name: 'knc_automations'
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        if (extra[key] !== undefined && extra[key] !== null && extra[key] !== '') props[key] = extra[key];
      });
    }
    return props;
  }

  function loadMixpanel(callback) {
    if (window.mixpanel && typeof window.mixpanel.init === 'function') return callback();
    var existing = document.querySelector('script[data-knc-mixpanel-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', callback);
      return;
    }
    var script = document.createElement('script');
    script.async = true;
    script.src = SDK_SRC;
    script.setAttribute('data-knc-mixpanel-sdk', 'true');
    script.onload = callback;
    document.head.appendChild(script);
  }

  function flushPendingEvents() {
    while (pendingEvents.length && initialized) {
      var item = pendingEvents.shift();
      window.mixpanel.track(item.name, item.props);
    }
  }

  function initMixpanel() {
    if (initialized || getConsent() !== 'granted') return;
    var token = getToken();
    if (!token) {
      // Prevent local/staging traffic from polluting production before a dev token exists.
      console.warn('Mixpanel dev token is missing. Add MIXPANEL_DEV_TOKEN in js/tracking.js for local/staging QA.');
      return;
    }
    loadMixpanel(function () {
      if (!window.mixpanel || initialized) return;
      window.mixpanel.init(token, {
        debug: !isProductionHost(),
        persistence: 'localStorage',
        ignore_dnt: false,
        track_pageview: false,
        loaded: function () {
          initialized = true;
          window.mixpanel.register({
            platform: 'web',
            site_name: 'knc_automations',
            environment: isProductionHost() ? 'production' : 'development'
          });
          window.mixpanel.track('page_viewed', currentPageProps());
          flushPendingEvents();
        }
      });
    });
  }

  function track(name, props) {
    var cleanProps = currentPageProps(props || {});
    if (getConsent() !== 'granted') return;
    if (initialized && window.mixpanel && typeof window.mixpanel.track === 'function') {
      window.mixpanel.track(name, cleanProps);
    } else {
      pendingEvents.push({ name: name, props: cleanProps });
      initMixpanel();
    }
  }

  function identify(userId, profile) {
    // This static website does not currently have authenticated users.
    // Use this helper later only after a stable database user ID exists.
    if (!userId || getConsent() !== 'granted') return;
    initMixpanel();
    if (window.mixpanel && initialized) {
      window.mixpanel.identify(String(userId));
      if (profile && window.mixpanel.people) window.mixpanel.people.set(profile);
    }
  }

  function reset() {
    if (window.mixpanel && initialized && typeof window.mixpanel.reset === 'function') window.mixpanel.reset();
  }

  function showConsentBanner() {
    if (getConsent()) return;
    var banner = document.createElement('div');
    banner.id = 'knc-analytics-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Analytics consent');
    banner.innerHTML = '' +
      '<div class="knc-consent-card">' +
      '<p><strong>Analytics preferences</strong><br>We use Mixpanel analytics to understand which KnC Automations pages and buttons help visitors most. No contact form message, email, phone, or name is sent to Mixpanel.</p>' +
      '<div class="knc-consent-actions">' +
      '<button type="button" id="knc-accept-analytics">Allow analytics</button>' +
      '<button type="button" id="knc-decline-analytics">Decline</button>' +
      '</div></div>';
    document.body.appendChild(banner);

    document.getElementById('knc-accept-analytics').addEventListener('click', function () {
      setConsent('granted');
      banner.remove();
      initMixpanel();
    });
    document.getElementById('knc-decline-analytics').addEventListener('click', function () {
      setConsent('denied');
      banner.remove();
    });
  }

  function bindClickTracking() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      var label = cleanText(link.textContent || link.getAttribute('aria-label') || href);
      var classes = link.className || '';

      if (href.indexOf('contact.html') !== -1 || /quote|consult|support|contact/.test(label)) {
        track('lead_cta_clicked', {
          cta_text: label,
          cta_href: href,
          cta_location: pageName(),
          cta_type: href.indexOf('contact.html') !== -1 ? 'contact_page' : 'lead_cta'
        });
      } else if (href.indexOf('demo-backend.html') !== -1 || /demo|overview/.test(label)) {
        track('demo_overview_clicked', {
          cta_text: label,
          cta_href: href,
          cta_location: pageName()
        });
      } else if (classes && String(classes).indexOf('btn') !== -1) {
        track('button_clicked', {
          button_text: label,
          button_href: href,
          button_location: pageName()
        });
      }
    });
  }

  function bindFormTracking() {
    var form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function () {
      var message = form.elements['message'] && form.elements['message'].value ? form.elements['message'].value.trim() : '';
      var phone = form.elements['phone'] && form.elements['phone'].value ? form.elements['phone'].value.trim() : '';
      var bucket = 'none';
      if (message.length > 0 && message.length <= 100) bucket = 'short';
      else if (message.length <= 500) bucket = 'medium';
      else if (message.length > 500) bucket = 'long';
      track('lead_form_submitted', {
        form_id: 'contact_form',
        has_phone: Boolean(phone),
        message_length_bucket: bucket
      });
    });
  }

  function onReady() {
    showConsentBanner();
    bindClickTracking();
    bindFormTracking();
    if (getConsent() === 'granted') initMixpanel();
  }

  window.KnCAnalytics = {
    track: track,
    identify: identify,
    reset: reset,
    grantConsent: function () { setConsent('granted'); initMixpanel(); },
    revokeConsent: function () { setConsent('denied'); reset(); }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
