// emailTemplates.js

/**
 * Reusable layout wrapper for Ahaan Software Consulting emails
 */
const wrap = (heading, content, primaryLink = null, buttonText = 'View Details') => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${heading}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8; padding: 40px 0;">
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
              
              <!-- Header -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center;">
                  <h2 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">${heading}</h2>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 0 40px 30px 40px; color: #374151; font-size: 16px; line-height: 24px;">
                  ${content}
                  
                  ${primaryLink ? `
                    <!-- CTA Button -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 10px 0 30px 0;">
                          <a href="${primaryLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">${buttonText}</a>
                        </td>
                      </tr>
                    </table>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <!-- Fallback Link -->
                    <p style="margin: 0; font-size: 13px; color: #9ca3af; word-break: break-all;">
                      Having trouble with the button? Copy and paste this URL into your browser:<br>
                      <a href="${primaryLink}" style="color: #2563eb; text-decoration: underline;">${primaryLink}</a>
                    </p>
                  ` : ''}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af;">
                  <p style="margin: 0;">&copy; ${new Date().getFullYear()} Ahaan Software Consulting. All rights reserved.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

module.exports = {
  addedToBoard: ({ boardName, addedBy, boardLink }) => ({
    subject: `You were added to "${boardName}"`,
    html: wrap(
      'Added to a project',
      `<p style="margin: 0 0 20px 0;">Hi there,</p>
       <p style="margin: 0 0 25px 0;"><b>${addedBy}</b> added you to the project board <b>${boardName}</b> at Ahaan Software Consulting.</p>`,
      boardLink,
      'View Project Board'
    ),
  }),

  taskAssigned: ({ taskTitle, boardName, assignedBy, taskLink }) => ({
    subject: `New task assigned: ${taskTitle}`,
    html: wrap(
      'New Task Assigned',
      `<p style="margin: 0 0 20px 0;">Hi there,</p>
       <p style="margin: 0 0 25px 0;"><b>${assignedBy}</b> assigned you a new task <b>${taskTitle}</b> in <b>${boardName}</b>.</p>`,
      taskLink,
      'View Task'
    ),
  }),

  statusChanged: ({ taskTitle, boardName, changedBy, from, to, taskLink }) => ({
    subject: `Task moved to ${to}: ${taskTitle}`,
    html: wrap(
      'Task Status Updated',
      `<p style="margin: 0 0 20px 0;">Hi there,</p>
       <p style="margin: 0 0 20px 0;"><b>${changedBy}</b> updated the status of <b>${taskTitle}</b> in <b>${boardName}</b>.</p>
       <p style="font-size:16px; margin: 0 0 25px 0;">
         <span style="background:#e5e7eb; color:#374151; padding:6px 12px; border-radius:999px; font-weight: 500;">${from}</span> 
         <span style="color:#9ca3af; margin: 0 8px;">&rarr;</span> 
         <span style="background:#2563eb; color:#ffffff; padding:6px 12px; border-radius:999px; font-weight: 500;">${to}</span>
       </p>`,
      taskLink,
      'View Task Details'
    ),
  }),
  commentAdded: ({ taskTitle, boardName, commentedBy, comment, taskLink }) => ({
    subject: `New comment on: ${taskTitle}`,
    html: wrap(
      'New Comment Added',
      `<p style="margin: 0 0 20px 0;">Hi there,</p>
       <p style="margin: 0 0 20px 0;">
         <b>${commentedBy}</b> added a comment to the task
         <b>${taskTitle}</b> in <b>${boardName || 'your project'}</b>.
       </p>
       <div style="
         background:#f3f4f6;
         border-left:4px solid #2563eb;
         padding:15px 18px;
         margin:20px 0 25px 0;
         border-radius:4px;
         color:#374151;
       ">
         ${comment}
       </div>`,
      taskLink,
      'View Task'
    ),
  }),

};