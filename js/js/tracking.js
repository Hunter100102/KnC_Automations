// js/tracking.js
// KnC Automations / Mixpanel implementation
// Browser JavaScript SDK setup for a static marketing website.
// Project token supplied by William: 9e4e9343af8600105e273610f36d1860
//
// IMPORTANT TESTING NOTE:
// Mixpanel's connection checker needs the SDK to initialize and send an event.
// This file uses a consent gate for normal visitors, but you can test safely by:
//   1) visiting your site,
//   2) clicking "Allow analytics", then refreshing and running Mixpanel's checker, OR
//   3) opening your page with ?analytics_test=1 once. That grants consent only in your browser.
(function () {
  'use strict';

  var MIXPANEL_TOKEN = '9e4e9343af8600105e273610f36d1860';
  var CONSENT_KEY = 'knc_mixpanel_consent';
  var SDK_SRC = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
  var initialized = false;
  var sdkLoading = false;
  var pendingEvents = [];

  function safeStorageGet(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeStorageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (_) {}
  }

  function getConsent() {
    return safeStorageGet(CONSENT_KEY);
  }

  function setConsent(value) {
    safeStorageSet(CONSENT_KEY, value);
  }

  function isAnalyticsTestMode() {
    return /(?:\?|&)analytics_test=1(?:&|$)/.test(window.location.search || '') ||
      /(?:\?|&)mixpanel_debug=1(?:&|$)/.test(window.location.search || '');
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120).toLowerCase();
  }

  function pageName() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace('.html', '') || 'home';
  }

  function environmentName() {
    var host = window.location.hostname || '';
    if (host === 'localhost' || host === '127.0.0.1' || host.indexOf('vercel.app') !== -1 || host.indexOf('netlify.app') !== -1) {
      return 'development';
    }
    return 'production';
  }

  function currentPageProps(extra) {
    var props = {
      page_name: pageName(),
      page_path: window.location.pathname,
      page_title: document.title,
      platform: 'web',
      site_name: 'knc_automations',
      environment: environmentName()
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        if (extra[key] !== undefined && extra[key] !== null && extra[key] !== '') props[key] = extra[key];
      });
    }
    return props;
  }

  function loadMixpanel(callback) {
    if (window.mixpanel && typeof window.mixpanel.init === 'function') {
      callback();
      return;
    }

    var existing = document.querySelector('script[data-knc-mixpanel-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', callback);
      return;
    }

    if (sdkLoading) return;
    sdkLoading = true;

    var script = document.createElement('script');
    script.async = true;
    script.src = SDK_SRC;
    script.setAttribute('data-knc-mixpanel-sdk', 'true');
    script.onload = callback;
    script.onerror = function () {
      console.warn('Mixpanel SDK failed to load. Check ad blockers, network blocking, or CSP settings.');
    };
    document.head.appendChild(script);
  }

  function flushPendingEvents() {
    while (pendingEvents.length && initialized && window.mixpanel) {
      var item = pendingEvents.shift();
      window.mixpanel.track(item.name, item.props);
    }
  }

  function initMixpanel() {
    if (initialized) return;
    if (getConsent() !== 'granted') return;

    loadMixpanel(function () {
      if (!window.mixpanel || initialized) return;

      window.mixpanel.init(MIXPANEL_TOKEN, {
        debug: true,
        persistence: 'localStorage',
        ignore_dnt: false,
        track_pageview: true,
        autocapture: true,
        // Session Replay is intentionally off by default. Enable later after privacy QA.
        record_sessions_percent: 0,
        loaded: function () {
          initialized = true;
          window.mixpanel.register({
            platform: 'web',
            site_name: 'knc_automations',
            environment: environmentName()
          });

          // Custom precision event for your first Mixpanel Live View verification.
          window.mixpanel.track('page_viewed', currentPageProps({
            tracking_source: isAnalyticsTestMode() ? 'analytics_test_mode' : 'consent_granted'
          }));

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
    // This static marketing site does not currently have authenticated users.
    // Use this helper later only after a stable database user ID exists.
    if (!userId || getConsent() !== 'granted') return;
    initMixpanel();
    if (window.mixpanel && initialized) {
      window.mixpanel.identify(String(userId));
      if (profile && window.mixpanel.people) window.mixpanel.people.set(profile);
    }
  }

  function reset() {
    if (window.mixpanel && initialized && typeof window.mixpanel.reset === 'function') {
      window.mixpanel.reset();
    }
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
      var closest = event.target.closest ? event.target.closest('a, button') : null;
      if (!closest) return;

      var tag = closest.tagName ? closest.tagName.toLowerCase() : '';
      var href = tag === 'a' ? (closest.getAttribute('href') || '') : '';
      var label = cleanText(closest.textContent || closest.getAttribute('aria-label') || href || tag);
      var classes = closest.className || '';

      if (href.indexOf('contact.html') !== -1 || /quote|consult|support|contact|get started|free/.test(label)) {
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

      // Do not send name, email, phone number, or message content to Mixpanel.
      track('lead_form_submitted', {
        form_id: 'contact_form',
        has_phone: Boolean(phone),
        message_length_bucket: bucket
      });
    });
  }

  function onReady() {
    if (isAnalyticsTestMode()) {
      setConsent('granted');
    }

    showConsentBanner();
    bindClickTracking();
    bindFormTracking();

    if (getConsent() === 'granted') {
      initMixpanel();
    }
  }

  window.KnCAnalytics = {
    track: track,
    identify: identify,
    reset: reset,
    grantConsent: function () { setConsent('granted'); initMixpanel(); },
    revokeConsent: function () { setConsent('denied'); reset(); },
    consentStatus: getConsent
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
