import mysql from 'mysql2'

let set_for_sso_users = {
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBNAME_SSO_USERS,
    charset: 'utf8mb4_general_ci',
    waitForConnections: true,
    connectionLimit: 50,maxIdle: 50,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
}

let set_for_attendance = {
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBNAME_ATTNDNC,
    charset: 'utf8mb4_general_ci',
    waitForConnections: true,
    connectionLimit: 50,maxIdle: 50,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
}

const sso = mysql.createPool(set_for_sso_users).promise();
console.log('Подключение к базе sso успешно.');
const attndnc = mysql.createPool(set_for_attendance).promise();
console.log('Подключение к базе attendance успешно.');

// ФУНКЦИИ ДЛЯ ВЗАИМОДЕЙСТВИЯ С БАЗОЙ ДАННЫХ

export async function getKafsByRange(minId, maxId) {
  const sql = `
    SELECT id, name
    FROM kaf_name
    WHERE id BETWEEN ? AND ?
    ORDER BY id
  `;
  const [rows] = await sso.query(sql, [minId, maxId]);
  console.log(rows);
  return rows; // [{id, name}, ...]
}

export async function getKafById(id) {
  const sql = `
    SELECT id, name 
    FROM kaf_name
    WHERE id = ? LIMIT 1
  `;
  const [rows] = await sso.query(sql, [id]);
  console.log(rows);
  return rows[0] || null;
}

export async function getMembersByKafId(kafId) {
  const sql = `
    SELECT
      u.id,
      u.name,
      COALESCE(v.status, 0) AS status,
      CASE
        WHEN v.datetime IS NULL THEN 'Не отмечен'
        WHEN COALESCE(v.status,0) = 1
          THEN CONCAT('В школе с ', DATE_FORMAT(v.datetime, '%H:%i'))
        ELSE
          CONCAT('Был(а) в школе в ', DATE_FORMAT(v.datetime, '%H:%i %d.%m.%Y'))
      END AS subtitle
    FROM sso.users AS u
    JOIN kaf_name k ON k.id = ? AND u.kaf = k.id
    LEFT JOIN (
      SELECT vv.user_id, vv.status, vv.datetime
      FROM attendance.visits vv
      JOIN (
        SELECT user_id, MAX(datetime) AS max_dt
        FROM attendance.visits
        GROUP BY user_id
      ) last ON last.user_id = vv.user_id AND last.max_dt = vv.datetime
    ) v ON v.user_id = u.id
    ORDER BY u.name;
  `;
  const [rows] = await sso.query(sql, [kafId]);
    console.log(rows);
  return rows;
}

export async function addVisit(userId, status) {
  const sql = `
    INSERT INTO attendance.visits (user_id, kaf_id, datetime, status)
    SELECT u.id, u.kaf, NOW(), ?
    FROM sso.users u
    JOIN kaf_name k ON k.id = u.kaf
    WHERE u.id = ?
  `;
  const [res] = await sso.query(sql, [status, userId]);
  return res.insertId;
}

export async function makeAllRed() { // в конце дня забывшие отметиться считаются ушедшими
  const sql = `
    INSERT INTO attendance.visits (user_id, datetime, status)
    VALUES (user_id, '23:59:00 + today, 0)
  `;
}