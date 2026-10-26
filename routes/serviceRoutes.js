const express = require('express');
const router = express.Router();
const { getServices, getSlots } = require('../controllers/serviceController');

router.get('/services', getServices);
router.get('/slots', getSlots);

module.exports = router;
