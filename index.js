import express from 'express'
import { engine } from 'express-handlebars'
import exphbs from 'express-handlebars'
import { fileURLToPath } from 'url'
import path from 'path'

import 'dotenv/config'
import * as db from './public/vendor/db.mjs'

const PORT = process.env.PORT || 3000

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename.split('///')[0]);
const MODE_RANGES = {
  students: { min: 1,  max: 15, title: 'Выберите класс:'    },
  teachers: { min: 16, max: 25, title: 'Выберите кафедру:'  }
};

const hbs = exphbs.create({
    defaultLayout: 'main',
    extname: 'hbs'
});

app.set('view engine', 'hbs');
app.set('views', 'views');

app.use(express.urlencoded({extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; base-uri 'self'");
  next();
});

app.engine('hbs', engine(
    {
        extname: 'hbs',
        layoutsDir: path.join(__dirname, 'views', 'layouts'),
        partialsDir: path.join(__dirname, 'views', 'partials'),
        defaultLayout: 'main',

        // 👇 Добавляем helpers прямо здесь
        helpers: {
            eq: (a, b) => a == b,
            ne: (a, b) => a != b,
            lt: (a, b) => a < b,
            gt: (a, b) => a > b,
            and: (a, b) => a && b,
            or:  (a, b) => a || b
        }
    }
));

// импорты и настройки завершены, ниже логика сервиса

app.get('/', async (req, res) => {
  res.render('index', {
    title: 'Сервис посещаемости',
    activeMode: '' // или 'students' — как хочешь
  });
});

app.get('/kafs', async (req, res, next) => {
  try {
    const modeRaw = (req.query.mode || '').toLowerCase();
    const mode = MODE_RANGES[modeRaw] ? modeRaw : 'students'; // дефолт
    const cfg = MODE_RANGES[mode];
    const groups = await db.getKafsByRange(cfg.min, cfg.max);

    res.render('groups', {
      title: cfg.title,
      mode,           // если используешь в шаблоне
      groups,
      activeMode: mode // 👈 сюда
    });
  } catch (e) { next(e); }
});

app.get('/kafs/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const kind =
      (id >= 1 && id <= 15) ? 'students' :
      (id >= 16 && id <= 25) ? 'teachers' : 'unknown';

    if (kind === 'unknown') return res.status(404).send('Group not in allowed range');

    const kaf     = await db.getKafById(id);
    const members = await db.getMembersByKafId(id);

    res.render('members', {
      title: kind === 'students'
        ? `Ученики класса ${kaf.name}`
        : `Преподаватели кафедры "${kaf.name}"`,
      members,
      kind,
      kafId: id,
      kafName: kaf.name,
      activeMode: kind // 👈 чтобы в nav подсветка сохранялась
    });
  } catch (e) { next(e); }
});

app.post('/visits', async (req, res, next) => {
  try {
    const userId = Number(req.body?.userId);
    const status = Number(req.body?.status);

    if (!Number.isInteger(userId) || !(status === 0 || status === 1)) {
      return res.status(400).json({ ok: false, error: 'Bad params' });
    }

    const insertId = await db.addVisit(userId, status); // ← только так
    res.json({ ok: true, id: insertId });
  } catch (err) {
    next(err);
  }
});

app.post('/allout', async (req, res, next) => {
  
})

async function start() { // старт приложения
    try {
        app.listen(PORT, () => {
            console.log('Сервер посещаемости запущен...');
        })}
    catch (error) {
        console.log(error);
    }
}

start();
