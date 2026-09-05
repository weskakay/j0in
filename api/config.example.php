<?php
// Copy this file to config.php on the server and fill in the real values.
// config.php is gitignored and never committed.
//
// Note: on shared hosting the database usually runs on its own host.
// "localhost" will not connect. Take the host from the hosting panel.
//
// The Google block stays empty until the calendar is connected. Leave it as
// it is and the calendar simply stays switched off; nothing else breaks.
//
// 'secret_key' seals the stored Google tokens. Generate one once with
//   php -r "echo bin2hex(random_bytes(32));"
// and keep it. Replacing it makes every stored token unreadable, which only
// means the calendar has to be connected again.
return [
    'host'    => 'your-db-host',
    'dbname'  => 'YOUR_DB_NAME',
    'user'    => 'YOUR_DB_USER',
    'pass'    => 'YOUR_DB_PASSWORD',
    'charset' => 'utf8mb4',

    'secret_key' => '',

    'google' => [
        'client_id'     => '',
        'client_secret' => '',
        'redirect_uri'  => 'https://j0in.weskakay.de/api/calendar/callback',
    ],
];
