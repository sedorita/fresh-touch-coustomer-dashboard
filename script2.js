(function () {
  'use strict';

  var PAGE_TITLES = {
    overview: 'Overview',
    'add-ons': 'Add-Ons',
    emergency: 'Emergency Cleaning',
    history: 'History',
    security: 'Security',
    book: 'Book Appointment',
    payment: 'Payment',
    reschedule: 'Reschedule'
  };

  var SERVICE_NAMES = { deep: 'Deep Cleaning', maintenance: 'Maintenance' };
  var SERVICE_PRICES = { deep: 249, maintenance: 179 };

  var sidebar = document.getElementById('sidebar');
  var menuToggle = document.getElementById('menuToggle');
  var backdrop = document.getElementById('sidebarBackdrop');
  var pageTitleEl = document.getElementById('pageTitle');
  var toastEl = document.getElementById('toast');

  var bookingData = { service: null, serviceName: '', servicePrice: 0, addons: [], addonsTotal: 0, date: '', total: 0 };
  var paymentCompleted = false;

  var STORAGE_KEY = 'scrubklean_transactions';
  var seedTransactions = [
    { id: '1', date: '2026-03-22T09:00:00', serviceName: 'Maintenance Clean', addons: [], total: 179, status: 'Upcoming' },
    { id: '2', date: '2026-03-08T10:00:00', serviceName: 'Deep Cleaning', addons: [], total: 249, status: 'Completed' },
    { id: '3', date: '2026-02-22T09:00:00', serviceName: 'Maintenance Clean', addons: [], total: 179, status: 'Completed' },
    { id: '4', date: '2026-02-08T09:00:00', serviceName: 'Maintenance Clean', addons: [], total: 179, status: 'Completed' }
  ];

  function loadTransactions() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : seedTransactions.slice();
      }
    } catch (e) {}
    return seedTransactions.slice();
  }

  function saveTransactions(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  var transactionHistory = loadTransactions();

  function openSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-visible');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-visible');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function isSidebarOpen() {
    return sidebar && sidebar.classList.contains('is-open');
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.setAttribute('aria-hidden', 'false');
    toastEl.classList.add('is-visible');
    clearTimeout(toastEl._toastTimer);
    toastEl._toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-visible');
      toastEl.setAttribute('aria-hidden', 'true');
    }, 3000);
  }

  function switchPage(pageId) {
    var panels = document.querySelectorAll('.page-panel');
    var navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-page]');
    var title = PAGE_TITLES[pageId] || 'Overview';

    panels.forEach(function (panel) {
      var isActive = panel.getAttribute('data-page') === pageId;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    navItems.forEach(function (item) {
      var active = item.getAttribute('data-page') === pageId;
      item.classList.toggle('nav-item--active', active);
      item.setAttribute('aria-current', active ? 'page' : null);
    });

    if (pageTitleEl) pageTitleEl.textContent = title;

    if (pageId === 'history') {
      renderHistoryTable();
      renderNextAppointment();
    }
    if (pageId === 'reschedule') {
      var upcoming = getUpcomingAppointment();
      var currentDateEl = document.getElementById('rescheduleCurrentDate');
      var currentServiceEl = document.getElementById('rescheduleCurrentService');
      var newDateTimeEl = document.getElementById('rescheduleNewDateTime');
      if (currentDateEl) currentDateEl.textContent = upcoming ? formatHistoryDate(upcoming.date) : '—';
      if (currentServiceEl) currentServiceEl.textContent = upcoming ? upcoming.serviceName + (upcoming.addons && upcoming.addons.length ? ' + ' + upcoming.addons.length + ' add-on(s)' : '') : '—';
      if (newDateTimeEl) {
        var now = new Date();
        now.setMinutes(now.getMinutes() + 1);
        newDateTimeEl.min = now.toISOString().slice(0, 16);
        if (upcoming) {
          var d = new Date(upcoming.date);
          var y = d.getFullYear();
          var m = String(d.getMonth() + 1).padStart(2, '0');
          var day = String(d.getDate()).padStart(2, '0');
          var h = String(d.getHours()).padStart(2, '0');
          var min = String(d.getMinutes()).padStart(2, '0');
          newDateTimeEl.value = y + '-' + m + '-' + day + 'T' + h + ':' + min;
        } else {
          newDateTimeEl.value = '';
        }
      }
    }
  }

  function updateBookingTotal() {
    var totalEl = document.getElementById('bookingTotal');
    if (!totalEl) return;
    var serviceInput = document.querySelector('input[name="booking_service"]:checked');
    if (!serviceInput) {
      totalEl.textContent = 'Select a service';
      return;
    }
    var base = parseInt(serviceInput.getAttribute('data-price'), 10) || 0;
    var addonTotal = 0;
    document.querySelectorAll('#bookingAddonsGrid .addon-card__input:checked').forEach(function (input) {
      addonTotal += parseInt(input.value, 10) || 0;
    });
    var total = base + addonTotal;
    totalEl.textContent = 'Total: $' + total + '.00';
  }

  function collectBookingData() {
    var serviceInput = document.querySelector('input[name="booking_service"]:checked');
    var dateInput = document.getElementById('bookingDateTime');
    if (!serviceInput) return null;
    var service = serviceInput.value;
    var basePrice = SERVICE_PRICES[service] || 0;
    var addons = [];
    var addonsTotal = 0;
    document.querySelectorAll('#bookingAddonsGrid .addon-card__input:checked').forEach(function (input) {
      var name = input.getAttribute('data-name');
      var price = parseInt(input.value, 10) || 0;
      addons.push({ name: name, price: price });
      addonsTotal += price;
    });
    var total = basePrice + addonsTotal;
    var dateStr = dateInput && dateInput.value ? dateInput.value : '';
    return {
      service: service,
      serviceName: SERVICE_NAMES[service] || service,
      servicePrice: basePrice,
      addons: addons,
      addonsTotal: addonsTotal,
      date: dateStr,
      total: total
    };
  }

  function formatBookingDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatHistoryDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function addTransaction(data) {
    var id = 'txn_' + Date.now();
    var appointmentDate = data.date || new Date().toISOString();
    var addons = Array.isArray(data.addons) ? data.addons : [];
    var txn = {
      id: id,
      date: appointmentDate,
      serviceName: data.serviceName || '',
      addons: addons,
      total: data.total || 0,
      status: 'Completed',
      paidAt: new Date().toISOString()
    };
    transactionHistory.unshift(txn);
    saveTransactions(transactionHistory);
    renderHistoryTable();
    renderNextAppointment();
  }

  function getUpcomingAppointment() {
    var now = new Date();
    return transactionHistory.filter(function (txn) {
      return new Date(txn.date) >= now && txn.status !== 'Cancelled' && (txn.status === 'Upcoming' || txn.status === 'Completed');
    }).sort(function (a, b) { return new Date(a.date) - new Date(b.date); })[0] || null;
  }

  function renderHistoryTable() {
    var tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    var list = transactionHistory.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    tbody.innerHTML = list.map(function (txn) {
      var addonsText = txn.addons && txn.addons.length
        ? txn.addons.map(function (a) { return a.name + ' (+$' + a.price + ')'; }).join(', ')
        : '—';
      var statusClass = txn.status === 'Upcoming' ? 'status-badge--upcoming' : txn.status === 'Cancelled' ? 'status-badge--cancelled' : 'status-badge--completed';
      return '<tr><td>' + formatHistoryDate(txn.date) + '</td><td>' + escapeHtml(txn.serviceName) + '</td><td class="history-addons">' + escapeHtml(addonsText) + '</td><td><span class="status-badge ' + statusClass + '">' + escapeHtml(txn.status) + '</span></td><td>$' + txn.total + '.00</td></tr>';
    }).join('');
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderNextAppointment() {
    var upcoming = getUpcomingAppointment();
    var detailEl = document.getElementById('upcomingDetail');
    var emptyEl = document.getElementById('upcomingEmpty');
    var dateEl = document.getElementById('upcomingDate');
    var serviceEl = document.getElementById('upcomingService');
    if (!detailEl || !emptyEl) return;
    if (upcoming) {
      detailEl.style.display = '';
      emptyEl.style.display = 'none';
      if (dateEl) dateEl.textContent = formatHistoryDate(upcoming.date);
      if (serviceEl) serviceEl.textContent = upcoming.serviceName + (upcoming.addons && upcoming.addons.length ? ' + ' + upcoming.addons.length + ' add-on(s)' : '');
    } else {
      detailEl.style.display = 'none';
      emptyEl.style.display = 'block';
    }
  }

  function renderPaymentSummary(data) {
    document.getElementById('paymentSummaryService').textContent = data.serviceName + ' — $' + data.servicePrice + '.00';
    var addonsWrap = document.getElementById('paymentSummaryAddonsWrap');
    var addonsEl = document.getElementById('paymentSummaryAddons');
    if (data.addons.length === 0) {
      addonsEl.textContent = 'None';
    } else {
      addonsEl.textContent = data.addons.map(function (a) { return a.name + ' (+$' + a.price + ')'; }).join(', ');
    }
    document.getElementById('paymentSummaryDate').textContent = formatBookingDate(data.date);
    document.getElementById('paymentSummaryTotal').textContent = '$' + data.total + '.00';
  }

  function setPaymentStatus(completed) {
    paymentCompleted = completed;
    var badge = document.getElementById('paymentStatusBadge');
    if (!badge) return;
    badge.textContent = completed ? 'Completed' : 'Pending';
    badge.classList.toggle('is-completed', completed);
  }

  function showPaymentSuccess() {
    var formCard = document.getElementById('paymentFormCard');
    var summaryCard = document.getElementById('paymentSummaryCard');
    var successCard = document.getElementById('paymentSuccessCard');
    if (formCard) formCard.style.display = 'none';
    if (summaryCard) summaryCard.style.display = 'none';
    if (successCard) {
      successCard.classList.add('is-visible');
      successCard.setAttribute('aria-hidden', 'false');
    }
  }

  function resetPaymentPanel() {
    paymentCompleted = false;
    setPaymentStatus(false);
    var formCard = document.getElementById('paymentFormCard');
    var summaryCard = document.getElementById('paymentSummaryCard');
    var successCard = document.getElementById('paymentSuccessCard');
    if (formCard) formCard.style.display = '';
    if (summaryCard) summaryCard.style.display = '';
    if (successCard) {
      successCard.classList.remove('is-visible');
      successCard.setAttribute('aria-hidden', 'true');
    }
    var form = document.getElementById('paymentForm');
    if (form) form.reset();
  }

  function initNavigation() {
    document.querySelectorAll('.sidebar-nav .nav-item[data-page]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var page = link.getAttribute('data-page');
        if (page && page !== 'book' && page !== 'payment') {
          switchPage(page);
          if (window.innerWidth <= 768) closeSidebar();
        }
      });
    });
  }

  function initGettingStarted() {
    var cta = document.getElementById('ctaGettingStarted');
    if (cta) {
      cta.addEventListener('click', function (e) {
        e.preventDefault();
        switchPage('book');
        if (window.innerWidth <= 768) closeSidebar();
      });
    }
  }

  function initBookFlow() {
    var backBtn = document.getElementById('bookBackToOverview');
    var proceedBtn = document.getElementById('btnProceedToPayment');
    var serviceGrid = document.getElementById('serviceTypeGrid');
    var addonsGrid = document.getElementById('bookingAddonsGrid');

    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        switchPage('overview');
      });
    }

    if (serviceGrid) {
      serviceGrid.addEventListener('change', updateBookingTotal);
    }
    if (addonsGrid) {
      addonsGrid.addEventListener('change', updateBookingTotal);
    }

    if (proceedBtn) {
      proceedBtn.addEventListener('click', function () {
        var serviceInput = document.querySelector('input[name="booking_service"]:checked');
        var dateInput = document.getElementById('bookingDateTime');
        if (!serviceInput) {
          showToast('Please select a service type.');
          return;
        }
        if (!dateInput || !dateInput.value) {
          showToast('Please choose a preferred date and time.');
          return;
        }
        var data = collectBookingData();
        if (!data) return;
        bookingData = data;
        renderPaymentSummary(data);
        resetPaymentPanel();
        switchPage('payment');
        if (window.innerWidth <= 768) closeSidebar();
      });
    }
  }

  function initPaymentFlow() {
    var backBtn = document.getElementById('paymentBackToBook');
    var backOverviewBtn = document.getElementById('paymentBackToOverview');
    var form = document.getElementById('paymentForm');
    var confirmBtn = document.getElementById('btnConfirmPayment');

    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        switchPage('book');
      });
    }

    if (backOverviewBtn) {
      backOverviewBtn.addEventListener('click', function (e) {
        e.preventDefault();
        switchPage('overview');
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (paymentCompleted) return;
        setPaymentStatus(true);
        addTransaction(bookingData);
        showToast('Payment successful. Your booking is confirmed.');
        showPaymentSuccess();
      });
    }

    if (confirmBtn && !form) {
      confirmBtn.addEventListener('click', function () {
        if (paymentCompleted) return;
        setPaymentStatus(true);
        addTransaction(bookingData);
        showToast('Payment successful. Your booking is confirmed.');
        showPaymentSuccess();
      });
    }
  }

  function initReschedule() {
    var btnReschedule = document.getElementById('btnReschedule');
    var backBtn = document.getElementById('rescheduleBackToHistory');
    var btnConfirm = document.getElementById('btnConfirmReschedule');
    var btnCancel = document.getElementById('btnCancelAppointment');

    if (btnReschedule) {
      btnReschedule.addEventListener('click', function () {
        var upcoming = getUpcomingAppointment();
        if (!upcoming) {
          showToast('No upcoming appointment to reschedule.');
          return;
        }
        switchPage('reschedule');
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        switchPage('history');
      });
    }

    if (btnConfirm) {
      btnConfirm.addEventListener('click', function () {
        var upcoming = getUpcomingAppointment();
        var newDateTimeEl = document.getElementById('rescheduleNewDateTime');
        if (!upcoming) {
          showToast('No upcoming appointment found.');
          return;
        }
        if (!newDateTimeEl || !newDateTimeEl.value) {
          showToast('Please select a new date and time.');
          return;
        }
        var newDate = new Date(newDateTimeEl.value);
        if (newDate <= new Date()) {
          showToast('New date must be in the future.');
          return;
        }
        var txn = transactionHistory.find(function (t) { return t.id === upcoming.id; });
        if (txn) {
          txn.date = newDate.toISOString();
          saveTransactions(transactionHistory);
          renderHistoryTable();
          renderNextAppointment();
          switchPage('history');
          showToast('Appointment rescheduled successfully.');
        }
      });
    }

    if (btnCancel) {
      btnCancel.addEventListener('click', function () {
        var upcoming = getUpcomingAppointment();
        if (!upcoming) {
          showToast('No upcoming appointment to cancel.');
          return;
        }
        var appointmentTime = new Date(upcoming.date).getTime();
        var now = Date.now();
        var oneMinuteMs = 60 * 1000;
        if (appointmentTime - now < oneMinuteMs) {
          showToast('Cancellation is not allowed within 1 minute of the appointment time.');
          return;
        }
        var txn = transactionHistory.find(function (t) { return t.id === upcoming.id; });
        if (txn) {
          txn.status = 'Cancelled';
          saveTransactions(transactionHistory);
          renderHistoryTable();
          renderNextAppointment();
          showToast('Appointment cancelled.');
        }
      });
    }
  }

  function initAddons() {
    var grid = document.getElementById('addonsGrid');
    var summary = document.getElementById('addonsSummary');
    var saveBtn = document.getElementById('addonsSave');
    if (!grid || !summary) return;

    function updateSummary() {
      var checked = grid.querySelectorAll('.addon-card__input:checked');
      var count = checked.length;
      var total = 0;
      checked.forEach(function (input) {
        var card = input.closest('.addon-card');
        var priceEl = card && card.querySelector('.addon-card__price');
        if (priceEl) {
          var match = priceEl.textContent.match(/\d+/);
          if (match) total += parseInt(match[0], 10);
        }
      });
      if (count === 0) {
        summary.textContent = 'No add-ons selected';
      } else {
        summary.textContent = count + ' selected · +$' + total + ' total';
      }
    }

    grid.addEventListener('change', updateSummary);
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var checked = grid.querySelectorAll('.addon-card__input:checked');
        if (checked.length === 0) {
          showToast('Select at least one add-on to save.');
          return;
        }
        showToast('Add-ons saved. We will include them in your next booking.');
      });
    }
    updateSummary();
  }

  function initEmergencyForm() {
    var form = document.getElementById('emergencyForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var type = form.querySelector('[name="service_type"]');
      var datetime = form.querySelector('[name="preferred_datetime"]');
      if (!type || !type.value) {
        showToast('Please select a service type.');
        return;
      }
      if (!datetime || !datetime.value) {
        showToast('Please choose a preferred date and time.');
        return;
      }
      showToast('Request received. We will contact you within 2–4 hours.');
      form.reset();
    });
  }

  var TWOFA_STORAGE_KEY = 'scrubklean_2fa_enabled';
  var TWOFA_SECRET_KEY = 'scrubklean_2fa_secret';
  var SMS_STORAGE_KEY = 'scrubklean_sms_phone';
  var SMS_ENABLED_KEY = 'scrubklean_sms_enabled';

  function get2FASecret() {
    try {
      var s = localStorage.getItem(TWOFA_SECRET_KEY);
      if (s) return s;
    } catch (e) {}
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    var secret = '';
    for (var i = 0; i < 16; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
    try {
      localStorage.setItem(TWOFA_SECRET_KEY, secret);
    } catch (e) {}
    return secret;
  }

  function update2FAUI() {
    var toggle = document.getElementById('toggle2fa');
    var setupEl = document.getElementById('twofaSetup');
    var enabledEl = document.getElementById('twofaEnabled');
    var isEnabled = false;
    try {
      isEnabled = localStorage.getItem(TWOFA_STORAGE_KEY) === '1';
    } catch (e) {}
    if (!toggle) return;
    if (isEnabled) toggle.checked = true;
    if (setupEl) {
      var showSetup = !isEnabled && toggle.checked;
      setupEl.classList.toggle('is-visible', showSetup);
      setupEl.setAttribute('aria-hidden', !showSetup);
    }
    if (enabledEl) {
      enabledEl.classList.toggle('is-visible', isEnabled);
      enabledEl.setAttribute('aria-hidden', !isEnabled);
    }
    if (!isEnabled && toggle.checked && setupEl && setupEl.classList.contains('is-visible')) {
      var secret = get2FASecret();
      var secretFormatted = secret.replace(/(.{4})/g, '$1 ').trim();
      var secretEl = document.getElementById('twofaSecretKey');
      if (secretEl) secretEl.textContent = secretFormatted;
      var qrEl = document.getElementById('twofaQrImage');
      if (qrEl) {
        var otpauth = 'otpauth://totp/Scrub%26Klean%20Homes:Client?secret=' + secret + '&issuer=Scrub%26Klean%20Homes';
        qrEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(otpauth);
      }
    }
  }

  function initSecurity() {
    var btnPassword = document.getElementById('btnChangePassword');
    if (btnPassword) {
      btnPassword.addEventListener('click', function () {
        showToast('Password change link would be sent to your email.');
      });
    }

    var toggle2fa = document.getElementById('toggle2fa');
    if (toggle2fa) {
      toggle2fa.addEventListener('change', function () {
        if (toggle2fa.checked) {
          update2FAUI();
        } else {
          try {
            localStorage.removeItem(TWOFA_STORAGE_KEY);
          } catch (e) {}
          update2FAUI();
          showToast('Two-factor authentication disabled.');
        }
      });
    }

    var twofaVerifyCode = document.getElementById('twofaVerifyCode');
    var twofaVerifyBtn = document.getElementById('twofaVerifyBtn');
    if (twofaVerifyBtn) {
      twofaVerifyBtn.addEventListener('click', function () {
        var code = (twofaVerifyCode && twofaVerifyCode.value) ? twofaVerifyCode.value.replace(/\D/g, '') : '';
        if (code.length !== 6) {
          showToast('Please enter the 6-digit code from Google Authenticator.');
          return;
        }
        try {
          localStorage.setItem(TWOFA_STORAGE_KEY, '1');
        } catch (e) {}
        update2FAUI();
        if (twofaVerifyCode) twofaVerifyCode.value = '';
        showToast('Two-factor authentication enabled. Your account is now protected with Google Authenticator.');
      });
    }

    var twofaCopyKey = document.getElementById('twofaCopyKey');
    if (twofaCopyKey) {
      twofaCopyKey.addEventListener('click', function () {
        var secretEl = document.getElementById('twofaSecretKey');
        var secret = secretEl ? secretEl.textContent.replace(/\s/g, '') : '';
        if (!secret || secret.indexOf('—') !== -1) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(secret).then(function () {
              showToast('Secret key copied to clipboard.');
            });
          } else {
            var ta = document.createElement('textarea');
            ta.value = secret;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Secret key copied to clipboard.');
          }
        } catch (e) {
          showToast('Could not copy. Please copy the key manually.');
        }
      });
    }

    update2FAUI();

    var toggleEmail = document.getElementById('toggleEmail');
    var toggleSms = document.getElementById('toggleSms');
    var smsNumberWrap = document.getElementById('smsNumberWrap');
    var smsPhoneNumber = document.getElementById('smsPhoneNumber');
    var smsSaveNumber = document.getElementById('smsSaveNumber');

    if (toggleEmail) {
      toggleEmail.addEventListener('change', function () {
        showToast(toggleEmail.checked ? 'Email booking notifications enabled.' : 'Email booking notifications disabled.');
      });
    }

    try {
      if (localStorage.getItem(SMS_ENABLED_KEY) === '1' && smsNumberWrap) {
        smsNumberWrap.classList.add('is-visible');
        smsNumberWrap.setAttribute('aria-hidden', 'false');
        if (toggleSms) toggleSms.checked = true;
        if (smsPhoneNumber && localStorage.getItem(SMS_STORAGE_KEY)) {
          smsPhoneNumber.value = localStorage.getItem(SMS_STORAGE_KEY);
        }
      }
    } catch (e) {}

    if (toggleSms) {
      toggleSms.addEventListener('change', function () {
        if (toggleSms.checked) {
          if (smsNumberWrap) {
            smsNumberWrap.classList.add('is-visible');
            smsNumberWrap.setAttribute('aria-hidden', 'false');
          }
          try {
            localStorage.setItem(SMS_ENABLED_KEY, '1');
          } catch (e) {}
          showToast('SMS reminders enabled. Enter your phone number and save.');
        } else {
          if (smsNumberWrap) {
            smsNumberWrap.classList.remove('is-visible');
            smsNumberWrap.setAttribute('aria-hidden', 'true');
          }
          try {
            localStorage.removeItem(SMS_ENABLED_KEY);
          } catch (e) {}
          showToast('SMS reminders disabled.');
        }
      });
    }

    if (smsSaveNumber && smsPhoneNumber) {
      smsSaveNumber.addEventListener('click', function () {
        var phone = smsPhoneNumber.value.trim();
        if (!phone) {
          showToast('Please enter your phone number for SMS reminders.');
          return;
        }
        try {
          localStorage.setItem(SMS_STORAGE_KEY, phone);
          localStorage.setItem(SMS_ENABLED_KEY, '1');
          if (toggleSms) toggleSms.checked = true;
          if (smsNumberWrap) {
            smsNumberWrap.classList.add('is-visible');
            smsNumberWrap.setAttribute('aria-hidden', 'false');
          }
        } catch (e) {}
        showToast('Phone number saved. You will receive booking reminders by SMS.');
      });
    }

    document.querySelectorAll('.security-block .toggle__input').forEach(function (input) {
      if (input.id === 'toggle2fa' || input.id === 'toggleSms' || input.id === 'toggleEmail') return;
      input.addEventListener('change', function () {
        showToast('Preferences updated.');
      });
    });
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (isSidebarOpen()) closeSidebar();
      else openSidebar();
    });
  }
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isSidebarOpen()) closeSidebar();
  });

  initNavigation();
  initGettingStarted();
  initBookFlow();
  initPaymentFlow();
  initReschedule();
  initAddons();
  initEmergencyForm();
  initSecurity();

  renderHistoryTable();
  renderNextAppointment();
})();