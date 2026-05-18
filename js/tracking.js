// Mixpanel tracking for KnC Automations
// Project token: 9e4e9343af8600105e273610f36d1860
(function (document, window) {
  'use strict';

  var MIXPANEL_TOKEN = '9e4e9343af8600105e273610f36d1860';

  function loadMixpanel() {
    (function (f, b) {
      if (!b.__SV) {
        var e, g, i, h;
        window.mixpanel = b;
        b._i = [];
        b.init = function (e, f, c) {
          function g(a, d) {
            var b = d.split('.');
            2 === b.length && ((a = a[b[0]]), (d = b[1]));
            a[d] = function () {
              a.push([d].concat(Array.prototype.slice.call(arguments, 0)));
            };
          }
          var a = b;
          'undefined' !== typeof c ? (a = b[c] = []) : (c = 'mixpanel');
          a.people = a.people || [];
          a.toString = function (a) {
            var d = 'mixpanel';
            'mixpanel' !== c && (d += '.' + c);
            a || (d += ' (stub)');
            return d;
          };
          a.people.toString = function () {
            return a.toString(1) + '.people (stub)';
          };
          i = 'disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove'.split(' ');
          for (h = 0; h < i.length; h++) g(a, i[h]);
          var j = 'set set_once union unset remove delete'.split(' ');
          a.get_group = function () {
            function b(c) {
              d[c] = function () {
                call2_args = arguments;
                call2 = [c].concat(Array.prototype.slice.call(call2_args, 0));
                a.push([e, call2]);
              };
            }
            for (var d = {}, e = ['get_group'].concat(Array.prototype.slice.call(arguments, 0)), c = 0; c < j.length; c++) b(j[c]);
            return d;
          };
          b._i.push([e, f, c]);
        };
        b.__SV = 1.2;
        e = f.createElement('script');
        e.type = 'text/javascript';
        e.async = true;
        e.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
        g = f.getElementsByTagName('script')[0];
        g.parentNode.insertBefore(e, g);
      }
    })(document, window.mixpanel || []);
  }

  function getPageName() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace(/\.html$/i, '') || 'home';
  }

  function safeTrack(eventName, properties) {
    try {
      if (window.mixpanel && typeof window.mixpanel.track === 'function') {
        window.mixpanel.track(eventName, Object.assign({
          page: getPageName(),
          path: window.location.pathname,
          title: document.title
        }, properties || {}));
      }
    } catch (error) {
      console.warn('Mixpanel tracking skipped:', error);
    }
  }

  function setupEventTracking() {
    safeTrack('Page Viewed');

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (!link) return;

      var href = link.getAttribute('href') || '';
      var text = (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
      var isOutbound = /^https?:\/\//i.test(href) && !href.includes(window.location.hostname);
      var isCalendly = href.includes('calendly.com');
      var isPhone = href.indexOf('tel:') === 0;
      var isEmail = href.indexOf('mailto:') === 0;

      safeTrack('Link Clicked', {
        link_text: text,
        link_url: href,
        is_outbound: isOutbound,
        is_calendly: isCalendly,
        is_phone: isPhone,
        is_email: isEmail
      });

      if (isCalendly) safeTrack('Calendly CTA Clicked', { link_text: text, link_url: href });
      if (isPhone) safeTrack('Phone Link Clicked', { link_text: text, link_url: href });
      if (isEmail) safeTrack('Email Link Clicked', { link_text: text, link_url: href });
    });

    document.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || !(form instanceof HTMLFormElement)) return;
      safeTrack('Form Submitted', {
        form_id: form.id || '',
        form_name: form.getAttribute('name') || '',
        form_action: form.getAttribute('action') || '',
        form_method: form.getAttribute('method') || 'get'
      });
    }, true);
  }

  loadMixpanel();
  window.mixpanel.init(MIXPANEL_TOKEN, {
    debug: false,
    track_pageview: false,
    persistence: 'localStorage'
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventTracking);
  } else {
    setupEventTracking();
  }
})(document, window);
