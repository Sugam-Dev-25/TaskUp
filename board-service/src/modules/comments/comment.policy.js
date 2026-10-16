const isStaff = (user) => ['manager', 'ceo'].includes(user?.role);
const isAuthor = (user, comment) => String(comment.user_id) === String(user?.id);

// Edit: authors only (nobody puts words in someone else's mouth).
const canEdit = (user, comment) => isAuthor(user, comment);
// Delete: the author, or a manager/CEO moderating. To make it authors-only, drop `|| isStaff(user)`.
const canDelete = (user, comment) => isAuthor(user, comment) || isStaff(user);

module.exports = { canEdit, canDelete };