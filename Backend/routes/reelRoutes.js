const express = require('express');
const router = express.Router();

const { getReels, incrementViewCount } = require('../controller/reelController.js');

router.get('/', getReels);
router.post('/:id/view', incrementViewCount);

module.exports = router;

