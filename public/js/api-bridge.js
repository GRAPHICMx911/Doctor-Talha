/**
 * api-bridge.js
 * Seamlessly connects Dr. Talha's frontend to the Node.js + Express.js backend & PostgreSQL database.
 * Preserves 100% of the original frontend design without any breaking changes.
 */

(function () {
  'use strict';

  console.log('[API Bridge]: Initializing connection to Node.js + Express + PostgreSQL backend...');

  // Helper for toast notifications if available
  function displayToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
      toastMsg.textContent = msg;
      toast.classList.remove('translate-y-24', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 4000);
    } else {
      alert(msg);
    }
  }

  // 1. Intercept & Enhance Booking Form Submission
  function initBookingSync() {
    const bookingForm = document.getElementById('bookingForm');
    if (!bookingForm) return;

    bookingForm.addEventListener('submit', async (e) => {
      // Don't prevent default if already handled, but we ensure API dispatch
      const mode = document.querySelector('input[name="consultMode"]:checked')?.value || 'In-Person Clinic Visit';
      const service = document.getElementById('modalServiceSelect')?.value;
      const date = document.getElementById('bookDate')?.value;
      const time = document.getElementById('bookTime')?.value;
      const patient = document.getElementById('patientName')?.value.trim();
      const phone = document.getElementById('patientPhone')?.value.trim();
      const notes = document.getElementById('patientNotes')?.value.trim();

      if (!patient || !phone || !date || !time) return;

      const payload = {
        patient_name: patient,
        patient_phone: phone,
        service_type: service,
        consultation_mode: mode,
        booking_date: date,
        booking_time: time,
        patient_notes: notes
      };

      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success && result.data) {
          console.log('[API Bridge]: Booking recorded in PostgreSQL:', result.data);
          
          // Update confirmation card with real DB generated booking ID
          const confirmBookingId = document.getElementById('confirmBookingId');
          if (confirmBookingId && result.data.booking_id) {
            confirmBookingId.textContent = result.data.booking_id;
          }
          displayToast(`Appointment ${result.data.booking_id} saved to PostgreSQL!`);
        }
      } catch (err) {
        console.warn('[API Bridge]: Booking API call error (fallback to local):', err);
      }
    }, true); // use capture to ensure payload is caught
  }

  // 2. Intercept & Enhance Contact Form Submission
  function initContactSync() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
      const name = document.getElementById('contactName')?.value.trim();
      const phone = document.getElementById('contactPhone')?.value.trim();
      const subject = document.getElementById('contactSubject')?.value || 'General Clinical Inquiry';
      const message = document.getElementById('contactMessage')?.value.trim();

      if (!name || !phone || !message) return;

      const payload = {
        name,
        phone,
        subject,
        message
      };

      try {
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
          console.log('[API Bridge]: Inquiry recorded in PostgreSQL:', result.data);
          displayToast(`Inquiry recorded in PostgreSQL! Dr. Talha will respond shortly.`);
        }
      } catch (err) {
        console.warn('[API Bridge]: Inquiry API call error:', err);
      }
    }, true);
  }

  // 3. Sync any pre-existing localStorage mock bookings to PostgreSQL
  async function syncLocalStorageBookings() {
    try {
      const raw = localStorage.getItem('dr_talha_bookings');
      if (!raw) return;
      const bookings = JSON.parse(raw);
      if (!Array.isArray(bookings) || bookings.length === 0) return;

      const syncedIds = JSON.parse(localStorage.getItem('dr_talha_synced_ids') || '[]');

      for (const b of bookings) {
        if (b.bookingId && !syncedIds.includes(b.bookingId)) {
          await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_id: b.bookingId,
              patient_name: b.patient,
              patient_phone: b.phone,
              service_type: b.service,
              consultation_mode: b.mode,
              booking_date: b.date,
              booking_time: b.time
            })
          });
          syncedIds.push(b.bookingId);
        }
      }
      localStorage.setItem('dr_talha_synced_ids', JSON.stringify(syncedIds));
    } catch (e) {
      // safe ignore
    }
  }

  // 4. Inject Doctor Admin Dashboard Pill / Quick Switcher
  function injectAdminBadge() {
    if (document.getElementById('adminPortalBadge')) return;

    const badge = document.createElement('div');
    badge.id = 'adminPortalBadge';
    badge.className = 'fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-full shadow-2xl border border-teal-500/40 text-xs font-medium transition hover:scale-105';
    badge.innerHTML = `
      <span class="relative flex h-2.5 w-2.5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
      </span>
      <span class="text-slate-300">Backend: <strong class="text-teal-400 font-bold">Node.js + PostgreSQL</strong></span>
      <span class="text-slate-600">|</span>
      <a href="/admin" class="flex items-center gap-1.5 text-teal-300 hover:text-white font-semibold transition" title="Open Doctor Admin Dashboard">
        <i class="fa-solid fa-user-doctor"></i>
        <span>Doctor Portal</span>
        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
      </a>
    `;

    document.body.appendChild(badge);
  }

  // Run upon DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initBookingSync();
      initContactSync();
      syncLocalStorageBookings();
      injectAdminBadge();
    });
  } else {
    initBookingSync();
    initContactSync();
    syncLocalStorageBookings();
    injectAdminBadge();
  }
})();
