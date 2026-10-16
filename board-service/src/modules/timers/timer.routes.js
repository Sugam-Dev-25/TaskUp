const express=require('express');
const router=express.Router();
const { protect } = require("../../middleware/auth");
const { toggleTimer, getMyActiveTimer } = require("./timer.controller");

router.post('/:taskId/timer', protect, toggleTimer);
router.get('/timers/active', protect, getMyActiveTimer);   

module.exports=router;