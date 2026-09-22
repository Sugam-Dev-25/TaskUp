const boardRepo = require('../boards/board.repository');
const columnRepo = require('./column.repository');

const createColumn = async (req, res) => {
  const boardId = req.params.boardId;
  const { name } = req.body;
  try {
    const isMember = await boardRepo.isMember(boardId, req.user._id);
    if (!(await boardRepo.findById(boardId))) {
      return res.status(404).json({ message: 'Board Not found' });
    }
    if (!isMember) {
      return res.status(403).json({ message: 'Access Denied: You must be Member to Modify this board.' });
    }
    const newColumn = await columnRepo.create({ name, boardId });
    res.status(201).json(newColumn);
  } catch (error) {
    console.error(`Error creating Column for Board ${boardId}`, error);
    return res.status(500).json({ message: 'Server error: failed to create column' });
  }
};

const deleteColumn = async (req, res) => {
  const { columnId } = req.params;
  try {
    const column = await columnRepo.findById(columnId);
    if (!column) return res.status(404).json({ message: 'Column is not found' });

    const isMember = await boardRepo.isMember(column.board_id, req.user._id);
    if (!isMember) return res.status(403).json({ message: 'Deleting Column has not access' });

    // FK ON DELETE CASCADE removes the column's tasks (and their
    // comments/attachments/activity/daily logs) automatically.
    await columnRepo.deleteById(columnId);
    res.status(200).json({ message: 'Deleted column successfully' });
  } catch (error) {
    console.log('something went wrong', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getColumns = async (req, res) => {
  try {
    const columns = await columnRepo.findByBoard(req.params.boardId);
    res.status(200).json(columns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching columns' });
  }
};

module.exports = { createColumn, deleteColumn, getColumns };
