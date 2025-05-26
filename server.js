require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 3000;

// Configurare baza de date MySQL
const pool = mysql.createPool({
  // host: "eu-cluster-west-01.k8s.cleardb.net",
  // user: "bb0d9bead54859",
  // password: "b3856fd0",
  // database: "heroku_e6812b9fc9fa776",
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 1000,
  queueLimit: 0,
});

// Secretul pentru JWT
const jwtSecret =
  "uK9!xP2@vQ7#hD6$eB4%rT8&fL1*zM3^jW5(yN0)qE9*sR2@lF7#zH8&kJ1$uT4";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/; // Tipuri de fișiere acceptate
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Tip de fișier invalid. Acceptăm doar imagini."));
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://esportshaxball-84079547de49.herokuapp.com",
        "https://cdn.jsdelivr.net",
      ], // Adaugă aici domeniul tău
      connectSrc: [
        "'self'",
        "https://esportshaxball-84079547de49.herokuapp.com",
      ], // Permite conexiuni la domeniul tău
    },
  })
);
app.use(express.static(path.join(__dirname))); // Servește fișiere statice
app.use("/uploads", express.static("uploads"));

// Verificare conexiune la baza de date
async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Conexiune la baza de date realizată cu succes!");
    connection.release(); // Eliberează conexiunea
  } catch (err) {
    console.error("Eroare la conectarea la baza de date:", err.message);
  }
}

checkDatabaseConnection();

// Middleware pentru verificarea token-ului
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("Token is missing."); // Log pentru debugging
    return res.status(403).json({ message: "Token-ul este necesar." });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      console.log("Invalid token:", err); // Log pentru debugging
      return res.status(403).json({ message: "Token invalid." });
    }
    req.user = decoded;
    console.log("Token valid:", req.user); // Log pentru debugging
    next();
  });
}

// Endpoint pentru înregistrare
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  let connection;
  try {
    connection = await pool.getConnection(); // Obține conexiunea din pool
    const [existingUser] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).send("Email-ul este deja utilizat.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { name, email, password: hashedPassword };

    await connection.query("INSERT INTO users SET ?", user);

    res.send(`
      <!DOCTYPE html>
      <html lang="ro">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Înscriere reușită</title>
      </head>
      <body>
          <h1>Înregistrare reușită!</h1>
          <p>Contul tău a fost creat cu succes.</p>
          <a href="/login.html">Înapoi la pagina de logare</a>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Eroare la înregistrarea userului:", err);
    res.status(500).send(`Eroare la înregistrarea userului: ${err.message}`);
  } finally {
    if (connection) connection.release(); // Asigură-te că eliberezi conexiunea
  }
});

// Endpoint pentru obținerea numărului total de utilizatori
app.get("/totalUsers", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection(); // Obține conexiunea din pool
    const [rows] = await connection.query(
      "SELECT COUNT(*) as total FROM users"
    );

    res.json({ total: rows[0].total });
  } catch (err) {
    console.error("Eroare la obținerea numărului total de utilizatori:", err);
    res.status(500).send("Eroare la obținerea numărului total de utilizatori.");
  } finally {
    if (connection) connection.release(); // Asigură-te că eliberezi conexiunea
  }
});

// Endpoint pentru autentificare
app.post("/login", async (req, res) => {
  const { name, password } = req.body;

  // Verifică dacă utilizatorul este deja conectat
  const token = req.headers["authorization"];
  if (token) {
    return res.status(403).send("Utilizatorul este deja conectat.");
  }

  let connection;
  try {
    connection = await pool.getConnection(); // Obține conexiunea din pool
    const [rows] = await connection.query(
      "SELECT * FROM users WHERE name = ?",
      [name]
    );

    if (rows.length === 0) {
      return res.status(401).send("Username or password wrong!");
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send("Username or password wrong!");
    }

    // Logare reușită
    const newToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // Afișează mesajul de logare reușită
    res.json({ token: newToken, name: user.name, userId: user.id });
  } catch (err) {
    console.error("Eroare la autentificare:", err);
    res.status(500).send("Eroare la procesarea autentificării.");
  } finally {
    if (connection) connection.release(); // Asigură-te că eliberezi conexiunea
  }
});

// Endpoint pentru deconectare
app.post("/logout", (req, res) => {
  // Deconectarea este gestionată pe client prin ștergerea token-ului
  res.send("Utilizatorul a fost deconectat.");
});

// Endpoint pentru obținerea listei de utilizatori cu logo-ul echipei
app.get("/users", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const query = `
      SELECT 
        users.id, 
        users.name, 
        users.profilePic, 
        teams.logo 
      FROM users 
      LEFT JOIN teams ON users.team_name = teams.team_name
    `;
    const [rows] = await connection.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea utilizatorilor:", err);
    res.status(500).send("Eroare la obținerea utilizatorilor.");
  } finally {
    connection.release(); // Eliberarea conexiunii
  }
});

// Endpoint pentru obținerea detaliilor unui utilizator
app.get("/users/:id", async (req, res) => {
  const userId = req.params.id;
  const connection = await pool.getConnection();

  try {
    // Preluare detalii utilizator cu flag_name din tabela country
    const [userRows] = await connection.query(
      `SELECT users.id, users.name, users.email, users.goals, users.assists, users.team_name, users.profilePic, users.matches_played, users.cleansheets, users.season_name, teams.logo AS team_logo, country.flag_name, country.country_name 
        FROM users
        LEFT JOIN teams ON users.team_name = teams.team_name
        LEFT JOIN country ON users.country_id = country.id
        WHERE users.id = ?`,
      [userId]
    );

    // Preluare trofee
    const [trophiesRows] = await connection.query(
      `SELECT trophy_name, trophy_image 
       FROM trophies 
       WHERE user_id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const user = {
      ...userRows[0],
      trophies: trophiesRows,
    };

    res.json(user);
  } catch (err) {
    console.error("Eroare la obținerea detaliilor utilizatorului:", err);
    res.status(500).send("Eroare la obținerea detaliilor utilizatorului.");
  } finally {
    connection.release(); // Eliberarea conexiunii
  }
});

