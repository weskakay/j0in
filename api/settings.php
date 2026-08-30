<?php

// Who may get in. Visitors take the guest board, which is shared and filled
// with demo cards. Signing up files a request that the owner has to approve,
// so the door can stand open without anyone slipping through it.
const J0IN_SIGNUP_OPEN = true;
const J0IN_GUEST_OPEN = true;

// Sender of the notification. It has to be an address on this server's own
// domain: a mail claiming a foreign sender is dropped by most recipients.
const J0IN_MAIL_FROM = 'noreply@weskakay.de';
