const boardRepo = require('./board.repository');
const columnRepo = require('../columns/column.repository');
const taskRepo = require('../tasks/task.repository');
const { getUsersByIds } = require('../../utils/userClient');
const { notifyUser } = require('../../utils/notifyClient');

/** Attaches { name, email, role } from the user-service onto owner/members ids. */
async function withMemberInfo(board) {
  const usersById = await getUsersByIds([board.owner, ...board.members]);
  return {
    ...board,
    owner: usersById[board.owner] || { id: board.owner },
    members: board.members.map((id) => usersById[id] || { id }),
  };
}

const createBoard = async (req, res) => {
  const { name, members } = req.body;
  const ownerId = req.user._id;

  try {
    const newBoard = await boardRepo.create({ name, owner: ownerId, memberIds: members || [] });
    return res.status(201).json(await withMemberInfo(newBoard));
  } catch (error) {
    console.error('Error creating Board', error);
    res.status(500).json({ message: 'server error: failed to create board' });
  }
};

const getBoardsForUser = async (req, res) => {
  try {
    const boards = await boardRepo.findByMember(req.user._id);
    const enriched = await Promise.all(boards.map(withMemberInfo));
    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error fetching boards ', error);
    res.status(500).json({ message: 'server error: could not fetch boards' });
  }
};

const getBoardById = async (req, res) => {
  const boardId = req.params.id;
  try {
    const board = await boardRepo.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const isMember = board.members.some((m) => String(m) === String(req.user?._id));
    if (!isMember) return res.status(403).json({ message: 'Access Denied. You are not a member of Board' });

    const columns = await columnRepo.findByBoard(boardId);
    const tasks = await taskRepo.findByBoards([boardId]);
    const tasksByColumn = tasks.reduce((acc, t) => {
      (acc[t.column_id] = acc[t.column_id] || []).push(t);
      return acc;
    }, {});

    const assigneeIds = tasks.flatMap((t) => t.assignedTo);
    const usersById = await getUsersByIds(assigneeIds);

    const enrichedColumns = columns.map((col) => ({
      ...col,
      tasks: (tasksByColumn[col.id] || []).map((t) => ({
        ...t,
        assignedTo: t.assignedTo.map((id) => usersById[id] || { id })
      })),
    }));

    const enrichedBoard = await withMemberInfo(board);
    res.status(200).json({ ...enrichedBoard, columns: enrichedColumns });
  } catch (error) {
    console.error(`Error fetching board ${boardId}:`, error);
    res.status(500).json({ message: 'Server error: Failed to retrieve board details' });
  }
};

const addMemberToBoard = async (req, res) => {
  const { boardId } = req.params;
  const { memberId } = req.body;

  try {
    const board = await boardRepo.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    if (board.members.includes(memberId)) {
      return res.status(400).json({ message: 'User already a member' });
    }

    await boardRepo.addMember(boardId, memberId);

    // Replaces the old post('save') Mongoose hook that called
    // Notification.create() in-process — notifications now live in their
    // own service, so this is an explicit HTTP call after the write commits.
    await notifyUser({
      userId: memberId,
      title: 'Added to board',
      message: `You were added to the board "${board.name}"`,
    });

    const updated = await boardRepo.findById(boardId);
    return res.status(200).json(await withMemberInfo(updated));
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteBoard = async (req, res) => {
  const { boardId } = req.params;
  try {
    const board = await boardRepo.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'board not found' });
    }
    // FK ON DELETE CASCADE removes board_members/columns/tasks (and each
    // task's comments/attachments/activity log) automatically.
    await boardRepo.deleteById(boardId);
    return res.status(200).json({ message: 'Board deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'server error during deleting process' });
  }
};

const editBoard = async (req, res) => {
  const { boardId } = req.params;
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(403).json({ message: 'board name is not found' });
  }
  try {
    const board = await boardRepo.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: 'board is not found' });
    }
    if (String(board.owner) !== String(req.user._id)) {
      return res.status(400).json({ message: 'only owner can edit the board' });
    }
    await boardRepo.updateName(boardId, name);

    const updated = await boardRepo.findById(boardId);
    return res.status(200).json(await withMemberInfo(updated));
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { createBoard, getBoardsForUser, getBoardById, addMemberToBoard, deleteBoard, editBoard };
