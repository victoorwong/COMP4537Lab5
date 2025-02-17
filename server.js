const http = require("http");
const mysql = require("mysql2");
const url = require("url");
const { dbConfig } = require("./config/config");

class DatabaseManager {
  constructor(config) {
    this.connection = mysql.createConnection(config);
    this.connection.connect((err) => {
      if (err) throw err;
      console.log("Connected to MySQL");
      this.createPatientTable();
    });
  }

  createPatientTable() {
    const createTableQuery = `CREATE TABLE IF NOT EXISTS patient (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      birth_date DATE NOT NULL
    ) ENGINE=InnoDB;`;

    this.connection.query(createTableQuery, (err) => {
      if (err) throw err;
      console.log("Patient table is ready");
    });
  }

  insertData(data, callback) {
    const sql = "INSERT INTO patient (name, birth_date) VALUES ?";
    this.connection.query(sql, [data], (err, result) => {
      callback(err, result);
    });
  }

  executeQuery(query, callback) {
    this.connection.query(query, (err, result) => {
      callback(err, result);
    });
  }
}

class RequestHandler {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  handleRequest(req, res) {
    // Enable CORS for all incoming requests
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow requests from all origins
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS"); // Allow these methods
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    ); // Allow these headers

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      return res.end();
    }

    if (req.method === "POST" && req.url === "/insert") {
      this.handleInsert(req, res);
    } else if (req.method === "GET" && req.url.startsWith("/query")) {
      this.handleQuery(req, res);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Invalid request" }));
    }
  }

  handleInsert(req, res) {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(body);

        if (parsedBody.query) {
          // ✅ Case 1: Direct SQL Query
          if (!parsedBody.query.toUpperCase().startsWith("INSERT")) {
            res.writeHead(400);
            return res.end(
              JSON.stringify({ error: "Only INSERT queries allowed" })
            );
          }

          this.databaseManager.executeQuery(parsedBody.query, (err, result) => {
            if (err) {
              res.writeHead(500);
              return res.end(JSON.stringify({ error: err.message }));
            }
            res.end(
              JSON.stringify({ success: true, inserted: result.affectedRows })
            );
          });
        } else if (Array.isArray(parsedBody.data)) {
          // ✅ Case 2: JSON Data Array
          this.databaseManager.insertData(parsedBody.data, (err, result) => {
            if (err) {
              res.writeHead(500);
              return res.end(JSON.stringify({ error: err.message }));
            }
            res.end(
              JSON.stringify({ success: true, inserted: result.affectedRows })
            );
          });
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Invalid request format" }));
        }
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }

  handleQuery(req, res) {
    const queryObject = url.parse(req.url, true).query;
    const sql = queryObject.sql;

    if (!sql || !sql.toUpperCase().startsWith("SELECT")) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Only SELECT queries allowed" }));
    }

    this.databaseManager.executeQuery(sql, (err, result) => {
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.end(JSON.stringify(result));
      }
    });
  }
}

class Server {
  constructor(port, requestHandler) {
    this.port = port;
    this.requestHandler = requestHandler;
  }

  start() {
    const server = http.createServer((req, res) => {
      this.requestHandler.handleRequest(req, res);
    });

    server.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

// Instantiate classes
const databaseManager = new DatabaseManager(dbConfig); // Use the config from the config file
const requestHandler = new RequestHandler(databaseManager);
const server = new Server(3000, requestHandler);

// Start the server
server.start();
