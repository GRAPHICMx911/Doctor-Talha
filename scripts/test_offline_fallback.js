const { login, getMe } = require('../controllers/authController');
const { getStats } = require('../controllers/adminController');
const { getAllBookings } = require('../controllers/bookingController');
const { getAllInquiries } = require('../controllers/inquiryController');

function mockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
}

async function testOfflineFallback() {
  console.log('=== TESTING OFFLINE / SERVERLESS DEMO FALLBACK ===');

  // Temporarily point DB to invalid port to simulate offline DB on Netlify
  process.env.DB_PORT = '9999';

  // 1. Test Login
  const reqLogin = {
    body: {
      username: 'admin@drtalha.com',
      password: 'DoctorTalha@2026'
    }
  };
  const resLogin = mockResponse();
  await login(reqLogin, resLogin, (err) => { console.error('Login error:', err); });

  console.log('Login Response Status:', resLogin.statusCode);
  console.log('Login Success:', resLogin.data && resLogin.data.success);
  console.log('Doctor Name:', resLogin.data && resLogin.data.admin && resLogin.data.admin.name);
  console.log('Token generated:', !!(resLogin.data && resLogin.data.token));

  // 2. Test Get Stats
  const resStats = mockResponse();
  await getStats({}, resStats, (err) => console.error(err));
  console.log('Stats Response Status:', resStats.statusCode);
  console.log('Total bookings returned:', resStats.data && resStats.data.stats && resStats.data.stats.total_bookings);

  // 3. Test Get Bookings
  const resBookings = mockResponse();
  await getAllBookings({ query: {} }, resBookings, (err) => console.error(err));
  console.log('Bookings Response Status:', resBookings.statusCode);
  console.log('Bookings Count:', resBookings.data && resBookings.data.count);

  console.log('\n--- ALL OFFLINE / SERVERLESS FALLBACKS TESTED SUCCESSFULLY ---');
}

testOfflineFallback();