// Endpoint pentru obținerea detaliilor unui jucător de futsal
app.get("/futsalusers/:id", async (req, res) => {
  const userId = req.params.id;
  const connection = await pool.getConnection();

  try {
    // Preluare detalii utilizator de futsal, cu detalii despre echipa de futsal și țara
    const [userRows] = await connection.query(
      `SELECT users.id, users.name, users.email, users.futsal_goals, users.futsal_assists, 
              users.futsal_team_name, users.profilePic, users.futsal_matches_played, 
              users.futsal_cleansheets, users.futsal_season_name, futsal_teams.futsal_logo AS futsal_team_logo, 
              country.flag_name, country.country_name 
       FROM users
       LEFT JOIN futsal_teams ON users.futsal_team_name = futsal_teams.futsal_team_name
       LEFT JOIN country ON users.country_id = country.id
       WHERE users.id = ?`,
      [userId]
    );

    // Preluare trofee ale utilizatorului pentru futsal (opțional, dacă există)
    const [trophiesRows] = await connection.query(
      `SELECT trophy_name, trophy_image 
       FROM trophies 
       WHERE user_id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul de futsal nu a fost găsit.");
    }

    const futsalUser = {
      ...userRows[0],
      trophies: trophiesRows,
    };

    res.json(futsalUser);
  } catch (err) {
    console.error("Eroare la obținerea detaliilor jucătorului de futsal:", err);
    res
      .status(500)
      .send("Eroare la obținerea detaliilor jucătorului de futsal.");
  } finally {
    connection.release(); // Eliberarea conexiunii
  }
});

// Endpoint pentru încărcarea pozei de profil
app.post(
  "/uploadProfilePic/:id",
  verifyToken, // Verifică token-ul
  upload.single("profilePic"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).send("Fișierul nu a fost încărcat.");
    }

    const userId = req.params.id;
    const profilePicPath = `/uploads/${req.file.filename}`;

    const connection = await pool.getConnection(); // Obține o conexiune din pool
    try {
      await connection.query("UPDATE users SET profilePic = ? WHERE id = ?", [
        profilePicPath || "default-profile.png",
        userId,
      ]);

      res.status(200).send("Poza de profil a fost actualizată cu succes.");
    } catch (err) {
      console.error("Eroare la actualizarea pozei de profil:", err);
      res.status(500).send("Eroare la actualizarea pozei de profil.");
    } finally {
      connection.release(); // Eliberează conexiunea
    }
  }
);

// Servește fișierul users.html
app.get("/users.html", (req, res) => {
  res.sendFile(path.join(__dirname, "users.html"));
});

// Servește fișierul profile.html
app.get("/profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "profile.html"));
});

// Endpoint pentru căutarea jucătorilor
app.get("/searchPlayer", async (req, res) => {
  const name = req.query.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(
      "SELECT id, name FROM users WHERE name LIKE ?",
      [`%${name}%`]
    );

    res.json(rows); // Returnează și ID-ul jucătorului
  } catch (err) {
    console.error("Eroare la căutarea jucătorilor:", err);
    res.status(500).send("Eroare la căutarea jucătorilor.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// function verifyToken(req, res, next) {
//   const token = req.headers["authorization"];
//   if (!token) {
//     return res.status(403).json({ message: "Token-ul este necesar." });
//   }

//   jwt.verify(token, jwtSecret, (err, decoded) => {
//     if (err) {
//       return res.status(403).json({ message: "Token invalid." });
//     }
//     req.user = decoded;

//     // Verifică dacă utilizatorul este "Hakut"
//     if (req.user.name !== "Hakut") {
//       return res.status(403).json({
//         message:
//           "Acces interzis: doar utilizatorul Hakut poate accesa această resursă.",
//       });
//     }

//     next();
//   });
// }
// Endpoint pentru obținerea istoricului carierei
app.get("/careerHistory/:userId", async (req, res) => {
  const userId = req.params.userId;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(
      `SELECT career_history.team_name, career_history.matches_played, career_history.goals, career_history.assists, career_history.cleansheets, career_history.season_name, teams.logo AS team_logo
       FROM career_history
       LEFT JOIN teams ON career_history.team_name = teams.team_name
       WHERE career_history.user_id = ?
       AND career_history.team_name != 'FREE AGENT'
       ORDER BY career_history.id DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea istoricului carierei:", err);
    res.status(500).send("Eroare la obținerea istoricului carierei.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea istoricului carierei în futsal
app.get("/futsalCareerHistory/:userId", async (req, res) => {
  const userId = req.params.userId;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(
      `SELECT futsal_career_history.futsal_team_name, 
              futsal_career_history.futsal_matches_played, 
              futsal_career_history.futsal_goals, 
              futsal_career_history.futsal_assists, 
              futsal_career_history.futsal_cleansheets, 
              futsal_career_history.futsal_season_name, 
              futsal_teams.futsal_logo AS futsal_team_logo
       FROM futsal_career_history
       LEFT JOIN futsal_teams ON futsal_career_history.futsal_team_name = futsal_teams.futsal_team_name
       WHERE futsal_career_history.user_id = ?
       AND futsal_career_history.futsal_team_name != 'FREE AGENT'  -- Verificăm dacă echipa nu este "FREE AGENT"
       ORDER BY futsal_career_history.id DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea istoricului carierei în futsal:", err);
    res.status(500).send("Eroare la obținerea istoricului carierei în futsal.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru actualizarea statisticilor, echipei și sezonului unui jucător
app.put("/updatePlayer/:name", async (req, res) => {
  const playerName = req.params.name;
  const { goals, assists, matchesPlayed, cleansheets, teamName, seasonName } =
    req.body;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține ID-ul și datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, goals, assists, matches_played, cleansheets, team_name, season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals = userRows[0].goals;
    const currentAssists = userRows[0].assists;
    const currentMatchesPlayed = userRows[0].matches_played;
    const currentCleansheets = userRows[0].cleansheets;
    const currentTeamName = userRows[0].team_name;
    const currentSeasonName = userRows[0].season_name;

    // Pregătim interogarea pentru actualizarea jucătorului
    let query =
      "UPDATE users SET goals = ?, assists = ?, matches_played = ?, cleansheets = ?";
    const params = [
      currentGoals + goals,
      currentAssists + assists,
      currentMatchesPlayed + matchesPlayed,
      currentCleansheets + cleansheets,
    ];

    let changed = false; // Flag pentru a verifica dacă s-a schimbat echipa sau sezonul

    // Verificăm dacă echipa s-a schimbat
    if (teamName !== undefined && teamName !== currentTeamName) {
      query += ", team_name = ?";
      params.push(teamName);
      changed = true;
    }

    // Verificăm dacă sezonul s-a schimbat
    if (seasonName !== undefined && seasonName !== currentSeasonName) {
      query += ", season_name = ?";
      params.push(seasonName);
      changed = true;
    }

    query += " WHERE id = ?"; // Filtrăm după ID-ul jucătorului
    params.push(userId); // Adăugăm ID-ul în parametrii interogării

    await connection.query(query, params);

    // Dacă echipa sau sezonul s-au schimbat, adaugă o nouă intrare în istoricul carierei
    if (changed) {
      await connection.query(
        "INSERT INTO career_history (user_id, team_name, goals, assists, matches_played, cleansheets, season_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          currentTeamName,
          currentGoals,
          currentAssists,
          currentMatchesPlayed,
          currentCleansheets,
          currentSeasonName,
        ]
      );

      // Resetăm statisticile jucătorului
      await connection.query(
        "UPDATE users SET goals = ?, assists = ?, matches_played = ?, cleansheets = ? WHERE id = ?",
        [0, 0, 0, 0, userId] // Resetăm toate statisticile la zero
      );
    }

    res.status(200).send("Statistici, echipă și sezon actualizate cu succes.");
  } catch (err) {
    console.error(
      "Eroare la actualizarea statisticilor, echipei sau sezonului:",
      err
    );
    res
      .status(500)
      .send("Eroare la actualizarea statisticilor, echipei sau sezonului.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru actualizarea statisticilor, echipei și sezonului unui jucător de futsal
app.put("/updateFutsalPlayer/:name", async (req, res) => {
  const playerName = req.params.name;
  const {
    futsal_goals,
    futsal_assists,
    futsal_matches_played,
    futsal_cleansheets,
    futsal_team_name,
    futsal_season_name,
  } = req.body;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține ID-ul și datele curente ale jucătorului de futsal
    const [userRows] = await connection.query(
      "SELECT id, futsal_goals, futsal_assists, futsal_matches_played, futsal_cleansheets, futsal_team_name, futsal_season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentFutsalGoals = userRows[0].futsal_goals;
    const currentFutsalAssists = userRows[0].futsal_assists;
    const currentFutsalMatchesPlayed = userRows[0].futsal_matches_played;
    const currentFutsalCleansheets = userRows[0].futsal_cleansheets;
    const currentFutsalTeamName = userRows[0].futsal_team_name;
    const currentFutsalSeasonName = userRows[0].futsal_season_name;

    // Pregătim interogarea pentru actualizarea jucătorului de futsal
    let query =
      "UPDATE users SET futsal_goals = ?, futsal_assists = ?, futsal_matches_played = ?, futsal_cleansheets = ?";
    const params = [
      currentFutsalGoals + futsal_goals,
      currentFutsalAssists + futsal_assists,
      currentFutsalMatchesPlayed + futsal_matches_played,
      currentFutsalCleansheets + futsal_cleansheets,
    ];

    let changed = false; // Flag pentru a verifica dacă s-a schimbat echipa sau sezonul

    // Verificăm dacă echipa s-a schimbat
    if (
      futsal_team_name !== undefined &&
      futsal_team_name !== currentFutsalTeamName
    ) {
      query += ", futsal_team_name = ?";
      params.push(futsal_team_name);
      changed = true;
    }

    // Verificăm dacă sezonul s-a schimbat
    if (
      futsal_season_name !== undefined &&
      futsal_season_name !== currentFutsalSeasonName
    ) {
      query += ", futsal_season_name = ?";
      params.push(futsal_season_name);
      changed = true;
    }

    query += " WHERE id = ?"; // Filtrăm după ID-ul jucătorului
    params.push(userId); // Adăugăm ID-ul în parametrii interogării

    await connection.query(query, params);

    // Dacă echipa sau sezonul s-au schimbat, adaugă o nouă intrare în istoricul carierei de futsal
    if (changed) {
      await connection.query(
        "INSERT INTO futsal_career_history (user_id, futsal_team_name, futsal_goals, futsal_assists, futsal_matches_played, futsal_cleansheets, futsal_season_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          currentFutsalTeamName,
          currentFutsalGoals,
          currentFutsalAssists,
          currentFutsalMatchesPlayed,
          currentFutsalCleansheets,
          currentFutsalSeasonName,
        ]
      );

      // Resetăm statisticile jucătorului de futsal
      await connection.query(
        "UPDATE users SET futsal_goals = ?, futsal_assists = ?, futsal_matches_played = ?, futsal_cleansheets = ? WHERE id = ?",
        [0, 0, 0, 0, userId] // Resetăm toate statisticile de futsal la zero
      );
    }

    res
      .status(200)
      .send("Statistici, echipă și sezon actualizate cu succes pentru futsal.");
  } catch (err) {
    console.error(
      "Eroare la actualizarea statisticilor, echipei sau sezonului pentru futsal:",
      err
    );
    res
      .status(500)
      .send(
        "Eroare la actualizarea statisticilor, echipei sau sezonului pentru futsal."
      );
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea detaliilor unui jucător
app.get("/playerDetails/:name", async (req, res) => {
  const playerName = req.params.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(
      "SELECT id, name, goals, assists, team_name, profilePic FROM users WHERE name = ?",
      [playerName]
    );

    if (rows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Eroare la obținerea detaliilor jucătorului:", err);
    res.status(500).send("Eroare la obținerea detaliilor jucătorului.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea statisticilor all-time ale jucătorului
app.get("/allTimeStats/:name", async (req, res) => {
  const playerName = req.params.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, goals, assists, matches_played, cleansheets FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals = userRows[0].goals;
    const currentAssists = userRows[0].assists;
    const currentMatchesPlayed = userRows[0].matches_played;
    const currentCleansheets = userRows[0].cleansheets;

    // Obține statisticile din istoricul carierei
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(goals) as totalGoals, SUM(assists) as totalAssists, SUM(matches_played) as totalMatchesPlayed, SUM(cleansheets) as totalCleansheets FROM career_history WHERE user_id = ?",
      [userId]
    );

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyGoals = careerHistoryRows[0].totalGoals
      ? parseInt(careerHistoryRows[0].totalGoals)
      : 0;
    const historyAssists = careerHistoryRows[0].totalAssists
      ? parseInt(careerHistoryRows[0].totalAssists)
      : 0;
    const historyMatchesPlayed = careerHistoryRows[0].totalMatchesPlayed
      ? parseInt(careerHistoryRows[0].totalMatchesPlayed)
      : 0;
    const historyCleansheets = careerHistoryRows[0].totalCleansheets
      ? parseInt(careerHistoryRows[0].totalCleansheets)
      : 0;

    // Calculează totalul statisticilor
    const totalGoals = currentGoals + historyGoals;
    const totalAssists = currentAssists + historyAssists;
    const totalMatchesPlayed = currentMatchesPlayed + historyMatchesPlayed;
    const totalCleansheets = currentCleansheets + historyCleansheets;

    res.json({
      totalGoals,
      totalAssists,
      totalMatchesPlayed,
      totalCleansheets,
    });
  } catch (err) {
    console.error("Eroare la obținerea statisticilor all-time:", err);
    res.status(500).send("Eroare la obținerea statisticilor all-time.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea statisticilor all-time ale jucătorului de futsal
app.get("/futsalAllTimeStats/:name", async (req, res) => {
  const playerName = req.params.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, futsal_goals, futsal_assists, futsal_matches_played, futsal_cleansheets FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentFutsalGoals = userRows[0].futsal_goals;
    const currentFutsalAssists = userRows[0].futsal_assists;
    const currentFutsalMatchesPlayed = userRows[0].futsal_matches_played;
    const currentFutsalCleansheets = userRows[0].futsal_cleansheets;

    // Obține statisticile din istoricul carierei de futsal
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(futsal_goals) as totalFutsalGoals, SUM(futsal_assists) as totalFutsalAssists, SUM(futsal_matches_played) as totalFutsalMatchesPlayed, SUM(futsal_cleansheets) as totalFutsalCleansheets FROM futsal_career_history WHERE user_id = ?",
      [userId]
    );

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyFutsalGoals = careerHistoryRows[0].totalFutsalGoals
      ? parseInt(careerHistoryRows[0].totalFutsalGoals)
      : 0;
    const historyFutsalAssists = careerHistoryRows[0].totalFutsalAssists
      ? parseInt(careerHistoryRows[0].totalFutsalAssists)
      : 0;
    const historyFutsalMatchesPlayed = careerHistoryRows[0]
      .totalFutsalMatchesPlayed
      ? parseInt(careerHistoryRows[0].totalFutsalMatchesPlayed)
      : 0;
    const historyFutsalCleansheets = careerHistoryRows[0].totalFutsalCleansheets
      ? parseInt(careerHistoryRows[0].totalFutsalCleansheets)
      : 0;

    // Calculează totalul statisticilor de futsal
    const totalFutsalGoals = currentFutsalGoals + historyFutsalGoals;
    const totalFutsalAssists = currentFutsalAssists + historyFutsalAssists;
    const totalFutsalMatchesPlayed =
      currentFutsalMatchesPlayed + historyFutsalMatchesPlayed;
    const totalFutsalCleansheets =
      currentFutsalCleansheets + historyFutsalCleansheets;

    res.json({
      totalFutsalGoals,
      totalFutsalAssists,
      totalFutsalMatchesPlayed,
      totalFutsalCleansheets,
    });
  } catch (err) {
    console.error(
      "Eroare la obținerea statisticilor all-time pentru futsal:",
      err
    );
    res
      .status(500)
      .send("Eroare la obținerea statisticilor all-time pentru futsal.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea tuturor echipele
app.get("/teams", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [teams] = await connection.query(
      "SELECT id, team_name, logo, founded_season FROM teams"
    );
    res.json(teams);
  } catch (err) {
    console.error("Eroare la obținerea echipele:", err);
    res.status(500).send("Eroare la obținerea echipele.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea sezoanelor
app.get("/seasons", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query("SELECT season_name FROM seasons");
    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea sezoanelor:", err);
    res.status(500).send("Eroare la obținerea sezoanelor.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea tuturor echipelor de futsal
app.get("/futsalteams", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [teams] = await connection.query(
      "SELECT id, futsal_team_name, futsal_logo, futsal_founded_season FROM futsal_teams"
    );
    res.json(teams);
  } catch (err) {
    console.error("Eroare la obținerea echipelor de futsal:", err);
    res.status(500).send("Eroare la obținerea echipelor de futsal.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea sezoanelor de futsal
app.get("/futsalseasons", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(
      "SELECT futsal_season_name AS season_name FROM futsal_seasons"
    );
    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea sezoanelor de futsal:", err);
    res.status(500).send("Eroare la obținerea sezoanelor de futsal.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/myProfile", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Obține informațiile de bază despre utilizator
    const [userRows] = await connection.query(
      "SELECT id, name, email, goals, assists, matches_played, cleansheets, team_name, profilePic FROM users WHERE id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      await connection.end();
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userProfile = userRows[0];

    // Obține statisticile din istoricul carierei
    const [careerStatsRows] = await connection.query(
      "SELECT SUM(goals) AS totalGoals, SUM(assists) AS totalAssists, SUM(matches_played) AS totalMatchesPlayed, SUM(cleansheets) AS totalCleansheets FROM career_history WHERE user_id = ?",
      [userId]
    );

    // Obține istoricul carierei
    const [careerHistoryRows] = await connection.query(
      "SELECT team_name, goals, assists, matches_played, cleansheets FROM career_history WHERE user_id = ?",
      [userId]
    );

    await connection.end();

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const totalGoals =
      (userProfile.goals || 0) + (careerStatsRows[0].totalGoals || 0);
    const totalAssists =
      (userProfile.assists || 0) + (careerStatsRows[0].totalAssists || 0);
    const totalMatchesPlayed =
      (userProfile.matches_played || 0) +
      (careerStatsRows[0].totalMatchesPlayed || 0);
    const totalCleansheets =
      (userProfile.cleansheets || 0) +
      (careerStatsRows[0].totalCleansheets || 0);

    // Construiește obiectul de răspuns
    const response = {
      ...userProfile,
      totalGoals,
      totalAssists,
      totalMatchesPlayed,
      totalCleansheets,
      careerHistory: careerHistoryRows,
    };

    res.json(response);
  } catch (err) {
    console.error("Eroare la obținerea profilului utilizatorului:", err);
    res.status(500).send("Eroare la obținerea profilului utilizatorului.");
  }
});
// Endpoint pentru obținerea statisticilor din sezonul 1 pentru un jucător
app.get("/season1Stats/:name", async (req, res) => {
  const playerName = req.params.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, goals, season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals =
      userRows[0].season_name === "Season 1" ? userRows[0].goals : 0;

    // Obține statisticile din istoricul carierei pentru sezonul 1
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(goals) AS totalGoals FROM career_history WHERE user_id = ? AND season_name = 'Season 1'",
      [userId]
    );

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyGoals = careerHistoryRows[0].totalGoals
      ? parseInt(careerHistoryRows[0].totalGoals)
      : 0;

    // Calculează totalul statisticilor pentru sezonul 1
    const totalGoals = currentGoals + historyGoals;

    res.json({
      totalGoals,
    });
  } catch (err) {
    console.error("Eroare la obținerea statisticilor din sezonul 1:", err);
    res.status(500).send("Eroare la obținerea statisticilor din sezonul 1.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});
app.get("/season1Statistics", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,  -- Adăugăm ID-ul utilizatorului
             users.name, 
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 1' THEN career_history.goals END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 1' THEN users.goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 1' THEN career_history.assists END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 1' THEN users.assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 1' THEN career_history.cleansheets END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 1' THEN users.cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 1' THEN career_history.matches_played END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 1' THEN users.matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             teams.logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN career_history ON users.id = career_history.user_id
      LEFT JOIN teams ON users.team_name = teams.team_name
      LEFT JOIN country ON users.country_id = country.id
      GROUP BY users.id, users.name, teams.logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea statisticilor pentru sezonul 1:", err);
    res.status(500).send("Eroare la obținerea statisticilor pentru sezonul 1.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea statisticilor din sezonul 1 pentru un jucător de futsal
app.get("/futsalseason1Stats/:name", async (req, res) => {
  const playerName = req.params.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține datele curente ale jucătorului de futsal
    const [userRows] = await connection.query(
      "SELECT id, futsal_goals AS goals, futsal_season_name AS season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals =
      userRows[0].season_name === "Futsal Season 1" ? userRows[0].goals : 0;

    // Obține statisticile din istoricul carierei pentru futsal sezonul 1
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(futsal_goals) AS totalGoals FROM futsal_career_history WHERE user_id = ? AND season_name = 'Futsal Season 1'",
      [userId]
    );

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyGoals = careerHistoryRows[0].totalGoals
      ? parseInt(careerHistoryRows[0].totalGoals)
      : 0;

    // Calculează totalul statisticilor pentru sezonul 1
    const totalGoals = currentGoals + historyGoals;

    res.json({
      totalGoals,
    });
  } catch (err) {
    console.error(
      "Eroare la obținerea statisticilor din sezonul 1 pentru futsal:",
      err
    );
    res
      .status(500)
      .send("Eroare la obținerea statisticilor din sezonul 1 pentru futsal.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});
app.get("/futsalseason1Statistics", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,  -- Adăugăm ID-ul utilizatorului
             users.name, 
             COALESCE(SUM(CASE WHEN futsal_career_history.futsal_season_name = 'Season 1' THEN futsal_career_history.futsal_goals END), 0) +
             COALESCE(CASE WHEN users.futsal_season_name = 'Season 1' THEN users.futsal_goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(CASE WHEN futsal_career_history.futsal_season_name = 'Season 1' THEN futsal_career_history.futsal_assists END), 0) +
             COALESCE(CASE WHEN users.futsal_season_name = 'Season 1' THEN users.futsal_assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(CASE WHEN futsal_career_history.futsal_season_name = 'Season 1' THEN futsal_career_history.futsal_cleansheets END), 0) +
             COALESCE(CASE WHEN users.futsal_season_name = 'Season 1' THEN users.futsal_cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(CASE WHEN futsal_career_history.futsal_season_name = 'Season 1' THEN futsal_career_history.futsal_matches_played END), 0) +
             COALESCE(CASE WHEN users.futsal_season_name = 'Season 1' THEN users.futsal_matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             futsal_teams.futsal_logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN futsal_career_history ON users.id = futsal_career_history.user_id
      LEFT JOIN futsal_teams ON users.futsal_team_name = futsal_teams.futsal_team_name
      LEFT JOIN country ON users.country_id = country.id
      GROUP BY users.id, users.name, futsal_teams.futsal_logo, country.flag_name, country.country_name
      HAVING totalGoals > -1 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error(
      "Eroare la obținerea statisticilor pentru sezonul 1 de futsal:",
      err
    );
    res
      .status(500)
      .send("Eroare la obținerea statisticilor pentru sezonul 1 de futsal.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea statisticilor din sezonul 1 D2 pentru un jucător de futsal
app.get("/futsalseason1D2Stats/:name", async (req, res) => {
  const playerName = req.params.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține datele curente ale jucătorului de futsal
    const [userRows] = await connection.query(
      "SELECT id, futsal_goals AS goals, futsal_season_name AS season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals =
      userRows[0].season_name === "Season 1 D2" ? userRows[0].goals : 0;

    // Obține statisticile din istoricul carierei pentru sezonul 1 D2
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(futsal_goals) AS totalGoals FROM futsal_career_history WHERE user_id = ? AND season_name = 'Season 1 D2'",
      [userId]
    );

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyGoals = careerHistoryRows[0].totalGoals
      ? parseInt(careerHistoryRows[0].totalGoals)
      : 0;

    // Calculează totalul statisticilor pentru sezonul 1 D2
    const totalGoals = currentGoals + historyGoals;

    res.json({
      totalGoals,
    });
  } catch (err) {
    console.error(
      "Eroare la obținerea statisticilor din sezonul 1 D2 pentru futsal:",
      err
    );
    res
      .status(500)
      .send(
        "Eroare la obținerea statisticilor din sezonul 1 D2 pentru futsal."
      );
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Endpoint pentru obținerea statisticilor pentru sezonul 1 D2
app.get("/futsalseason1D2Statistics", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,  -- Adăugăm ID-ul utilizatorului
             users.name, 
             COALESCE(SUM(CASE WHEN futsal_career_history.futsal_season_name = 'Season 1 D2' THEN futsal_career_history.futsal_goals END), 0) +
             COALESCE(CASE WHEN users.futsal_season_name = 'Season 1 D2' THEN users.futsal_goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(CASE WHEN futsal_career_history.futsal_season_name = 'Season 1 D2' THEN futsal_career_history.futsal_assists END), 0) +
             COALESCE(CASE WHEN users.futsal_season_name = 'Season 1 D2' THEN users.futsal_assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(CASE WHEN futsal_career_history.futsal_season_name = 'Season 1 D2' THEN futsal_career_history.futsal_cleansheets END), 0) +
             COALESCE(CASE WHEN users.futsal_season_name = 'Season 1 D2' THEN users.futsal_cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(CASE WHEN futsal_career_history.futsal_season_name = 'Season 1 D2' THEN futsal_career_history.futsal_matches_played END), 0) +
             COALESCE(CASE WHEN users.futsal_season_name = 'Season 1 D2' THEN users.futsal_matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             futsal_teams.futsal_logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN futsal_career_history ON users.id = futsal_career_history.user_id
      LEFT JOIN futsal_teams ON users.futsal_team_name = futsal_teams.futsal_team_name
      LEFT JOIN country ON users.country_id = country.id
      GROUP BY users.id, users.name, futsal_teams.futsal_logo, country.flag_name, country.country_name
      HAVING totalGoals > -1 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error(
      "Eroare la obținerea statisticilor pentru sezonul 1 D2 de futsal:",
      err
    );
    res
      .status(500)
      .send("Eroare la obținerea statisticilor pentru sezonul 1 D2 de futsal.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/season2Stats/:name", async (req, res) => {
  const playerName = req.params.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, goals, season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals =
      userRows[0].season_name === "Season 2" ? userRows[0].goals : 0;

    // Obține statisticile din istoricul carierei pentru sezonul 2
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(goals) AS totalGoals FROM career_history WHERE user_id = ? AND season_name = 'Season 2'",
      [userId]
    );

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyGoals = careerHistoryRows[0].totalGoals
      ? parseInt(careerHistoryRows[0].totalGoals)
      : 0;

    // Calculează totalul statisticilor pentru sezonul 2
    const totalGoals = currentGoals + historyGoals;

    res.json({
      totalGoals,
    });
  } catch (err) {
    console.error("Eroare la obținerea statisticilor din sezonul 2:", err);
    res.status(500).send("Eroare la obținerea statisticilor din sezonul 2.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/season2Statistics", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,  -- Adăugăm ID-ul utilizatorului
             users.name, 
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 2' THEN career_history.goals END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 2' THEN users.goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 2' THEN career_history.assists END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 2' THEN users.assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 2' THEN career_history.cleansheets END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 2' THEN users.cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 2' THEN career_history.matches_played END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 2' THEN users.matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             teams.logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN career_history ON users.id = career_history.user_id
      LEFT JOIN teams ON users.team_name = teams.team_name
      LEFT JOIN country ON users.country_id = country.id
      GROUP BY users.id, users.name, teams.logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea statisticilor pentru sezonul 2:", err);
    res.status(500).send("Eroare la obținerea statisticilor pentru sezonul 2.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/season3Stats/:name", async (req, res) => {
  const playerName = req.params.name;

  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    // Obține datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, goals, season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals =
      userRows[0].season_name === "Season 3" ? userRows[0].goals : 0;

    // Obține statisticile din istoricul carierei pentru sezonul 3
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(goals) AS totalGoals FROM career_history WHERE user_id = ? AND season_name = 'Season 3'",
      [userId]
    );

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyGoals = careerHistoryRows[0].totalGoals
      ? parseInt(careerHistoryRows[0].totalGoals)
      : 0;

    // Calculează totalul statisticilor pentru sezonul 3
    const totalGoals = currentGoals + historyGoals;

    res.json({
      totalGoals,
    });
  } catch (err) {
    console.error("Eroare la obținerea statisticilor din sezonul 3:", err);
    res.status(500).send("Eroare la obținerea statisticilor din sezonul 3.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});
app.get("/season3Statistics", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,  -- Adăugăm ID-ul utilizatorului
             users.name, 
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 3' THEN career_history.goals END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 3' THEN users.goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 3' THEN career_history.assists END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 3' THEN users.assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 3' THEN career_history.cleansheets END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 3' THEN users.cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 3' THEN career_history.matches_played END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 3' THEN users.matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             teams.logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN career_history ON users.id = career_history.user_id
      LEFT JOIN teams ON users.team_name = teams.team_name
      LEFT JOIN country ON users.country_id = country.id
      GROUP BY users.id, users.name, teams.logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea statisticilor pentru sezonul 3:", err);
    res.status(500).send("Eroare la obținerea statisticilor pentru sezonul 3.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/allTimeStatistics", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,
             users.name,
             COALESCE(SUM(career_history.goals), 0) +
             COALESCE(CASE WHEN users.season_name IS NOT NULL THEN users.goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(career_history.assists), 0) +
             COALESCE(CASE WHEN users.season_name IS NOT NULL THEN users.assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(career_history.cleansheets), 0) +
             COALESCE(CASE WHEN users.season_name IS NOT NULL THEN users.cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(career_history.matches_played), 0) +
             COALESCE(CASE WHEN users.season_name IS NOT NULL THEN users.matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             teams.logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN career_history ON users.id = career_history.user_id
      LEFT JOIN teams ON users.team_name = teams.team_name
      LEFT JOIN country ON users.country_id = country.id
      GROUP BY users.id, users.name, teams.logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea statisticilor all-time:", err);
    res.status(500).send("Eroare la obținerea statisticilor all-time.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/allTimeFutsalStatistics", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,
             users.name,
             COALESCE(SUM(futsal_career_history.futsal_goals), 0) +
             COALESCE(CASE WHEN users.futsal_season_name IS NOT NULL THEN users.futsal_goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(futsal_career_history.futsal_assists), 0) +
             COALESCE(CASE WHEN users.futsal_season_name IS NOT NULL THEN users.futsal_assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(futsal_career_history.futsal_cleansheets), 0) +
             COALESCE(CASE WHEN users.futsal_season_name IS NOT NULL THEN users.futsal_cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(futsal_career_history.futsal_matches_played), 0) +
             COALESCE(CASE WHEN users.futsal_season_name IS NOT NULL THEN users.futsal_matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             futsal_teams.futsal_logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN futsal_career_history ON users.id = futsal_career_history.user_id
      LEFT JOIN futsal_teams ON users.futsal_team_name = futsal_teams.futsal_team_name
      LEFT JOIN country ON users.country_id = country.id
      GROUP BY users.id, users.name, futsal_teams.futsal_logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error(
      "Eroare la obținerea statisticilor all-time pentru futsal:",
      err
    );
    res
      .status(500)
      .send("Eroare la obținerea statisticilor all-time pentru futsal.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/allTimeStatisticsD1", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,
             users.name,
             COALESCE(SUM(career_history.goals), 0) +
             COALESCE(CASE WHEN users.season_name LIKE '%D1%' OR users.season_name REGEXP '^Season [0-9]+$' THEN users.goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(career_history.assists), 0) +
             COALESCE(CASE WHEN users.season_name LIKE '%D1%' OR users.season_name REGEXP '^Season [0-9]+$' THEN users.assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(career_history.cleansheets), 0) +
             COALESCE(CASE WHEN users.season_name LIKE '%D1%' OR users.season_name REGEXP '^Season [0-9]+$' THEN users.cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(career_history.matches_played), 0) +
             COALESCE(CASE WHEN users.season_name LIKE '%D1%' OR users.season_name REGEXP '^Season [0-9]+$' THEN users.matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             teams.logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN career_history ON users.id = career_history.user_id
      LEFT JOIN teams ON users.team_name = teams.team_name
      LEFT JOIN country ON users.country_id = country.id
      WHERE career_history.season_name LIKE '%D1%' 
            OR users.season_name LIKE '%D1%' OR users.season_name REGEXP '^Season [0-9]+$'
      GROUP BY users.id, users.name, teams.logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea statisticilor all-time D1:", err);
    res.status(500).send("Eroare la obținerea statisticilor all-time D1.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/allTimeFutsalStatisticsD1", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,
             users.name,
             COALESCE(SUM(futsal_career_history.futsal_goals), 0) +
             COALESCE(CASE WHEN users.futsal_season_name LIKE '%D1%' OR users.futsal_season_name REGEXP '^Season [0-9]+$' THEN users.futsal_goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(futsal_career_history.futsal_assists), 0) +
             COALESCE(CASE WHEN users.futsal_season_name LIKE '%D1%' OR users.futsal_season_name REGEXP '^Season [0-9]+$' THEN users.futsal_assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(futsal_career_history.futsal_cleansheets), 0) +
             COALESCE(CASE WHEN users.futsal_season_name LIKE '%D1%' OR users.futsal_season_name REGEXP '^Season [0-9]+$' THEN users.futsal_cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(futsal_career_history.futsal_matches_played), 0) +
             COALESCE(CASE WHEN users.futsal_season_name LIKE '%D1%' OR users.futsal_season_name REGEXP '^Season [0-9]+$' THEN users.futsal_matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             futsal_teams.futsal_logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN futsal_career_history ON users.id = futsal_career_history.user_id
      LEFT JOIN futsal_teams ON users.futsal_team_name = futsal_teams.futsal_team_name
      LEFT JOIN country ON users.country_id = country.id
      WHERE futsal_career_history.futsal_season_name LIKE '%D1%' 
            OR futsal_career_history.futsal_season_name REGEXP '^Season [0-9]+$'
      GROUP BY users.id, users.name, futsal_teams.futsal_logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error(
      "Eroare la obținerea statisticilor all-time pentru futsal D1:",
      err
    );
    res
      .status(500)
      .send("Eroare la obținerea statisticilor all-time pentru futsal D1.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/allTimeStatisticsD2", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,
             users.name,
             COALESCE(SUM(career_history.goals), 0) +
             COALESCE(CASE WHEN users.season_name LIKE '%D2%' THEN users.goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(career_history.assists), 0) +
             COALESCE(CASE WHEN users.season_name LIKE '%D2%' THEN users.assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(career_history.cleansheets), 0) +
             COALESCE(CASE WHEN users.season_name LIKE '%D2%' THEN users.cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(career_history.matches_played), 0) +
             COALESCE(CASE WHEN users.season_name LIKE '%D2%' THEN users.matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             teams.logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN career_history ON users.id = career_history.user_id
      LEFT JOIN teams ON users.team_name = teams.team_name
      LEFT JOIN country ON users.country_id = country.id
      WHERE career_history.season_name LIKE '%D2%'
      GROUP BY users.id, users.name, teams.logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea statisticilor all-time D2:", err);
    res.status(500).send("Eroare la obținerea statisticilor all-time D2.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/allTimeFutsalStatisticsD2", async (req, res) => {
  const connection = await pool.getConnection(); // Obține o conexiune din pool
  try {
    const [rows] = await connection.query(`
      SELECT users.id,
             users.name,
             COALESCE(SUM(futsal_career_history.futsal_goals), 0) +
             COALESCE(CASE WHEN users.futsal_season_name LIKE '%D2%' THEN users.futsal_goals ELSE 0 END, 0) AS totalGoals,
             COALESCE(SUM(futsal_career_history.futsal_assists), 0) +
             COALESCE(CASE WHEN users.futsal_season_name LIKE '%D2%' THEN users.futsal_assists ELSE 0 END, 0) AS totalAssists,
             COALESCE(SUM(futsal_career_history.futsal_cleansheets), 0) +
             COALESCE(CASE WHEN users.futsal_season_name LIKE '%D2%' THEN users.futsal_cleansheets ELSE 0 END, 0) AS totalCleanSheets,
             COALESCE(SUM(futsal_career_history.futsal_matches_played), 0) +
             COALESCE(CASE WHEN users.futsal_season_name LIKE '%D2%' THEN users.futsal_matches_played ELSE 0 END, 0) AS totalMatchesPlayed,
             futsal_teams.futsal_logo AS teamLogo,
             country.flag_name AS countryFlag,
             country.country_name AS countryName
      FROM users
      LEFT JOIN futsal_career_history ON users.id = futsal_career_history.user_id
      LEFT JOIN futsal_teams ON users.futsal_team_name = futsal_teams.futsal_team_name
      LEFT JOIN country ON users.country_id = country.id
      WHERE futsal_career_history.futsal_season_name LIKE '%D2%'
      GROUP BY users.id, users.name, futsal_teams.futsal_logo, country.flag_name, country.country_name
      HAVING totalGoals > 0 OR totalAssists > 0 OR totalCleanSheets > 0 OR totalMatchesPlayed > 0
    `);

    res.json(rows);
  } catch (err) {
    console.error(
      "Eroare la obținerea statisticilor all-time pentru futsal D2:",
      err
    );
    res
      .status(500)
      .send("Eroare la obținerea statisticilor all-time pentru futsal D2.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Servește fișierul statistics.html
app.get("/statistics.html", (req, res) => {
  res.sendFile(path.join(__dirname, "statistics.html"));
});

// Endpoint pentru obținerea detaliilor echipei
app.get("/team/:teamName", async (req, res) => {
  const teamName = req.params.teamName;
  const connection = await pool.getConnection();

  try {
    // Preluare detalii echipă
    const [teamRows] = await connection.query(
      `SELECT * FROM teams WHERE team_name = ?`,
      [teamName]
    );

    if (teamRows.length === 0) {
      return res.status(404).send("Team not found.");
    }

    const team = teamRows[0];

    // Preluare jucători din echipa respectivă, inclusiv steagul țării
    const [playerRows] = await connection.query(
      `SELECT users.id, users.name, users.profilePic, users.team_name, users.goals, users.assists, users.matches_played, users.cleansheets, country.flag_name, country.country_name
       FROM users
       LEFT JOIN country ON users.country_id = country.id
       WHERE users.team_name = ?`,
      [teamName]
    );

    // Preluare trofee ale echipei
    const [teamTrophies] = await connection.query(
      `SELECT trophy_name, trophy_image 
   FROM trophies 
   WHERE team_id = ?`,
      [team.id] // Schimbă "team.id" dacă ID-ul echipei este stocat sub alt nume
    );

    // Preluare statistici din istoricul carierei pentru jucătorii din echipa respectivă
    const [careerRows] = await connection.query(
      `SELECT user_id, team_name, season_name, matches_played, goals, assists, cleansheets
       FROM career_history
       WHERE team_name = ? AND user_id IN (?)
       ORDER BY user_id`,
      [teamName, playerRows.map((p) => p.id)]
    );

    // Combina datele utilizatorilor cu statistica lor de carieră
    const players = playerRows.map((player) => {
      const careerStats = careerRows.filter(
        (career) => career.user_id === player.id
      );
      return {
        ...player,
        careerStats: careerStats.length > 0 ? careerStats : [], // Include stats only for the current team
      };
    });

    // Include trofeele echipei în răspuns
    res.json({ team, players, trophies: teamTrophies });
  } catch (err) {
    console.error("Error fetching team details:", err);
    res.status(500).send("Error fetching team details.");
  } finally {
    connection.release(); // Release the connection
  }
});

// Endpoint pentru obținerea detaliilor echipei de futsal
app.get("/futsalteam/:teamName", async (req, res) => {
  const teamName = req.params.teamName;
  const connection = await pool.getConnection();

  try {
    // Preluare detalii echipă de futsal
    const [teamRows] = await connection.query(
      `SELECT * FROM futsal_teams WHERE futsal_team_name = ?`,
      [teamName]
    );

    if (teamRows.length === 0) {
      return res.status(404).send("Futsal team not found.");
    }

    const team = teamRows[0];

    // Preluare jucători din echipa respectivă de futsal, inclusiv steagul țării
    const [playerRows] = await connection.query(
      `SELECT users.id, users.name, users.profilePic, users.futsal_team_name, 
              users.futsal_goals, users.futsal_assists, 
              users.futsal_matches_played, users.futsal_cleansheets, 
              country.flag_name, country.country_name
       FROM users
       LEFT JOIN country ON users.country_id = country.id
       WHERE users.futsal_team_name = ?`,
      [teamName]
    );

    // Preluare trofee ale echipei de futsal
    const [teamTrophies] = await connection.query(
      `SELECT trophy_name, trophy_image 
       FROM trophies 
       WHERE futsal_team_id = ?`, // Asigură-te că ID-ul echipei de futsal este corect
      [team.id] // Schimbă "team.id" dacă ID-ul echipei este stocat sub alt nume
    );

    // Verifică dacă există jucători
    if (playerRows.length > 0) {
      // Preluare statistici din istoricul carierei pentru jucătorii din echipa respectivă
      const [careerRows] = await connection.query(
        `SELECT user_id, futsal_team_name, futsal_season_name, futsal_matches_played, 
                futsal_goals, futsal_assists, futsal_cleansheets
         FROM futsal_career_history
         WHERE futsal_team_name = ? AND user_id IN (?)`,
        [teamName, playerRows.map((p) => p.id)] // Asigură-te că ID-urile sunt valide
      );

      // Combina datele utilizatorilor cu statistica lor de carieră
      const players = playerRows.map((player) => {
        const careerStats = careerRows.filter(
          (career) => career.user_id === player.id
        );
        return {
          ...player,
          careerStats: careerStats.length > 0 ? careerStats : [], // Include stats only for the current team
        };
      });

      // Include trofeele echipei în răspuns
      res.json({ team, players, trophies: teamTrophies });
    } else {
      // Dacă nu există jucători, răspunde fără statistici de carieră
      res.json({ team, players: [], trophies: teamTrophies });
    }
  } catch (err) {
    console.error("Error fetching futsal team details:", err);
    res.status(500).send("Error fetching futsal team details.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/team/:teamName/players", async (req, res) => {
  const teamName = req.params.teamName;
  const connection = await pool.getConnection();

  try {
    // Obține detalii echipă
    const [teamRows] = await connection.query(
      `SELECT id, team_name, logo, founded_season
       FROM teams
       WHERE team_name = ?`,
      [teamName]
    );

    if (teamRows.length === 0) {
      return res.status(404).send("Team not found.");
    }

    const team = teamRows[0];

    // Obține trofeele echipei
    const [teamTrophies] = await connection.query(
      `SELECT trophy_name, trophy_image 
       FROM trophies 
       WHERE team_id = ?`,
      [team.id] // Folosește ID-ul echipei pentru a găsi trofeele
    );

    // Obține statisticile curente pentru jucătorii care evoluează acum pentru echipa respectivă
    const [currentPlayers] = await connection.query(
      `SELECT 
        users.id, 
        users.name, 
        country.flag_name,  -- URL-ul steagului
        users.country_id,
        users.matches_played as currentMatches,
        users.goals as currentGoals,
        users.assists as currentAssists,
        users.cleansheets as currentCleanSheets
       FROM users
       LEFT JOIN country ON users.country_id = country.id
       WHERE users.team_name = ?`,
      [teamName]
    );

    // Obține statisticile istorice pentru jucătorii care au evoluat pentru echipa respectivă
    const [careerHistory] = await connection.query(
      `SELECT 
        career_history.user_id,
        users.name,
        country.flag_name,  -- URL-ul steagului
        users.country_id,
        SUM(career_history.goals) as careerGoals,
        SUM(career_history.assists) as careerAssists,
        SUM(career_history.matches_played) as careerMatches,
        SUM(career_history.cleansheets) as careerCleanSheets
       FROM career_history
       LEFT JOIN users ON career_history.user_id = users.id
       LEFT JOIN country ON users.country_id = country.id
       WHERE career_history.team_name = ?
       GROUP BY career_history.user_id, users.name, country.flag_name, users.country_id`,
      [teamName]
    );

    // Crează un obiect pentru a aduna statisticile
    const playerStatsMap = {};

    // Adaugă statisticile curente în obiect
    currentPlayers.forEach((player) => {
      playerStatsMap[player.id] = {
        ...player,
        careerGoals: 0,
        careerAssists: 0,
        careerMatches: 0,
        careerCleanSheets: 0,
      };
    });

    // Adaugă statisticile istorice la obiectul corespunzător
    careerHistory.forEach((stats) => {
      if (playerStatsMap[stats.user_id]) {
        playerStatsMap[stats.user_id] = {
          ...playerStatsMap[stats.user_id],
          careerGoals: stats.careerGoals,
          careerAssists: stats.careerAssists,
          careerMatches: stats.careerMatches,
          careerCleanSheets: stats.careerCleanSheets,
        };
      } else {
        playerStatsMap[stats.user_id] = {
          id: stats.user_id,
          name: stats.name,
          flag_name: stats.flag_name,
          country_id: stats.country_id,
          currentMatches: 0,
          currentGoals: 0,
          currentAssists: 0,
          currentCleanSheets: 0,
          careerGoals: stats.careerGoals,
          careerAssists: stats.careerAssists,
          careerMatches: stats.careerMatches,
          careerCleanSheets: stats.careerCleanSheets,
        };
      }
    });

    // Crează lista finală cu statisticile combinate
    const playersWithTotals = Object.values(playerStatsMap).map((player) => ({
      ...player,
      totalMatches:
        Number(player.currentMatches || 0) + Number(player.careerMatches || 0),
      totalGoals:
        Number(player.currentGoals || 0) + Number(player.careerGoals || 0),
      totalAssists:
        Number(player.currentAssists || 0) + Number(player.careerAssists || 0),
      totalCleanSheets:
        Number(player.currentCleanSheets || 0) +
        Number(player.careerCleanSheets || 0),
    }));

    // Include și trofeele echipei în răspunsul JSON
    res.json({ team, players: playersWithTotals, trophies: teamTrophies });
  } catch (err) {
    console.error("Error fetching team details and players:", err);
    res.status(500).send("Error fetching team details and players.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

app.get("/futsalteam/:teamName/players", async (req, res) => {
  const teamName = req.params.teamName;
  const connection = await pool.getConnection();

  try {
    // Obține detalii echipă de futsal
    const [teamRows] = await connection.query(
      `SELECT id, futsal_team_name, futsal_logo, futsal_founded_season
       FROM futsal_teams
       WHERE futsal_team_name = ?`,
      [teamName]
    );

    if (teamRows.length === 0) {
      return res.status(404).send("Futsal team not found.");
    }

    const team = teamRows[0];

    // Obține trofeele echipei de futsal (folosind futsal_team_id)
    const [teamTrophies] = await connection.query(
      `SELECT trophy_name, trophy_image 
       FROM trophies 
       WHERE futsal_team_id = ?`, // Modificat aici
      [team.id] // Folosește ID-ul echipei pentru a găsi trofeele
    );

    // Obține statisticile curente pentru jucătorii care evoluează acum pentru echipa de futsal
    const [currentPlayers] = await connection.query(
      `SELECT 
        users.id, 
        users.name, 
        country.flag_name,  -- URL-ul steagului
        users.country_id,
        users.futsal_matches_played as currentMatches,
        users.futsal_goals as currentGoals,
        users.futsal_assists as currentAssists,
        users.futsal_cleansheets as currentCleanSheets
       FROM users
       LEFT JOIN country ON users.country_id = country.id
       WHERE users.futsal_team_name = ?`,
      [teamName]
    );

    // Obține statisticile istorice pentru jucătorii care au evoluat pentru echipa respectivă de futsal
    const [careerHistory] = await connection.query(
      `SELECT 
        futsal_career_history.user_id,
        users.name,
        country.flag_name,  -- URL-ul steagului
        users.country_id,
        SUM(futsal_career_history.futsal_goals) as careerGoals,
        SUM(futsal_career_history.futsal_assists) as careerAssists,
        SUM(futsal_career_history.futsal_matches_played) as careerMatches,
        SUM(futsal_career_history.futsal_cleansheets) as careerCleanSheets
       FROM futsal_career_history
       LEFT JOIN users ON futsal_career_history.user_id = users.id
       LEFT JOIN country ON users.country_id = country.id
       WHERE futsal_career_history.futsal_team_name = ?
       GROUP BY futsal_career_history.user_id, users.name, country.flag_name, users.country_id`,
      [teamName]
    );

    // Crează un obiect pentru a aduna statisticile
    const playerStatsMap = {};

    // Adaugă statisticile curente în obiect
    currentPlayers.forEach((player) => {
      playerStatsMap[player.id] = {
        ...player,
        careerGoals: 0,
        careerAssists: 0,
        careerMatches: 0,
        careerCleanSheets: 0,
      };
    });

    // Adaugă statisticile istorice la obiectul corespunzător
    careerHistory.forEach((stats) => {
      if (playerStatsMap[stats.user_id]) {
        playerStatsMap[stats.user_id] = {
          ...playerStatsMap[stats.user_id],
          careerGoals: stats.careerGoals,
          careerAssists: stats.careerAssists,
          careerMatches: stats.careerMatches,
          careerCleanSheets: stats.careerCleanSheets,
        };
      } else {
        playerStatsMap[stats.user_id] = {
          id: stats.user_id,
          name: stats.name,
          flag_name: stats.flag_name,
          country_id: stats.country_id,
          currentMatches: 0,
          currentGoals: 0,
          currentAssists: 0,
          currentCleanSheets: 0,
          careerGoals: stats.careerGoals,
          careerAssists: stats.careerAssists,
          careerMatches: stats.careerMatches,
          careerCleanSheets: stats.careerCleanSheets,
        };
      }
    });

    // Crează lista finală cu statisticile combinate
    const playersWithTotals = Object.values(playerStatsMap).map((player) => ({
      ...player,
      totalMatches:
        Number(player.currentMatches || 0) + Number(player.careerMatches || 0),
      totalGoals:
        Number(player.currentGoals || 0) + Number(player.careerGoals || 0),
      totalAssists:
        Number(player.currentAssists || 0) + Number(player.careerAssists || 0),
      totalCleanSheets:
        Number(player.currentCleanSheets || 0) +
        Number(player.careerCleanSheets || 0),
    }));

    // Include și trofeele echipei în răspunsul JSON
    res.json({ team, players: playersWithTotals, trophies: teamTrophies });
  } catch (err) {
    console.error("Error fetching futsal team details and players:", err);
    res.status(500).send("Error fetching futsal team details and players.");
  } finally {
    connection.release(); // Eliberează conexiunea
  }
});

// Servește fișierul teams.html
app.get("/teams.html", (req, res) => {
  res.sendFile(path.join(__dirname, "teams.html"));
});

// Servește fișierul team.html
app.get("/team.html", (req, res) => {
  res.sendFile(path.join(__dirname, "team.html"));
});

// Servește fișierul team.html
app.get("/futsalteam.html", (req, res) => {
  res.sendFile(path.join(__dirname, "futsalteam.html"));
});

// Pornire server
app.listen(port, "0.0.0.0", () => {
  console.log(`Serverul rulează pe http://localhost:${port}`);
});
