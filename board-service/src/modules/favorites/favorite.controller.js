const favoriteRepo = require('./favorite.repository');
const { getAccessibleTask } = require('../tasks/task.access');

const toggleFavorite = async (req, res) => {
  try {
    const access = await getAccessibleTask(req, res, req.params.taskId);
    if (!access) return;
    const is_favorited = await favoriteRepo.toggle(req.params.taskId, req.user.id);
    res.status(200).json({ is_favorited });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle favorite' });
  }
};
module.exports = { toggleFavorite };