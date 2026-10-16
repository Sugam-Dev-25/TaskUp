const express=require('express');
const { protect } = require('../../middleware/auth');
const { toggleFavorite } = require('./favorite.controller');
const router=express.Router();

router.post('/:taskId/favorite', protect, toggleFavorite);

module.exports=router;